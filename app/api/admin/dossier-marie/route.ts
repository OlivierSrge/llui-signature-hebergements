// app/api/admin/dossier-marie/route.ts
// GET /api/admin/dossier-marie?uid=xxx — données complètes dossier marié (admin)
// Retourne : user, invités, journal, historique messages
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'

function isAdmin(): boolean {
  const session = cookies().get('admin_session')?.value
  if (!session) return false
  const token = process.env.ADMIN_SESSION_TOKEN
  return !token || session === token
}

export async function GET(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const uid = req.nextUrl.searchParams.get('uid')
  if (!uid) return NextResponse.json({ error: 'uid requis' }, { status: 400 })

  try {
    const db = getDb()

    // 1. Vérifier l'existence du document en premier
    const userDoc = await db.collection('portail_users').doc(uid).get()
    if (!userDoc.exists) return NextResponse.json({ error: 'Marié introuvable' }, { status: 404 })

    const u = userDoc.data()!
    const dateISO = u.date_mariage?.toDate?.()?.toISOString() ?? u.date_mariage ?? null

    const user = {
      uid,
      noms_maries: u.noms_maries || u.displayName || '',
      whatsapp: u.whatsapp || u.phone || '',
      date_mariage: dateISO,
      lieu: u.lieu || '',
      pack_nom: u.pack_nom || u.pack || '',
      montant_total: u.montant_total || u.budget_total || 0,
      acompte_verse: u.acompte_verse || 0,
      nb_invites_prevus: u.nb_invites_prevus || 0,
      grade: u.grade || 'START',
      statut_contrat: u.statut_contrat || null,
      contrat_actif: u.contrat_actif || null,
      code_promo: u.code_promo || '',
    }

    // 2. Invités (sous-collection directe, pas d'index composite requis)
    let invites: ReturnType<typeof mapInvite>[] = []
    try {
      const invitesSnap = await db
        .collection(`portail_users/${uid}/invites_guests`)
        .orderBy('created_at', 'desc')
        .limit(200)
        .get()
      invites = invitesSnap.docs.map(mapInvite)
    } catch {
      // Fallback sans tri si l'index n'existe pas encore
      try {
        const invitesSnap = await db
          .collection(`portail_users/${uid}/invites_guests`)
          .limit(200)
          .get()
        invites = invitesSnap.docs.map(mapInvite)
      } catch { /* aucun invité disponible */ }
    }

    // 3. Journal admin_logs (nécessite index composite — fallback silencieux)
    let journal: ReturnType<typeof mapJournal>[] = []
    try {
      const journalSnap = await db
        .collection('admin_logs')
        .where('marie_uid', '==', uid)
        .orderBy('created_at', 'desc')
        .limit(50)
        .get()
      journal = journalSnap.docs.map(mapJournal)
    } catch {
      // Index composite manquant — retourner un journal vide
    }

    // Stats invités
    const stats_invites = {
      total: invites.length,
      confirmes: invites.filter(i => i.statut === 'confirme').length,
      declines: invites.filter(i => i.statut === 'decline').length,
      silencieux: invites.filter(i => i.statut === 'invite' && !i.rsvp_repondu).length,
      liens_envoyes: invites.filter(i => i.lien_envoye).length,
    }

    return NextResponse.json({ user, invites, journal, stats_invites })
  } catch (err) {
    console.error('[dossier-marie] Erreur:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

function mapInvite(d: FirebaseFirestore.QueryDocumentSnapshot) {
  const g = d.data()
  return {
    id: d.id,
    nom: g.nom || '',
    telephone: g.telephone || g.tel || '',
    email: g.email || '',
    statut: (g.statut as string) || 'invite',
    rsvp_repondu: !!g.rsvp_repondu,
    lien_envoye: !!g.lien_envoye,
    regime_alimentaire: g.regime_alimentaire || '',
    hebergement: g.hebergement || '',
    relance_envoyee: !!g.relance_envoyee,
    relance_at: g.relance_at?.toDate?.()?.toISOString() ?? null,
    created_at: g.created_at?.toDate?.()?.toISOString() ?? null,
    total_achats: g.total_achats || 0,
  }
}

function mapJournal(d: FirebaseFirestore.QueryDocumentSnapshot) {
  const j = d.data()
  return {
    id: d.id,
    action: j.action || '',
    description: j.description || j.message || '',
    type: j.type || 'info',
    montant: j.montant || null,
    date: j.created_at?.toDate?.()?.toISOString() ?? null,
  }
}
