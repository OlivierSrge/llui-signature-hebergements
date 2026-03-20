// app/api/admin/seed-test/route.ts
// GET — Crée le compte marié de test dans portail_users
// Protégé par le middleware admin (cookie admin_session requis)
// Usage : GET /api/admin/seed-test

import { NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const db = getDb()
    const uid = 'mariage_test_2026'
    const ref = db.collection('portail_users').doc(uid)

    const existing = await ref.get()
    if (existing.exists) {
      return NextResponse.json({
        success: true,
        message: 'Compte déjà existant — aucune modification.',
        identifiant: uid,
        url_login: 'https://llui-signature-hebergements.vercel.app/portail/login',
      })
    }

    await ref.set({
      uid,
      role: 'MARIÉ',
      noms_maries: 'Gaëlle & Junior',
      displayName: 'Gaëlle & Junior',
      date_evenement: '2026-06-14',
      lieu: 'Kribi',
      budget_previsionnel: 5000000,
      nombre_invites_prevu: 200,
      rev_lifetime: 0,
      grade: 'START',
      wallets: { cash: 0, credits_services: 0 },
      invites_confirmes: 0,
      invites_declines: 0,
      phone: '',
      parent_id: null,
      created_at: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({
      success: true,
      message: 'Compte test créé avec succès dans portail_users.',
      identifiant: uid,
      url_login: 'https://llui-signature-hebergements.vercel.app/portail/login',
      detail: {
        noms_maries: 'Gaëlle & Junior',
        role: 'MARIÉ',
        date_evenement: '14 juin 2026',
        lieu: 'Kribi',
        budget_previsionnel: '5 000 000 FCFA',
        nombre_invites_prevu: 200,
        grade: 'START',
      },
    })
  } catch (e) {
    console.error('seed-test error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
