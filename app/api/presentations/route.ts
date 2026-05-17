import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

// GET /api/presentations?year=2026
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const year = parseInt(req.nextUrl.searchParams.get('year') ?? String(new Date().getFullYear()))

  const [membersRes, presRes] = await Promise.all([
    supabase.from('allowed_emails').select('id, name').order('name'),
    supabase.from('presentations').select('member_id, month, presented').eq('year', year),
  ])

  if (membersRes.error) return NextResponse.json({ error: membersRes.error.message }, { status: 500 })

  return NextResponse.json({
    members: membersRes.data ?? [],
    presentations: presRes.data ?? [],
  })
}

// POST /api/presentations — upsert a single cell
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { member_id, year, month, presented } = await req.json()

  if (!member_id || !year || !month || typeof presented !== 'boolean') {
    return NextResponse.json({ error: '필수 값이 없습니다' }, { status: 400 })
  }

  const { error } = await supabase.from('presentations').upsert(
    { member_id, year, month, presented },
    { onConflict: 'member_id,year,month' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
