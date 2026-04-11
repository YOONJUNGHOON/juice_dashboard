import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

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
