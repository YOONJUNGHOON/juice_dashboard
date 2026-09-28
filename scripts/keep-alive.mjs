/**
 * Supabase keep-alive.
 *
 * Free-tier projects are paused after 1 week with no activity, so this
 * writes a heartbeat row and reads it back. Run it on a schedule
 * (GitHub Actions, or Windows Task Scheduler via scripts/keep-alive.bat).
 *
 *   node scripts/keep-alive.mjs
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY. When they are not
 * already in the environment, .env.local is read as a fallback.
 *
 * On failure the goal is a log that names *which layer* broke, because the
 * fixes are unrelated:
 *
 *   - transport (DNS / TCP / TLS / timeout) — no HTTP response at all. This
 *     is what surfaces as `TypeError: fetch failed`. Usually transient on
 *     GitHub-hosted runners, so it is retried.
 *   - api (HTTP response received, PostgREST rejected it) — auth, grants,
 *     Data API exposure, RLS. Retrying cannot help, so we stop and print the
 *     PostgREST code.
 *
 * Note: postgrest-js only retries GET/HEAD/OPTIONS, so the upsert (POST)
 * below gets no retry from the library — the loop here is what provides it.
 *
 * Tunable via env: KEEPALIVE_MAX_ATTEMPTS, KEEPALIVE_TIMEOUT_MS.
 */
import { readFileSync } from 'node:fs'
import { lookup } from 'node:dns/promises'
import { createClient } from '@supabase/supabase-js'

