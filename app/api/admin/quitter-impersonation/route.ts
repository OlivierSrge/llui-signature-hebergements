// app/api/admin/quitter-impersonation/route.ts
// POST — Efface les cookies d'impersonation et redirige vers /admin/ecosysteme

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  const response = NextResponse.redirect(
    new URL('/admin/ecosysteme', process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app')
  )
  response.cookies.delete('portail_uid')
  response.cookies.delete('admin_view')
  return response
}
