// app/api/portail/auth/register/route.ts
// Création d'un compte portail mariés + auto-enroll Fast Start

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 86_400_000)
}

export async function POST(req: NextRequest) {
  try {
    const { uid, displayName, phone, role, parent_id } = await req.json()
    if (!uid || !displayName) {
      return NextResponse.json({ error: 'uid et displayName requis' }, { status: 400 })
    }

    const db = getDb()
    const ref = db.collection('portail_users').doc(uid)

    // Eviter les doublons
    const existing = await ref.get()
    if (existing.exists) {
      return NextResponse.json({ error: 'Compte déjà existant' }, { status: 409 })
    }

    const now = new Date()
    const enrolledAt = Timestamp.fromDate(now)
    const deadline30 = Timestamp.fromDate(addDays(now, 30))
    const deadline60 = Timestamp.fromDate(addDays(now, 60))
    const deadline90 = Timestamp.fromDate(addDays(now, 90))

    await ref.set({
      uid,
      displayName,
      phone: phone ?? '',
      role: role ?? 'MARIÉ',
      parent_id: parent_id ?? null,
      grade: 'START',
      rev_lifetime: 0,
      wallets: { cash: 0, credits_services: 0 },
      invites_confirmes: 0,
      fast_start: {
        enrolled_at: enrolledAt,
        deadline_30j: deadline30,
        deadline_60j: deadline60,
        deadline_90j: deadline90,
        palier_30_unlocked: false,
        palier_60_unlocked: false,
        palier_90_unlocked: false,
        palier_30_claimed: false,
        palier_60_claimed: false,
        palier_90_claimed: false,
        palier_30_expire: false,
        palier_60_expire: false,
        palier_90_expire: false,
        palier_30_valide_admin: false,
        palier_60_valide_admin: false,
        palier_90_valide_admin: false,
        palier_30_paye: false,
        palier_60_paye: false,
        palier_90_paye: false,
        total_primes_validees: 0,
        total_primes_payees: 0,
      },
      created_at: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true, uid })
  } catch (e) {
    console.error('portail/auth/register error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
