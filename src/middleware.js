import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  try {
    await supabase.auth.getSession()
    const { data: { session } } = await supabase.auth.getSession()
    const { pathname } = req.nextUrl

    // Jika user belum login dan bukan di /login, redirect ke /login
    if (!session && pathname !== '/login') {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Jika user sudah login dan akses /login, redirect ke /
    if (session && pathname === '/login') {
      return NextResponse.redirect(new URL('/', req.url))
    }

    return res
  } catch (error) {
    console.error('Middleware error:', error)
    return NextResponse.redirect(new URL('/login', req.url))
  }
}

export const config = {
  matcher: [
    // Proteksi semua route kecuali static/next/api
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 