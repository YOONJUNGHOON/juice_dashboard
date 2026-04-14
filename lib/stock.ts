// ── Pure calculation helpers ──────────────────────────────────────────────────

/**
 * Calculate return percentage.
 * @throws if purchasePrice is zero or negative
 */
export function calculateReturnPct(purchasePrice: number, currentPrice: number): number {
  if (purchasePrice <= 0) throw new Error('Purchase price must be a positive number')
  return ((currentPrice - purchasePrice) / purchasePrice) * 100
}

/**
 * Format a return percentage for display, e.g. "+12.34%" or "-5.67%"
 */
export function formatReturnPct(pct: number, decimals = 2): string {
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(decimals)}%`
}

/** True if ticker is a 6-digit Korean stock code (e.g. 005930) */
export function isKoreanTicker(ticker: string): boolean {
  return /^\d{6}$/.test(ticker)
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

// ── Naver Finance price fetcher (Korean stocks) ───────────────────────────────
// Uses the Naver mobile JSON API instead of HTML scraping — more stable and
// doesn't depend on the page structure of finance.naver.com.

export async function fetchNaverPrice(ticker: string): Promise<number | null> {
  try {
    const url = `https://m.stock.naver.com/api/stock/${encodeURIComponent(ticker)}/basic`
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Referer: 'https://m.stock.naver.com/',
        Accept: 'application/json',
      },
      cache: 'no-store',
    })

    if (!res.ok) return null

    const json = await res.json()
    // closePrice is the last/current price, returned as a comma-formatted string
    const raw: string = json?.closePrice ?? ''
    const price = parseFloat(raw.replace(/,/g, ''))
    return isNaN(price) ? null : price
  } catch {
    return null
  }
}

// ── Yahoo Finance price fetcher (overseas stocks) ─────────────────────────────
// Yahoo Finance's v8 chart API requires a crumb + session cookie when called
// from certain network environments. We try unauthenticated first, then fall
// back to a cookie+crumb flow.

// Module-level crumb cache (1 hour TTL — crumbs are valid for hours)
let _yahooCrumb: { crumb: string; cookie: string; ts: number } | null = null

async function getYahooCrumb(): Promise<{ crumb: string; cookie: string } | null> {
  if (_yahooCrumb && Date.now() - _yahooCrumb.ts < 3_600_000) return _yahooCrumb

  try {
    // Step 1: hit finance.yahoo.com to obtain a session cookie
    const cookieRes = await fetch('https://finance.yahoo.com/', {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      redirect: 'follow',
      cache: 'no-store',
    })
    const rawCookie = cookieRes.headers.get('set-cookie') ?? ''

    // Step 2: exchange the cookie for a crumb
    const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: {
        'User-Agent': UA,
        Cookie: rawCookie,
        Accept: 'text/plain',
      },
      cache: 'no-store',
    })
    if (!crumbRes.ok) return null
    const crumb = await crumbRes.text()
    if (!crumb || crumb === 'null') return null

    _yahooCrumb = { crumb, cookie: rawCookie, ts: Date.now() }
    return _yahooCrumb
  } catch {
    return null
  }
}

async function fetchYahooChart(
  ticker: string,
  extraHeaders: Record<string, string> = {},
  crumb?: string
): Promise<number | null> {
  const base = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`
  const url = crumb ? `${base}&crumb=${encodeURIComponent(crumb)}` : base
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json', ...extraHeaders },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const json = await res.json()
  const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice
  return typeof price === 'number' ? price : null
}

export async function fetchYahooPrice(ticker: string): Promise<number | null> {
  try {
    // Attempt 1: unauthenticated (works on most network environments)
    const direct = await fetchYahooChart(ticker)
    if (direct !== null) return direct

    // Attempt 2: cookie + crumb authentication
    const auth = await getYahooCrumb()
    if (!auth) return null
    return await fetchYahooChart(ticker, { Cookie: auth.cookie }, auth.crumb)
  } catch {
    return null
  }
}

// ── Unified fetcher — auto-routes by ticker format ────────────────────────────

export async function fetchStockPrice(ticker: string): Promise<number | null> {
  return isKoreanTicker(ticker) ? fetchNaverPrice(ticker) : fetchYahooPrice(ticker)
}
