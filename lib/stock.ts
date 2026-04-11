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

// ── Naver Finance price fetcher (Korean stocks) ───────────────────────────────

export async function fetchNaverPrice(ticker: string): Promise<number | null> {
  try {
    const url = `https://finance.naver.com/item/main.nhn?code=${encodeURIComponent(ticker)}`
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Referer: 'https://finance.naver.com',
      },
      next: { revalidate: 60 },
    })

    if (!res.ok) return null

    const html = await res.text()
    const match = html.match(/class="no_today"[^>]*>[\s\S]*?<span class="blind">([0-9,]+)<\/span>/)
    if (!match) return null

    const price = parseFloat(match[1].replace(/,/g, ''))
    return isNaN(price) ? null : price
  } catch {
    return null
  }
}

// ── Yahoo Finance price fetcher (overseas stocks) ─────────────────────────────

export async function fetchYahooPrice(ticker: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
      next: { revalidate: 60 },
    })

    if (!res.ok) return null

    const json = await res.json()
    const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice
    return typeof price === 'number' ? price : null
  } catch {
    return null
  }
}

// ── Unified fetcher — auto-routes by ticker format ────────────────────────────

export async function fetchStockPrice(ticker: string): Promise<number | null> {
  return isKoreanTicker(ticker) ? fetchNaverPrice(ticker) : fetchYahooPrice(ticker)
}
