import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

// PATCH /api/dashboard/[id] — update an entry (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const { ticker, company_name, purchase_price, recommender, notes } = await request.json()

  if (!ticker || !company_name || purchase_price == null) {
    return NextResponse.json({ error: '종목코드, 종목명, 매입단가는 필수입니다' }, { status: 400 })
  }

  const { error } = await supabase
    .from('dashboard_entries')
    .update({
      ticker: ticker.trim(),
      company_name: company_name.trim(),
      purchase_price: Number(purchase_price),
      recommender: recommender?.trim() || null,
      notes: notes?.trim() || null,
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// DELETE /api/dashboard/[id] — remove an entry (admin only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const { error } = await supabase.from('dashboard_entries').delete().eq('id', id)

  if (error) return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
