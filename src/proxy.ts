import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'
import { NextResponse } from 'next/server'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { nextUrl } = req
  const isAuthenticated = !!req.auth

  const isLoginPage = nextUrl.pathname === '/login'
  const isApiAuth = nextUrl.pathname.startsWith('/api/auth')
  const isSeedRoute = nextUrl.pathname === '/api/seed'

  if (isApiAuth || isSeedRoute) return NextResponse.next()

  if (!isAuthenticated && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
