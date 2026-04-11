import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

// PATCH /api/admin/members/[id] — update name
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const { name } = await request.json()

  const { error } = await supabase
    .from('allowed_emails')
    .update({ name: name?.trim() || null })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: '수정 실패' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/members/[id] — remove a member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  // Prevent admin from deleting themselves
  const { data: target } = await supabase
    .from('allowed_emails')
    .select('email')
    .eq('id', id)
    .single()

  if (target?.email === session.email) {
    return NextResponse.json({ error: 'You cannot remove yourself' }, { status: 400 })
  }

  const { error } = await supabase.from('allowed_emails').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
