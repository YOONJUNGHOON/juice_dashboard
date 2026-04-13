import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

// PATCH /api/refs/[id] — update label and/or url
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { label, url } = await request.json()

  if (!label?.trim() || !url?.trim()) {
    return NextResponse.json({ error: '이름과 URL을 모두 입력해주세요' }, { status: 400 })
  }

  const { error } = await supabase
    .from('ref_links')
    .update({ label: label.trim(), url: url.trim() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Failed to update link' }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// DELETE /api/refs/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { error } = await supabase.from('ref_links').delete().eq('id', id)

  if (error) return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
