import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const session = request.cookies.get('admin_session')?.value
    if (!session || session !== process.env.ADMIN_SESSION_TOKEN) {
      return NextResponse.redirect(new URL('/auth/connexion?redirect=/admin', request.url))
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
