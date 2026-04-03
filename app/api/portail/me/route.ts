// app/api/portail/me/route.ts
// GET — Retourne les données de l'utilisateur connecté via cookie portail_uid
// Permet aux composants client de récupérer l'identité sans lire document.cookie directement

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'
import { generateCodePromo } from '@/lib/generatePromoCode'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const jar = await cookies()
    // portail_uid contient toujours l'uid réel (login direct ET impersonation admin)
    // admin_view contient uniquement le nom affiché dans le bandeau admin — pas l'uid
    const portailUid = jar.get('portail_uid')?.value
    const uid = portailUid

    if (!uid) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const db = getDb()
    const snap = await db.collection('portail_users').doc(uid).get()
    if (!snap.exists) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    const d = snap.data()!

    // Date mariage — compatibilité descendante (nouveau → ancien)
    const dateTs = d.date_mariage ?? d.date_evenement ?? d.projet?.date_evenement
    const dateISO = dateTs?.toDate
      ? dateTs.toDate().toISOString()
      : typeof dateTs === 'string' ? dateTs : null

    const nomsMaries = d.noms_maries ?? d.nom ?? d.displayName ?? ''

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
      // Retourné sous 'date_evenement' pour compat avec le hook existant
      date_evenement: dateISO,
      date_mariage: dateISO,
      lieu: d.lieu ?? d.projet?.lieu ?? '',
      budget_previsionnel: d.budget_total ?? d.budget_previsionnel ?? d.projet?.budget_previsionnel ?? 0,
      nombre_invites_prevu: d.nb_invites_prevus ?? d.nombre_invites_prevu ?? d.projet?.nombre_invites_prevu ?? 0,
      code_promo: codePromo,
      photo_url: d.photo_url ?? '',
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
