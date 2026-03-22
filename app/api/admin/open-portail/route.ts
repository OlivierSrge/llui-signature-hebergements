// app/api/admin/open-portail/route.ts
// GET — Valide le token one-time, set les cookies portail_uid + admin_view, redirige

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.redirect(new URL('/portail/login', req.url))
  }

  try {
    const db = getDb()
    const tokenSnap = await db.collection('impersonate_tokens').doc(token).get()

    if (!tokenSnap.exists) {
      return NextResponse.redirect(new URL('/portail/login?error=token_invalide', req.url))
    }

    const data = tokenSnap.data()!
    const used = data.used as boolean
    const expiresAt = data.expires_at?.toDate() as Date
    const mariageUid = data.marie_uid as string
    const nomsMaries = (data.noms_maries as string) || mariageUid

    if (used || expiresAt < new Date()) {
      return NextResponse.redirect(new URL('/portail/login?error=token_expire', req.url))
    }

    // Marquer le token comme utilisé (one-time)
    await db.collection('impersonate_tokens').doc(token).update({ used: true })

    // Préparer la redirection vers /portail avec les cookies
    const response = NextResponse.redirect(new URL('/portail', req.url))

    const cookieOpts = {
      httpOnly: false, // portail_uid doit être lisible côté client (document.cookie)
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    }

    response.cookies.set('portail_uid', mariageUid, {
      ...cookieOpts,
      maxAge: 60 * 60 * 2, // 2h (session impersonation courte)
    })

    response.cookies.set('admin_view', nomsMaries, {
      ...cookieOpts,
      maxAge: 60 * 60 * 2, // valeur = noms mariés pour affichage dans le bandeau
    })

    return response
  } catch {
    return NextResponse.redirect(new URL('/portail/login', req.url))
  }
}
