import { NextRequest, NextResponse } from 'next/server'
import { fetchStockPrice } from '@/lib/stock'
import { getSession } from '@/lib/auth'

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
      const price = await fetchStockPrice(ticker)
      return [ticker, price] as [string, number | null]
    })
  )

  // No caching — always return fresh prices
  return NextResponse.json(Object.fromEntries(results), {
    headers: { 'Cache-Control': 'no-store' },
  })
}
