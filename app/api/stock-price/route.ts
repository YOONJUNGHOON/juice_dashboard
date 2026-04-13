import { NextRequest, NextResponse } from 'next/server'
import { fetchStockPrice } from '@/lib/stock'
import { getSession } from '@/lib/auth'

// In-memory price cache: 10-minute TTL per ticker
const CACHE_TTL_MS = 10 * 60 * 1000
const priceCache = new Map<string, { price: number | null; ts: number }>()

function getCached(ticker: string): number | null | undefined {
  const entry = priceCache.get(ticker)
  if (!entry) return undefined
  if (Date.now() - entry.ts > CACHE_TTL_MS) { priceCache.delete(ticker); return undefined }
  return entry.price
}

function setCached(ticker: string, price: number | null) {
  priceCache.set(ticker, { price, ts: Date.now() })
}

// GET /api/stock-price?tickers=005930,000660,035420
// Returns { "005930": 52300, "000660": 95400, "035420": null }
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const tickersParam = searchParams.get('tickers')

  if (!tickersParam) return NextResponse.json({})

  const tickers = tickersParam
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)

  const results = await Promise.all(
    tickers.map(async (ticker) => {
      const cached = getCached(ticker)
      if (cached !== undefined) return [ticker, cached] as [string, number | null]
      const price = await fetchStockPrice(ticker)
      setCached(ticker, price)
      return [ticker, price] as [string, number | null]
    })
  )

  return NextResponse.json(Object.fromEntries(results), {
    headers: { 'Cache-Control': 'no-store' },
  })
}
