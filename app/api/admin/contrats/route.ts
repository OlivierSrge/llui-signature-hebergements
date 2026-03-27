// app/api/admin/contrats/route.ts
// Génère, envoie OTP et archive le contrat mariage
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb, getStorageBucket } from '@/lib/firebase'
import { Timestamp } from 'firebase-admin/firestore'
import { sendWhatsApp } from '@/lib/whatsappNotif'

function isAdmin(): boolean {
  const session = cookies().get('admin_session')?.value
  if (!session) return false
  const token = process.env.ADMIN_SESSION_TOKEN
  return !token || session === token
}

function genOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// POST /api/admin/contrats — génère le PDF + envoie OTP
export async function POST(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { marie_uid, clauses_supplementaires } = await req.json()
  if (!marie_uid) return NextResponse.json({ error: 'marie_uid requis' }, { status: 400 })

  const db = getDb()
  const doc = await db.collection('portail_users').doc(marie_uid).get()
  if (!doc.exists) return NextResponse.json({ error: 'Marié introuvable' }, { status: 404 })

  const d = doc.data()!
  const contrat_id = `LLUI-C-${marie_uid.slice(0, 6).toUpperCase()}-${Date.now()}`
  const otp = genOTP()
  const now = new Date().toISOString()

  // Stocker OTP temporaire (expire 24h)
  await db.collection('contrats_otp').doc(contrat_id).set({
    contrat_id,
    marie_uid,
    otp,
    expires_at: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
    created_at: Timestamp.now(),
    used: false,
  })

  // Envoyer OTP WhatsApp
  const montant = d.montant_total || d.budget_total || 0
  const otp_msg = `*L&Lui Signature*\n\nBonjour ${d.noms_maries},\n\nVotre contrat de mariage N° *${contrat_id}* est prêt.\n\nMontant total : *${new Intl.NumberFormat('fr-FR').format(montant)} FCFA*\nDate mariage : *${new Date(d.date_mariage?.toDate?.() ?? d.date_mariage).toLocaleDateString('fr-FR')}*\n\nPour signer électroniquement, utilisez le code OTP :\n\n*${otp}*\n\nCe code expire dans 24h. Ne le partagez pas.`

  await sendWhatsApp(d.whatsapp, otp_msg)

  // Sauvegarder le contrat en attente dans Firestore
  await db.collection('contrats_mariage').doc(contrat_id).set({
    contrat_id,
    marie_uid,
    noms_maries: d.noms_maries,
    whatsapp: d.whatsapp,
    date_mariage: d.date_mariage,
    lieu: d.lieu || 'Kribi',
    pack_nom: d.pack_nom || d.pack || 'Sur mesure',
    montant_total: montant,
    acompte_verse: d.acompte_verse || 0,
    clauses_supplementaires: clauses_supplementaires || '',
    statut: 'en_attente_signature',
    date_generation: Timestamp.now(),
    pdf_url: null,
    signed_at: null,
  })

  return NextResponse.json({ contrat_id, message: 'OTP envoyé par WhatsApp' })
}

// PATCH /api/admin/contrats — valide OTP et archive le PDF
export async function PATCH(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { contrat_id, otp, pdf_base64 } = await req.json()
  if (!contrat_id || !otp || !pdf_base64) {
    return NextResponse.json({ error: 'contrat_id, otp et pdf_base64 requis' }, { status: 400 })
  }

  const db = getDb()
  const otpDoc = await db.collection('contrats_otp').doc(contrat_id).get()
  if (!otpDoc.exists) return NextResponse.json({ error: 'OTP introuvable' }, { status: 404 })

  const otpData = otpDoc.data()!
  if (otpData.used) return NextResponse.json({ error: 'OTP déjà utilisé' }, { status: 400 })
  if (otpData.otp !== otp) return NextResponse.json({ error: 'Code OTP incorrect' }, { status: 400 })
  if (otpData.expires_at.toDate() < new Date()) {
    return NextResponse.json({ error: 'Code OTP expiré' }, { status: 400 })
  }

  // Archiver PDF dans Firebase Storage
  const buffer = Buffer.from(pdf_base64.replace(/^data:application\/pdf;base64,/, ''), 'base64')
  const filename = `contrats_mariage/${otpData.marie_uid}/${contrat_id}.pdf`
  const bucket = getStorageBucket()
  const fileRef = bucket.file(filename)
  await fileRef.save(buffer, { metadata: { contentType: 'application/pdf' } })
  try { await fileRef.makePublic() } catch { /* bucket privé */ }

  const pdf_url = `https://storage.googleapis.com/${bucket.name}/${filename}`

  // Mettre à jour Firestore
  await db.collection('contrats_mariage').doc(contrat_id).update({
    statut: 'signe',
    pdf_url,
    signed_at: Timestamp.now(),
  })
  await db.collection('portail_users').doc(otpData.marie_uid).update({
    contrat_actif: contrat_id,
    contrat_url: pdf_url,
    contrat_signe_at: Timestamp.now(),
  })
  await db.collection('contrats_otp').doc(contrat_id).update({ used: true })

  // Notification WhatsApp confirmation
  const contratDoc = await db.collection('contrats_mariage').doc(contrat_id).get()
  const cd = contratDoc.data()!
  const confirmMsg = `*L&Lui Signature* - Contrat signé\n\nBonjour ${cd.noms_maries},\n\nVotre contrat N° *${contrat_id}* a été signé avec succes. Il est archivé et accessible depuis votre portail.\n\nDocument : ${pdf_url}\n\nMerci de nous faire confiance pour votre grand jour ! Equipe L&Lui Signature`
  await sendWhatsApp(cd.whatsapp, confirmMsg)

  return NextResponse.json({ success: true, pdf_url })
}

// GET /api/admin/contrats?marie_uid=xxx — liste contrats d'un marié
export async function GET(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const marie_uid = req.nextUrl.searchParams.get('marie_uid')
  const db = getDb()

  let query = db.collection('contrats_mariage').orderBy('date_generation', 'desc')
  if (marie_uid) query = query.where('marie_uid', '==', marie_uid) as any

  const snap = await (query as any).limit(50).get()
  const contrats = snap.docs.map((d: any) => ({
    ...d.data(),
    date_generation: d.data().date_generation?.toDate?.()?.toISOString() ?? null,
    signed_at: d.data().signed_at?.toDate?.()?.toISOString() ?? null,
    date_mariage: d.data().date_mariage?.toDate?.()?.toISOString() ?? null,
  }))

  return NextResponse.json({ contrats })
}
