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
 */
import { readFileSync } from 'node:fs'
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

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY')
  process.exit(1)
}

const source = process.env.KEEPALIVE_SOURCE ?? 'manual'
const supabase = createClient(url, key, { auth: { persistSession: false } })

const { data, error } = await supabase
  .from('keepalive')
  .upsert({ id: 1, pinged_at: new Date().toISOString(), source })
  .select()
  .single()

if (error) {
  console.error(`keep-alive failed: ${error.message}`)
  process.exitCode = 1
} else {
  console.log(`keep-alive ok — pinged_at=${data.pinged_at} source=${data.source}`)
}
