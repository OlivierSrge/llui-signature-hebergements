import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protection espace admin
  if (pathname.startsWith('/admin')) {
    const session = request.cookies.get('admin_session')?.value
    if (!session || session !== process.env.ADMIN_SESSION_TOKEN) {
      return NextResponse.redirect(new URL('/auth/connexion?redirect=/admin', request.url))
    }
  }

  // Protection portail partenaire
  if (pathname.startsWith('/partenaire/dashboard')) {
    const partnerSession = request.cookies.get('partner_session')?.value
    if (!partnerSession) {
      return NextResponse.redirect(new URL('/partenaire', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/partenaire/dashboard/:path*'],
}
