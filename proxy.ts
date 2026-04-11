import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySessionToken } from '@/lib/auth'

const PUBLIC_PATHS = ['/login', '/api/auth/login']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  const token = request.cookies.get('juice_session')?.value

  if (isPublic) {
    // Already logged in → redirect away from login
    if (token && pathname === '/login') {
      const session = await verifySessionToken(token)
      if (session) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
    return NextResponse.next()
  }

  // Protected route — verify session
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const session = await verifySessionToken(token)
  if (!session) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('juice_session')
    return response
  }

  // Admin-only routes
  if (pathname.startsWith('/admin') && !session.isAdmin) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
