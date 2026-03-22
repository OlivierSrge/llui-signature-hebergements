// app/api/admin/update-marie/route.ts
// POST — Mise à jour rapide champs mariés depuis le panneau admin
// Champs supportés : budget_total, nb_invites_prevus, versements statuts

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

function checkAdminAuth(session: string | undefined): boolean {
  if (!session) return false
  const token = process.env.ADMIN_SESSION_TOKEN
  return !token || session === token
}

interface VersementStatuts {
  v1?: 'en_attente' | 'payé' | 'en_retard'
  v2?: 'en_attente' | 'payé' | 'en_retard'
  v3?: 'en_attente' | 'payé' | 'en_retard'
}

interface Body {
  uid: string
  budget_total?: number
  nb_invites_prevus?: number
  versement_statuts?: VersementStatuts
  date_mariage?: string
  lieu?: string
  noms_maries?: string
}

export async function POST(req: Request) {
  const jar = await cookies()
  const session = jar.get('admin_session')?.value
  if (!checkAdminAuth(session)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body: Body = await req.json()
    const { uid, budget_total, nb_invites_prevus, versement_statuts, date_mariage, lieu, noms_maries } = body

    if (!uid) return NextResponse.json({ error: 'uid manquant' }, { status: 400 })

    const db = getDb()
    const ref = db.collection('portail_users').doc(uid)
    const snap = await ref.get()
    if (!snap.exists) return NextResponse.json({ error: 'Marié introuvable' }, { status: 404 })

    const d = snap.data()!
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {}

    // Mise à jour budget + recalcul versements
    if (budget_total !== undefined) {
      const v1 = Math.round(budget_total * 0.3)
      const v2 = Math.round(budget_total * 0.4)
      const v3 = Math.round(budget_total * 0.3)
      const existing = d.versements ?? {}
      updates['budget_total'] = budget_total
      updates['projet.budget_previsionnel'] = budget_total
      updates['versements'] = {
        v1: { label: 'Acompte 30%', montant: v1, statut: existing.v1?.statut ?? 'en_attente' },
        v2: { label: 'Versement 40%', montant: v2, statut: existing.v2?.statut ?? 'en_attente' },
        v3: { label: 'Solde 30%', montant: v3, statut: existing.v3?.statut ?? 'en_attente' },
      }
    }

    // Mise à jour statuts versements seuls (sans toucher aux montants)
    if (versement_statuts && !budget_total) {
      const existing = d.versements ?? {}
      if (versement_statuts.v1) updates['versements.v1.statut'] = versement_statuts.v1
      if (versement_statuts.v2) updates['versements.v2.statut'] = versement_statuts.v2
      if (versement_statuts.v3) updates['versements.v3.statut'] = versement_statuts.v3
      // Si budget_total change AVEC statuts — déjà géré dans le bloc budget_total
      void existing
    } else if (versement_statuts && budget_total !== undefined) {
      // Appliquer les statuts au-dessus du versements recalculé
      const computed = updates['versements']
      if (versement_statuts.v1) computed.v1.statut = versement_statuts.v1
      if (versement_statuts.v2) computed.v2.statut = versement_statuts.v2
      if (versement_statuts.v3) computed.v3.statut = versement_statuts.v3
      updates['versements'] = computed
    }

    if (nb_invites_prevus !== undefined) {
      updates['nb_invites_prevus'] = nb_invites_prevus
      updates['projet.nombre_invites_prevu'] = nb_invites_prevus
    }

    if (date_mariage !== undefined) {
      updates['date_mariage'] = date_mariage
      updates['projet.date_mariage'] = date_mariage
    }

    if (lieu !== undefined) {
      updates['lieu'] = lieu
      updates['projet.lieu'] = lieu
    }

    if (noms_maries !== undefined) {
      updates['noms_maries'] = noms_maries
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })
    }

    await ref.update(updates)
    return NextResponse.json({ success: true, updated: Object.keys(updates) })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
