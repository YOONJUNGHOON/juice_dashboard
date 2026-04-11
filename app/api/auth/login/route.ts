import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase'
import { createSessionToken, cookieName, cookieOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const { email, pin } = await request.json()

  if (!email || !pin) {
    return NextResponse.json({ error: 'Email and PIN are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('allowed_emails')
    .select('email, pin_hash, name, is_admin')
    .eq('email', email.trim().toLowerCase())
    .single()

  if (error || !data) {
    // Use the same message for wrong email or wrong PIN to avoid enumeration
    return NextResponse.json({ error: 'Invalid email or PIN' }, { status: 401 })
  }

  const pinMatch = await bcrypt.compare(pin, data.pin_hash)
  if (!pinMatch) {
    return NextResponse.json({ error: 'Invalid email or PIN' }, { status: 401 })
  }

  const token = await createSessionToken({
    email: data.email,
    name: data.name ?? data.email,
    isAdmin: data.is_admin ?? false,
  })

  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const response = NextResponse.json({ ok: true })
  response.cookies.set(cookieName(), token, cookieOptions(expires))

  return response
}
