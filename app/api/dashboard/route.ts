import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

// GET /api/dashboard — list all entries
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('dashboard_entries')
    .select('id, ticker, company_name, purchase_price, notes, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 })

  return NextResponse.json({ entries: data })
}

// POST /api/dashboard — add an entry
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ticker, company_name, purchase_price, notes } = await request.json()

  if (!ticker || !company_name || purchase_price == null) {
    return NextResponse.json({ error: '종목코드, 종목명, 매입단가는 필수입니다' }, { status: 400 })
  }

  if (Number(purchase_price) <= 0) {
    return NextResponse.json({ error: '매입단가는 0보다 커야 합니다' }, { status: 400 })
  }

  const { error } = await supabase.from('dashboard_entries').insert({
    ticker: ticker.trim(),
    company_name: company_name.trim(),
    purchase_price: Number(purchase_price),
    notes: notes?.trim() || null,
  })

  if (error) return NextResponse.json({ error: 'Failed to add entry' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
