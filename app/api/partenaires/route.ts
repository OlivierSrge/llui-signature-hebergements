// app/api/partenaires/route.ts
// POST — Créer un prescripteur partenaire Canal 2
// Firestore + Affiliés_Codes Google Sheets + code_promo_affilie
//
// Body JSON :
// {
//   nom_etablissement: string,
//   email?: string,
//   telephone: string,
//   type: "hotel"|"restaurant"|"agence"|"bar"|"plage"|"autre",
//   reduction_pct?: number,
//   forfait_type?: "mensuel"|"annuel",
//   remise_type?: "reduction_pct"|"non_financier",
//   remise_description?: string
// }

import { NextRequest, NextResponse } from 'next/server'
import { creerPrescripteurPartenaire } from '@/actions/codes-sessions'

export const dynamic = 'force-dynamic'

const TYPES_VALIDES = ['hotel', 'restaurant', 'agence', 'bar', 'plage', 'autre'] as const

export async function POST(req: NextRequest) {
  // Auth optionnelle via CRON_SECRET pour appels internes
  const auth = req.headers.get('authorization')
  if (auth && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }

  const nom = (body.nom_etablissement as string)?.trim()
  const telephone = (body.telephone as string)?.trim()
  const type = (body.type as string)?.trim()

  if (!nom) return NextResponse.json({ error: 'nom_etablissement requis' }, { status: 400 })
  if (!telephone) return NextResponse.json({ error: 'telephone requis' }, { status: 400 })
  if (!type || !TYPES_VALIDES.includes(type as typeof TYPES_VALIDES[number])) {
    return NextResponse.json({ error: `type invalide (attendu: ${TYPES_VALIDES.join(' | ')})` }, { status: 400 })
  }

  const remise_type = (body.remise_type as string) === 'non_financier' ? 'non_financier' : 'reduction_pct'
  const remise_valeur_pct = remise_type === 'reduction_pct'
    ? (typeof body.reduction_pct === 'number' ? body.reduction_pct : 10)
    : null
  const remise_description = remise_type === 'non_financier'
    ? ((body.remise_description as string) ?? '')
    : null

  const res = await creerPrescripteurPartenaire({
    nom_etablissement: nom,
    email: (body.email as string) ?? '',
    telephone,
    adresse: (body.adresse as string) ?? '',
    type: type as typeof TYPES_VALIDES[number],
    remise_type,
    remise_valeur_pct,
    remise_description,
    forfait_type: body.forfait_type === 'annuel' ? 'annuel' : 'mensuel',
    created_by: 'api',
  })

  if (!res.success) {
    return NextResponse.json({ error: res.error ?? 'Erreur création' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    partenaire_id: res.uid,
    code_promo: res.code_promo,
    sheets_sync: true,
  })
}
