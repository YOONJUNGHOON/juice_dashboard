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

// ── Naver Finance price fetcher ───────────────────────────────────────────────

/**
 * Fetch the current stock price for a Korean ticker from Naver Finance.
 * Must be called server-side only (API route or Server Component).
 * Returns null if the ticker is not found or the fetch fails.
 */
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
      next: { revalidate: 60 }, // cache for 60 s in Next.js fetch cache
    })

    if (!res.ok) return null

    const html = await res.text()

    // Naver Finance: <p class="no_today"> ... <span class="blind">123,456</span>
    const match = html.match(/class="no_today"[^>]*>[\s\S]*?<span class="blind">([0-9,]+)<\/span>/)
    if (!match) return null

    const price = parseFloat(match[1].replace(/,/g, ''))
    return isNaN(price) ? null : price
  } catch {
    return null
  }
}
