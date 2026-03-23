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
    const results: Record<string, string> = {}

    // ── Compte 1 : mariage_test_2026 ──────────────────────────────────
    const uid1 = 'mariage_test_2026'
    const ref1 = db.collection('portail_users').doc(uid1)
    const existing1 = await ref1.get()
    if (existing1.exists) {
      results[uid1] = 'déjà existant — aucune modification'
    } else {
      await ref1.set({
        uid: uid1,
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
      results[uid1] = 'créé'
    }

    // ── Compte 2 : mariage_marie_test_2026 (fiche invitation test) ────
    const uid2 = 'mariage_marie_test_2026'
    const ref2 = db.collection('portail_users').doc(uid2)
    const existing2 = await ref2.get()
    if (existing2.exists) {
      results[uid2] = 'déjà existant — aucune modification'
    } else {
      await ref2.set({
        uid: uid2,
        role: 'MARIÉ',
        noms_maries: 'Marie & Thomas',
        displayName: 'Marie & Thomas',
        date_mariage: '2026-11-21',
        lieu: 'Kribi, Cameroun',
        code_promo: 'LLUI-M-2026',
        budget_previsionnel: 4000000,
        nombre_invites_prevu: 150,
        rev_lifetime: 0,
        grade: 'START',
        wallets: { cash: 0, credits_services: 0 },
        invites_confirmes: 0,
        invites_declines: 0,
        phone: '',
        parent_id: null,
        created_at: FieldValue.serverTimestamp(),
      })
      results[uid2] = 'créé'
    }

    return NextResponse.json({
      success: true,
      results,
      url_login: 'https://llui-signature-hebergements.vercel.app/portail/login',
      fiche_test_url: `https://llui-signature-hebergements.vercel.app/invite/${uid2}?prenom=Marie&code=LLUI-M-2026`,
    })
  } catch (e) {
    console.error('seed-test error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