function loadEnvLocal() {
  try {
    const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    for (const line of raw.split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
      if (!match) continue
      const key = match[1]
      const value = match[2].replace(/^['"]|['"]$/g, '')
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // No .env.local (e.g. running in CI) — env vars must come from the runner.
  }
}

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY

const missing = []
if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL')
if (!key) missing.push('SUPABASE_SECRET_KEY')

if (missing.length > 0) {
  // Names only — never log the values.
  console.error(`Missing env var(s): ${missing.join(', ')}`)
  console.error('In GitHub Actions these come from repository secrets')
  console.error('(Settings > Secrets and variables > Actions > Repository secrets).')
  console.error('Environment secrets and Dependabot secrets are NOT visible here.')
  process.exit(1)
}

const source = process.env.KEEPALIVE_SOURCE ?? 'manual'
const MAX_ATTEMPTS = Math.max(1, Number(process.env.KEEPALIVE_MAX_ATTEMPTS ?? 3) || 3)
const TIMEOUT_MS = Math.max(1000, Number(process.env.KEEPALIVE_TIMEOUT_MS ?? 15000) || 15000)
const IN_ACTIONS = process.env.GITHUB_ACTIONS === 'true'

// ------------------------------------------------------------------
// Secret hygiene. Every line printed below goes through redact(), so the
// key cannot reach the log even if it turns up inside a dependency's
// error message or stack trace.
// ------------------------------------------------------------------
const literalSecrets = [key].filter((s) => typeof s === 'string' && s.length >= 8)

function redact(value) {
  let text = typeof value === 'string' ? value : String(value ?? '')
  for (const secret of literalSecrets) text = text.split(secret).join('<redacted>')
  text = text.replace(/\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+/g, '<redacted>')
  text = text.replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, '<redacted-jwt>')
  return text
}

const log = (line = '') => console.log(redact(line))
const logErr = (line = '') => console.error(redact(line))

// The host is safe to print (it comes from a NEXT_PUBLIC_ var) and we need
// it to tell a name-resolution failure apart from a connection failure.
let host = ''
try {
  host = new URL(url).host
} catch {
  logErr(`NEXT_PUBLIC_SUPABASE_URL is not a valid URL (received ${url.length} chars)`)
  process.exit(1)
}

// ------------------------------------------------------------------
// Error inspection: the whole cause chain, flattened.
// `fetch failed` is only ever a wrapper — the real reason (ENOTFOUND,
// ECONNRESET, UND_ERR_CONNECT_TIMEOUT, ...) sits in error.cause.
// ------------------------------------------------------------------
const CAUSE_FIELDS = ['code', 'errno', 'syscall', 'hostname', 'address', 'port', 'reason']

function describeError(err, indent = '    ', withStack = true) {
  const lines = []
  lines.push(`${indent}error                 = ${err?.name ?? 'Error'}: ${err?.message ?? String(err)}`)
  if (err?.code) lines.push(`${indent}error.code            = ${err.code}`)

  let cause = err?.cause
  let depth = 1
  while (cause && depth <= 4) {
    const label = depth === 1 ? 'error.cause' : `error.cause${'.cause'.repeat(depth - 1)}`
    lines.push(`${indent}${label} = ${cause?.name ?? 'Error'}: ${cause?.message ?? String(cause)}`)
    for (const field of CAUSE_FIELDS) {
      if (cause?.[field] !== undefined) lines.push(`${indent}${label}.${field} = ${cause[field]}`)
    }
    cause = cause?.cause
    depth++
  }

  if (withStack && err?.stack) {
    lines.push(`${indent}error.stack:`)
    for (const stackLine of String(err.stack).split('\n')) lines.push(`${indent}  ${stackLine.trim()}`)
  }
  return lines.map((line) => redact(line)).join('\n')
}

function collectCodes(err) {
  const codes = []
  let node = err
  let depth = 0
  while (node && depth <= 5) {
    if (node.code) codes.push(String(node.code))
    if (node.name) codes.push(String(node.name))
    node = node.cause
    depth++
  }
  return codes
}

// Transient at the transport layer: worth another attempt.
const RETRYABLE_TRANSPORT = new Set([
  'EAI_AGAIN',
  'ENOTFOUND',
  'ECONNRESET',
  'ECONNREFUSED',
  'ECONNABORTED',
  'ETIMEDOUT',
  'EPIPE',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_SOCKET',
  'ERR_SOCKET_CONNECTION_TIMEOUT',
  'TimeoutError',
])

// Broken trust chain or a bad clock: deterministic, so retrying wastes time.
const FATAL_TRANSPORT = /^(CERT_|UNABLE_TO_|SELF_SIGNED|DEPTH_ZERO|ERR_TLS|EPROTO|ERR_SSL)/

// ------------------------------------------------------------------
// Instrumented fetch. Two jobs:
//   1. enforce a per-request timeout, so a hung socket cannot stall the run
//   2. keep hold of the *real* Error object — postgrest-js flattens it into
//      a string ("TypeError: fetch failed") before the caller sees it
// Only method + origin + pathname are logged: no query string and no
// headers, so the apikey/Authorization headers cannot leak.
// ------------------------------------------------------------------
let lastTransportError = null
let lastResponseInfo = null

async function instrumentedFetch(input, init = {}) {
  const raw = typeof input === 'string' ? input : (input?.url ?? String(input))
  let label = `${init.method ?? 'GET'} <unparsable url>`
  try {
    const target = new URL(raw)
    label = `${init.method ?? 'GET'} ${target.origin}${target.pathname}`
  } catch {
    // keep the fallback label
  }

  const controller = new AbortController()
  const timer = setTimeout(() => {
    controller.abort(
      Object.assign(new Error(`request exceeded KEEPALIVE_TIMEOUT_MS (${TIMEOUT_MS}ms)`), {
        name: 'TimeoutError',
        code: 'TimeoutError',
      }),
    )
  }, TIMEOUT_MS)

  // postgrest-js passes its own signal; honour both when the runtime can.
  let signal = controller.signal
  if (init.signal && typeof AbortSignal.any === 'function') {
    signal = AbortSignal.any([init.signal, controller.signal])
  }

  const startedAt = Date.now()
  try {
    const response = await fetch(input, { ...init, signal })
    const elapsed = Date.now() - startedAt
    lastTransportError = null
    lastResponseInfo = {
      status: response.status,
      statusText: response.statusText,
      elapsed,
      // Supabase echoes this back; it is the handle their support asks for.
      requestId: response.headers.get('sb-request-id') ?? response.headers.get('x-request-id') ?? null,
    }
    log(`  -> ${label} responded HTTP ${response.status} ${response.statusText} in ${elapsed}ms`)
    return response
  } catch (err) {
    lastTransportError = err
    lastResponseInfo = null
    logErr(`  -> ${label} produced NO HTTP response after ${Date.now() - startedAt}ms`)
    logErr(describeError(err))
    throw err
  } finally {
    clearTimeout(timer)
  }
}

// ------------------------------------------------------------------
// DNS probe. Run before the first request and again after any transport
// failure: if the lookup succeeds but the request does not, the problem is
// TCP/TLS rather than name resolution.
// ------------------------------------------------------------------
async function probeDns(prefix = '') {
  const startedAt = Date.now()
  try {
    const records = await lookup(host, { all: true })
    log(`${prefix}dns ${host} -> ${records.map((r) => r.address).join(', ')} (${Date.now() - startedAt}ms)`)
    return true
  } catch (err) {
    logErr(`${prefix}dns ${host} FAILED after ${Date.now() - startedAt}ms`)
    // The code and hostname are the signal here; the dns stack is noise.
    logErr(describeError(err, '    ', false))
    return false
  }
}

// ------------------------------------------------------------------
// Classify a failed attempt: transport layer vs API layer.
// ------------------------------------------------------------------
function classify(pgError, status) {
  // No HTTP response ever arrived, so the failure is below the app layer.
  if (lastTransportError || status === 0) {
    const codes = collectCodes(lastTransportError)
    const code = codes.find((c) => c !== 'Error' && c !== 'TypeError') ?? 'unknown'
    if (codes.some((c) => FATAL_TRANSPORT.test(c))) {
      return { layer: 'transport/tls', code, retryable: false }
    }
    if (codes.some((c) => RETRYABLE_TRANSPORT.has(c))) {
      const dns = codes.includes('EAI_AGAIN') || codes.includes('ENOTFOUND')
      return { layer: dns ? 'transport/dns' : 'transport/network', code, retryable: true }
    }
    // `fetch failed` with no recognised cause: still below HTTP, still transient.
    return { layer: 'transport/unknown', code, retryable: true }
  }

  // An HTTP response came back, so DNS/TCP/TLS are all fine by definition.
  if (status === 401 || status === 403 || pgError?.code === '42501') {
    return { layer: 'api/auth-or-grants', code: pgError?.code ?? String(status), retryable: false }
  }
  if (pgError?.code === 'PGRST205' || pgError?.code === 'PGRST106' || status === 404) {
    return { layer: 'api/data-api-exposure', code: pgError?.code ?? String(status), retryable: false }
  }
  if (status === 429 || status >= 500) {
    return { layer: 'api/server', code: pgError?.code ?? String(status), retryable: true }
  }
  return { layer: 'api/request', code: pgError?.code ?? String(status), retryable: false }
}

const DIAGNOSIS = {
  'transport/dns': 'The runner could not resolve the Supabase host. Transient runner DNS is the usual cause.',
  'transport/network': 'TCP/TLS connect failed or timed out. Check the Supabase status page if it persists.',
  'transport/unknown': '`fetch failed` with no OS-level cause attached. Treated as transient.',
  'transport/tls': 'TLS verification failed. Not transient — check the certificate and the system clock.',
  'api/auth-or-grants':
    'The request reached PostgREST and was rejected: SUPABASE_SECRET_KEY is wrong or rotated, or the role lacks grants on public.keepalive.',
  'api/data-api-exposure':
    'PostgREST cannot see public.keepalive. Re-apply supabase/schema.sql, GRANT on the table, then reload the schema cache.',
  'api/server': 'Supabase returned 429/5xx. Transient.',
  'api/request': 'PostgREST rejected the request itself. See the code and details above.',
}

const supabase = createClient(url, key, {
  auth: { persistSession: false },
  global: { fetch: instrumentedFetch },
})

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Node's fetch pools sockets and holds them open for seconds after the last
// request, which would keep this process alive past its last log line.
// Closing the dispatcher is best effort: if the internal symbol ever moves,
// Node still exits by itself once the socket idles out.
async function closeHttpPool() {
  try {
    const dispatcher = globalThis[Symbol.for('undici.globalDispatcher.1')]
    if (dispatcher && typeof dispatcher.close === 'function') await dispatcher.close()
  } catch {
    // ignore — nothing here should change the exit code
  }
}

// Exponential backoff with jitter, so the attempts do not all land in the
// same bad second: attempt 1 waits ~2s, attempt 2 waits ~4s.
function backoffMs(attempt) {
  return 2000 * 2 ** (attempt - 1) + Math.floor(Math.random() * 500)
}

log(`keep-alive starting — target=${host} table=public.keepalive source=${source}`)
log(`  attempts=${MAX_ATTEMPTS} timeout=${TIMEOUT_MS}ms`)
await probeDns('  ')

let lastSummary = null
let succeeded = false

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  log(`attempt ${attempt}/${MAX_ATTEMPTS}: upsert public.keepalive id=1`)

  lastTransportError = null
  lastResponseInfo = null

  const pingedAt = new Date().toISOString()
  const { data, error, status, statusText } = await supabase
    .from('keepalive')
    .upsert({ id: 1, pinged_at: pingedAt, source })
    .select()
    .single()

  if (!error) {
    // Proof the API really answered: an HTTP 2xx, plus a row echoing back
    // the timestamp this run just sent. Compare instants, not strings —
    // Postgres returns "+00:00" where we sent "Z".
    const echoed =
      Boolean(data?.pinged_at) && new Date(data.pinged_at).getTime() === new Date(pingedAt).getTime()
    log('')
    log('keep-alive ok — Supabase responded successfully')
    log(`  http       = ${lastResponseInfo?.status ?? status} ${lastResponseInfo?.statusText ?? statusText}`)
    log(`  latency    = ${lastResponseInfo?.elapsed ?? '?'}ms`)
    if (lastResponseInfo?.requestId) log(`  request-id = ${lastResponseInfo.requestId}`)
    log(`  row        = id=${data.id} pinged_at=${data.pinged_at} source=${data.source}`)
    log(`  write-echo = ${echoed ? 'confirmed (row matches the timestamp we sent)' : 'MISMATCH — this run did not update the row'}`)
    log(`  attempts   = ${attempt}/${MAX_ATTEMPTS}`)
    if (!echoed) {
      logErr('keep-alive: the row came back without our timestamp — treating this as a failure.')
      process.exitCode = 1
    }
    succeeded = true
    break
  }

  const verdict = classify(error, status)
  lastSummary = { attempt, verdict, error, status, statusText }

  logErr(
    `attempt ${attempt}/${MAX_ATTEMPTS} FAILED — layer=${verdict.layer} code=${verdict.code} retryable=${verdict.retryable}`,
  )
  logErr(`    http              = ${status} ${statusText || '(no response)'}`)
  logErr(`    postgrest.message = ${error.message}`)
  if (error.code) logErr(`    postgrest.code    = ${error.code}`)
  if (error.hint) logErr(`    postgrest.hint    = ${error.hint}`)
  // postgrest.details is a stringified subset of the cause chain the fetch
  // wrapper already printed — only worth printing when we have no raw error.
  if (error.details && !lastTransportError) {
    logErr('    postgrest.details:')
    for (const line of String(error.details).split('\n')) logErr(`      ${line}`)
  }
  logErr(`    diagnosis         = ${DIAGNOSIS[verdict.layer]}`)

  if (verdict.layer.startsWith('transport')) {
    // Re-probe so the log shows whether name resolution itself is broken.
    await probeDns('    recheck ')
  }

  if (!verdict.retryable) {
    logErr('    not retryable — stopping here instead of burning the remaining attempts.')
    break
  }
  if (attempt === MAX_ATTEMPTS) break

  const delay = backoffMs(attempt)
  logErr(`    retrying in ${delay}ms`)
  await sleep(delay)
}

// Never swallow the failure: the run has to go red, or the pause risk is invisible.
if (!succeeded) {
  const summary =
    `keep-alive failed after ${lastSummary?.attempt ?? 0} attempt(s) — ` +
    `layer=${lastSummary?.verdict.layer} code=${lastSummary?.verdict.code}: ${lastSummary?.error?.message}`
  logErr('')
  logErr(summary)
  if (IN_ACTIONS) console.error(`::error title=Supabase keep-alive failed::${redact(summary)}`)
  process.exitCode = 1
}

// Set exitCode rather than calling process.exit(): a hard exit while undici
// still holds a keep-alive socket aborts the process on Windows with a libuv
// assertion (and a bogus exit code). Closing the pool lets Node exit on its
// own, promptly and with the code we set.
await closeHttpPool()
