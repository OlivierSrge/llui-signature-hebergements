// app/api/admin/prestataires/route.ts — CRUD prestataires (admin)
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'
import { Timestamp } from 'firebase-admin/firestore'
import { sendWhatsApp } from '@/lib/whatsappNotif'

function isAdmin(): boolean {
  return cookies().get('admin_session')?.value === process.env.ADMIN_SESSION_TOKEN
}

// GET — liste des prestataires
export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const db = getDb()
  const snap = await db.collection('prestataires').orderBy('nom').get()
  const prestataires = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    created_at: d.data().created_at?.toDate?.()?.toISOString() ?? null,
    derniere_connexion: d.data().derniere_connexion?.toDate?.()?.toISOString() ?? null,
  }))

  return NextResponse.json({ prestataires })
}

// POST — créer un prestataire
export async function POST(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { nom, type, email, telephone, pin, specialites, tarif_journalier, certifie } = await req.json()
  if (!nom || !type || !email || !pin) {
    return NextResponse.json({ error: 'nom, type, email, pin requis' }, { status: 400 })
  }

  const db = getDb()
  const id = `prest_${Date.now()}`
  await db.collection('prestataires').doc(id).set({
    id,
    nom,
    type, // photographe | dj | traiteur | decoration | autre
    email: email.toLowerCase().trim(),
    telephone: telephone || '',
    pin,
    specialites: specialites || [],
    tarif_journalier: tarif_journalier || 0,
    certifie: certifie || false,
    statut: 'actif', // actif | suspendu
    role: 'prestataire',
    created_at: Timestamp.now(),
    derniere_connexion: null,
  })

  // Notification WhatsApp de bienvenue
  if (telephone) {
    const msg = `*L&Lui Signature* - Bienvenue !\n\nBonjour *${nom}*,\n\nVotre compte prestataire L&Lui Signature a été créé.\n\n🔑 Email : ${email}\n🔒 PIN : ${pin}\n\nAccédez à votre portail : https://llui-signature-hebergements.vercel.app/portail-prestataire\n\nEquipe L&Lui Signature`
    await sendWhatsApp(telephone, msg).catch(() => {})
  }

  return NextResponse.json({ id, message: 'Prestataire créé' })
}

// PATCH — modifier un prestataire (certifier, suspendre, assigner à un mariage)
export async function PATCH(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id, marie_uid, brief, ...updates } = await req.json()
  if (!id) return NextResponse.json({ error: 'id prestataire requis' }, { status: 400 })

  const db = getDb()

  // MAJ prestataire
  if (Object.keys(updates).length > 0) {
    await db.collection('prestataires').doc(id).update(updates)
  }

  // Assigner à un mariage avec brief
  if (marie_uid) {
    await db.collection('portail_users').doc(marie_uid).update({
      prestataires_assignes: require('firebase-admin/firestore').FieldValue.arrayUnion(id),
      [`briefs_prestataires.${id}`]: brief || '',
    })

    // Notifier le prestataire
    const prestDoc = await db.collection('prestataires').doc(id).get()
    const prest = prestDoc.data()!
    const userDoc = await db.collection('portail_users').doc(marie_uid).get()
    const user = userDoc.data()!

    if (prest.telephone) {
      const msg = `*L&Lui Signature* - Nouveau dossier\n\nBonjour ${prest.nom},\n\nVous avez été assigné au mariage de *${user.noms_maries}*.\n\nDate : ${new Date(user.date_mariage?.toDate?.() ?? user.date_mariage).toLocaleDateString('fr-FR')}\nLieu : ${user.lieu || 'Kribi'}\n\n${brief ? 'Brief : ' + brief + '\n\n' : ''}Connectez-vous à votre portail pour confirmer.`
      await sendWhatsApp(prest.telephone, msg).catch(() => {})
    }
  }

  return NextResponse.json({ success: true })
}

// DELETE — supprimer un prestataire
export async function DELETE(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const db = getDb()
  await db.collection('prestataires').doc(id).delete()
  return NextResponse.json({ success: true })
}
