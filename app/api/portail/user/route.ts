// app/api/portail/user/route.ts
// Données publiques d'un utilisateur portail (lecture légère)

import { NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import { generateCodePromo } from '@/lib/generatePromoCode'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const uid = searchParams.get('uid')
    if (!uid) return NextResponse.json({ error: 'uid manquant' }, { status: 400 })

    const db = getDb()
    const snap = await db.collection('portail_users').doc(uid).get()
    if (!snap.exists) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

    const d = snap.data()!
    const dateTs = d.projet?.date_evenement ?? d.date_evenement
    const dateISO = dateTs?.toDate ? dateTs.toDate().toISOString() : (typeof dateTs === 'string' ? dateTs : null)
    const nomsMaries = d.noms_maries ?? d.displayName ?? ''

    // Auto-générer code_promo si absent
    let codePromo: string = d.code_promo ?? ''
    if (!codePromo && nomsMaries) {
      codePromo = generateCodePromo(nomsMaries, uid)
      await db.collection('portail_users').doc(uid).update({ code_promo: codePromo }).catch(() => {})
    }

    return NextResponse.json({
      uid,
      displayName: d.displayName ?? '',
      noms_maries: nomsMaries,
      grade: d.grade ?? 'START',
      rev_lifetime: d.rev_lifetime ?? 0,
      wallet_cash: d.wallets?.cash ?? 0,
      wallet_credits: d.wallets?.credits_services ?? 0,
      invites_confirmes: d.invites_confirmes ?? 0,
      date_evenement: dateISO,
      lieu: d.projet?.lieu ?? d.lieu ?? '',
      budget_previsionnel: d.projet?.budget_previsionnel ?? d.budget_previsionnel ?? 0,
      nombre_invites_prevu: d.projet?.nombre_invites_prevu ?? d.nombre_invites_prevu ?? 0,
      code_promo: codePromo,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
