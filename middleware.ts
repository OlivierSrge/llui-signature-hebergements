import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protection espace admin (sauf page de confirmation publique Pass VIP)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/confirm/')) {
    const session = request.cookies.get('admin_session')?.value
    if (!session || session !== process.env.ADMIN_SESSION_TOKEN) {
      return NextResponse.redirect(new URL('/auth/connexion?redirect=/admin', request.url))
    }
  }

  // Protection dashboard Pass VIP client
  if (pathname.startsWith('/pass-vip/dashboard')) {
    const passSession = request.cookies.get('pass_vip_session')?.value
    if (!passSession) {
      return NextResponse.redirect(new URL('/pass-vip/login', request.url))
    }
  }

  // Protection portail mariés/partenaires
  if (pathname.startsWith('/portail') && !pathname.startsWith('/portail/login')) {
    const uid = request.cookies.get('portail_uid')?.value
    if (!uid) {
      return NextResponse.redirect(new URL('/portail/login', request.url))
    }
  }

  // Protection portail partenaire
  const partnerProtectedPaths = ['/partenaire/dashboard', '/partenaire/reservations', '/partenaire/scanner']
  if (partnerProtectedPaths.some((p) => pathname.startsWith(p))) {
    const partnerSession = request.cookies.get('partner_session')?.value
    if (!partnerSession) {
      return NextResponse.redirect(new URL('/partenaire', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/portail/:path*', '/partenaire/dashboard/:path*', '/partenaire/reservations/:path*', '/partenaire/scanner/:path*', '/pass-vip/dashboard/:path*'],
}
