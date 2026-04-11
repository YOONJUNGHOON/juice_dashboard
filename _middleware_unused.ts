// Logic lives in proxy.ts (Next.js 16 convention).
// This file must exist with a valid export for the build to pass.
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(_request: NextRequest) {
  return NextResponse.next()
}
