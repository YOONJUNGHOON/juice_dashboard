import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

// GET /api/refs — list all user-added ref links
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('ref_links')
    .select('id, label, url, created_at')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 })

  return NextResponse.json({ links: data ?? [] })
}

// POST /api/refs — add a new ref link
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { label, url } = await request.json()

  if (!label?.trim() || !url?.trim()) {
    return NextResponse.json({ error: '이름과 URL을 모두 입력해주세요' }, { status: 400 })
  }

  const { error } = await supabase.from('ref_links').insert({
    label: label.trim(),
    url: url.trim(),
  })

  if (error) return NextResponse.json({ error: 'Failed to add link' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
