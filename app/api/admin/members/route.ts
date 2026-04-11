import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

// GET /api/admin/members — list all members
export async function GET() {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('allowed_emails')
    .select('id, email, name, is_admin, created_at')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }

  return NextResponse.json({ members: data })
}

// POST /api/admin/members — add a member
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { email, name, pin, isAdmin } = await request.json()

  if (!email || !pin) {
    return NextResponse.json({ error: 'Email and PIN are required' }, { status: 400 })
  }

  const pin_hash = await bcrypt.hash(pin, 12)

  const { error } = await supabase.from('allowed_emails').insert({
    email: email.trim().toLowerCase(),
    name: name?.trim() || null,
    pin_hash,
    is_admin: isAdmin ?? false,
  })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This email is already registered' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
