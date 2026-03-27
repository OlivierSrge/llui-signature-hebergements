// app/api/admin/dossier-marie/route.ts
// GET /api/admin/dossier-marie?uid=xxx — données complètes dossier marié (admin)
// Retourne : user, invités, journal, historique messages
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'

function isAdmin(): boolean {
  return cookies().get('admin_session')?.value === process.env.ADMIN_SESSION_TOKEN
}

export async function GET(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const uid = req.nextUrl.searchParams.get('uid')
  if (!uid) return NextResponse.json({ error: 'uid requis' }, { status: 400 })

  const db = getDb()

  const [userDoc, invitesSnap, journalSnap, messagesSnap] = await Promise.all([
    db.collection('portail_users').doc(uid).get(),
    db.collection(`portail_users/${uid}/invites_guests`)
      .orderBy('created_at', 'desc').limit(200).get(),
    db.collection('admin_logs')
      .where('marie_uid', '==', uid)
      .orderBy('created_at', 'desc').limit(50).get(),
    db.collection('admin_logs')
      .where('marie_uid', '==', uid)
      .where('type', '==', 'whatsapp')
      .orderBy('created_at', 'desc').limit(30).get(),
  ])

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

  const invites = invitesSnap.docs.map(d => {
    const g = d.data()
    return {
      id: d.id,
      nom: g.nom || '',
      telephone: g.telephone || g.tel || '',
      email: g.email || '',
      statut: g.statut || 'invite',          // invite | confirme | decline
      rsvp_repondu: !!g.rsvp_repondu,
      lien_envoye: !!g.lien_envoye,
      regime_alimentaire: g.regime_alimentaire || '',
      hebergement: g.hebergement || '',
      relance_envoyee: !!g.relance_envoyee,
      relance_at: g.relance_at?.toDate?.()?.toISOString() ?? null,
      created_at: g.created_at?.toDate?.()?.toISOString() ?? null,
      total_achats: g.total_achats || 0,
    }
  })

  const journal = journalSnap.docs.map(d => {
    const j = d.data()
    return {
      id: d.id,
      action: j.action || '',
      description: j.description || j.message || '',
      type: j.type || 'info',
      montant: j.montant || null,
      date: j.created_at?.toDate?.()?.toISOString() ?? null,
    }
  })

  // Stats invités
  const stats_invites = {
    total: invites.length,
    confirmes: invites.filter(i => i.statut === 'confirme').length,
    declines: invites.filter(i => i.statut === 'decline').length,
    silencieux: invites.filter(i => i.statut === 'invite' && !i.rsvp_repondu).length,
    liens_envoyes: invites.filter(i => i.lien_envoye).length,
  }

  return NextResponse.json({ user, invites, journal, stats_invites })
}
