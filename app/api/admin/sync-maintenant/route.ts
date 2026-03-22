// app/api/admin/sync-maintenant/route.ts
// POST — Synchronisation manuelle Google Sheets → Firestore (lecture seule Sheets)
// Retourne un rapport détaillé par marié

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { syncCommandes } from '@/lib/syncBoutique'

export const dynamic = 'force-dynamic'

function checkAdminAuth(session: string | undefined): boolean {
  if (!session) return false
  const token = process.env.ADMIN_SESSION_TOKEN
  // Si le token est configuré, vérifier la correspondance
  // Si non configuré, accepter tout cookie non vide (middleware a déjà validé)
  return !token || session === token
}

export async function POST() {
  const jar = await cookies()
  const session = jar.get('admin_session')?.value
  if (!checkAdminAuth(session)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const SHEET_ID = process.env.GOOGLE_SHEETS_BOUTIQUE_ID
  if (!SHEET_ID) {
    return NextResponse.json({ error: 'GOOGLE_SHEETS_BOUTIQUE_ID manquant' }, { status: 500 })
  }

  try {
    const result = await syncCommandes(SHEET_ID)

    const details = Object.entries(result.details).map(([marie_uid, d]) => ({
      marie_uid,
      noms_maries: d.noms_maries,
      nb_commandes: d.nb_commandes,
      montant_total: d.montant_total,
    }))

    const montantTotal = details.reduce((s, d) => s + d.montant_total, 0)

    return NextResponse.json({
      success: true,
      commandes_traitees: result.synced,
      nouveaux_maries_credites: details.length,
      montant_total_fcfa: montantTotal,
      details,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
