// app/api/admin/annulations/route.ts — #127 Gestion remboursements/annulations
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'
import { Timestamp } from 'firebase-admin/firestore'
import { sendWhatsApp } from '@/lib/whatsappNotif'

function isAdmin(): boolean {
  return cookies().get('admin_session')?.value === process.env.ADMIN_SESSION_TOKEN
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

// Calcul du taux de remboursement selon la politique L&Lui
function calculerRemboursement(dateMariage: Date, montantVerse: number): {
  tauxPct: number
  montantRembourse: number
  montantRetenu: number
  tranche: string
  joursRestants: number
} {
  const now = new Date()
  const diffMs = dateMariage.getTime() - now.getTime()
  const joursRestants = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  let tauxPct: number
  let tranche: string

  if (joursRestants >= 90) {
    tauxPct = 100
    tranche = 'Avant J-90 — Remboursement intégral'
  } else if (joursRestants >= 60) {
    tauxPct = 70
    tranche = 'Entre J-60 et J-90 — Remboursement 70%'
  } else if (joursRestants >= 30) {
    tauxPct = 50
    tranche = 'Entre J-30 et J-60 — Remboursement 50%'
  } else {
    tauxPct = 0
    tranche = joursRestants >= 7
      ? 'Après J-30 — Aucun remboursement'
      : 'Après J-7 — Aucun remboursement (frais mobilisation)'
  }

  const montantRembourse = Math.round((montantVerse * tauxPct) / 100)
  const montantRetenu = montantVerse - montantRembourse

  return { tauxPct, montantRembourse, montantRetenu, tranche, joursRestants }
}

// POST — créer une demande d'annulation
export async function POST(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { marie_uid, motif } = await req.json()
  if (!marie_uid) return NextResponse.json({ error: 'marie_uid requis' }, { status: 400 })

  const db = getDb()
  const userDoc = await db.collection('portail_users').doc(marie_uid).get()
  if (!userDoc.exists) return NextResponse.json({ error: 'Marié introuvable' }, { status: 404 })

  const u = userDoc.data()!
  const dateMariage = u.date_mariage?.toDate?.() ?? new Date(u.date_mariage)
  const montantVerse = u.acompte_verse || 0

  const remboursement = calculerRemboursement(dateMariage, montantVerse)
  const annulation_id = `ANNUL-${marie_uid.slice(0, 6).toUpperCase()}-${Date.now()}`

  await db.collection('annulations_mariage').doc(annulation_id).set({
    annulation_id,
    marie_uid,
    noms_maries: u.noms_maries,
    whatsapp: u.whatsapp,
    date_mariage: u.date_mariage,
    montant_total: u.montant_total || u.budget_total || 0,
    montant_verse: montantVerse,
    jours_restants: remboursement.joursRestants,
    taux_remboursement: remboursement.tauxPct,
    montant_rembourse: remboursement.montantRembourse,
    montant_retenu: remboursement.montantRetenu,
    tranche: remboursement.tranche,
    motif: motif || 'Annulation demandée par le couple',
    statut: 'demande',
    date_demande: Timestamp.now(),
    date_traitement: null,
  })

  // Mettre à jour le statut du portail_users
  await db.collection('portail_users').doc(marie_uid).update({
    statut_contrat: 'annulation_demandee',
  })

  // Notification WhatsApp au couple
  const msg = `*L&Lui Signature* - Annulation N° ${annulation_id}\n\nBonjour ${u.noms_maries},\n\nNous avons bien reçu votre demande d'annulation.\n\n📅 Jours restants avant mariage : *J-${remboursement.joursRestants}*\n💰 Montant versé : *${fmt(montantVerse)}*\n📊 Taux de remboursement : *${remboursement.tauxPct}%*\n💚 Remboursement prévu : *${fmt(remboursement.montantRembourse)}*\n🔴 Frais retenus : *${fmt(remboursement.montantRetenu)}*\n\nPolitique applicable : ${remboursement.tranche}\n\nNotre équipe vous contactera dans les 48h pour finaliser. Equipe L&Lui Signature`

  await sendWhatsApp(u.whatsapp, msg)

  return NextResponse.json({
    annulation_id,
    ...remboursement,
    montant_verse: montantVerse,
  })
}

// PATCH — confirmer le traitement du remboursement
export async function PATCH(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { annulation_id, statut } = await req.json()
  if (!annulation_id || !statut) {
    return NextResponse.json({ error: 'annulation_id et statut requis' }, { status: 400 })
  }

  const db = getDb()
  const annulDoc = await db.collection('annulations_mariage').doc(annulation_id).get()
  if (!annulDoc.exists) return NextResponse.json({ error: 'Annulation introuvable' }, { status: 404 })

  const a = annulDoc.data()!

  await db.collection('annulations_mariage').doc(annulation_id).update({
    statut,
    date_traitement: Timestamp.now(),
  })

  if (statut === 'rembourse') {
    await db.collection('portail_users').doc(a.marie_uid).update({
      statut_contrat: 'annule_rembourse',
    })
    const msg = `*L&Lui Signature* - Remboursement confirmé\n\nBonjour ${a.noms_maries},\n\nVotre remboursement de *${fmt(a.montant_rembourse)}* a été traité.\n\nN° dossier : ${annulation_id}\n\nNous espérons vous accueillir à nouveau. Equipe L&Lui Signature`
    await sendWhatsApp(a.whatsapp, msg)
  }

  return NextResponse.json({ success: true })
}

// GET — liste annulations (filtrables par marie_uid)
export async function GET(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const marie_uid = req.nextUrl.searchParams.get('marie_uid')
  const db = getDb()

  let q = db.collection('annulations_mariage').orderBy('date_demande', 'desc') as any
  if (marie_uid) q = q.where('marie_uid', '==', marie_uid)

  const snap = await q.limit(50).get()
  const annulations = snap.docs.map((d: any) => ({
    ...d.data(),
    date_demande: d.data().date_demande?.toDate?.()?.toISOString() ?? null,
    date_traitement: d.data().date_traitement?.toDate?.()?.toISOString() ?? null,
    date_mariage: d.data().date_mariage?.toDate?.()?.toISOString() ?? null,
  }))

  return NextResponse.json({ annulations })
}
