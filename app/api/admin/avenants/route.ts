// app/api/admin/avenants/route.ts — #126 Avenants et modifications contrat
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb, getStorageBucket } from '@/lib/firebase'
import { Timestamp } from 'firebase-admin/firestore'
import { sendWhatsApp } from '@/lib/whatsappNotif'

function isAdmin(): boolean {
  return cookies().get('admin_session')?.value === process.env.ADMIN_SESSION_TOKEN
}
function genOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}
function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

// POST — créer un avenant suite à changement de pack
export async function POST(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { marie_uid, nouveau_pack, nouveau_montant, motif } = await req.json()
  if (!marie_uid || !nouveau_pack || nouveau_montant == null) {
    return NextResponse.json({ error: 'marie_uid, nouveau_pack, nouveau_montant requis' }, { status: 400 })
  }

  const db = getDb()
  const userDoc = await db.collection('portail_users').doc(marie_uid).get()
  if (!userDoc.exists) return NextResponse.json({ error: 'Marié introuvable' }, { status: 404 })

  const u = userDoc.data()!
  const ancien_pack = u.pack_nom || u.pack || 'Non défini'
  const ancien_montant = u.montant_total || u.budget_total || 0
  const diff = nouveau_montant - ancien_montant

  // Récupérer contrat actif
  const contrat_ref = u.contrat_actif
  if (!contrat_ref) {
    return NextResponse.json({ error: 'Aucun contrat actif trouvé — générez d\'abord un contrat #125' }, { status: 400 })
  }

  const avenant_id = `AVENANT-${marie_uid.slice(0, 6).toUpperCase()}-${Date.now()}`
  const otp = genOTP()

  // Stocker OTP avenant
  await db.collection('contrats_otp').doc(avenant_id).set({
    contrat_id: avenant_id,
    marie_uid,
    otp,
    type: 'avenant',
    expires_at: Timestamp.fromDate(new Date(Date.now() + 24 * 3600 * 1000)),
    created_at: Timestamp.now(),
    used: false,
  })

  // Créer avenant dans Firestore
  await db.collection('avenants_mariage').doc(avenant_id).set({
    avenant_id,
    marie_uid,
    contrat_parent: contrat_ref,
    noms_maries: u.noms_maries,
    whatsapp: u.whatsapp,
    ancien_pack,
    ancien_montant,
    nouveau_pack,
    nouveau_montant,
    diff_montant: diff,
    motif: motif || 'Changement de pack',
    statut: 'en_attente_signature',
    date_creation: Timestamp.now(),
    pdf_url: null,
    signed_at: null,
  })

  // Envoyer OTP WhatsApp
  const diffText = diff > 0
    ? `Supplément à régler : *+${fmt(diff)}*`
    : diff < 0
    ? `Remboursement prévu : *${fmt(Math.abs(diff))}*`
    : 'Montant inchangé'

  const msg = `*L&Lui Signature* - Avenant de contrat\n\nBonjour ${u.noms_maries},\n\nUn avenant N° *${avenant_id}* a été généré suite à la modification de votre pack.\n\n• Ancien pack : *${ancien_pack}* (${fmt(ancien_montant)})\n• Nouveau pack : *${nouveau_pack}* (${fmt(nouveau_montant)})\n• ${diffText}\n• Motif : ${motif || 'Changement de pack'}\n\nCode OTP pour signer l'avenant :\n\n*${otp}*\n\nCode valable 24h.`

  await sendWhatsApp(u.whatsapp, msg)

  return NextResponse.json({ avenant_id, diff_montant: diff, message: 'Avenant créé, OTP envoyé' })
}

// PATCH — valider OTP + archiver PDF avenant
export async function PATCH(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { avenant_id, otp, pdf_base64 } = await req.json()
  if (!avenant_id || !otp || !pdf_base64) {
    return NextResponse.json({ error: 'avenant_id, otp, pdf_base64 requis' }, { status: 400 })
  }

  const db = getDb()
  const otpDoc = await db.collection('contrats_otp').doc(avenant_id).get()
  if (!otpDoc.exists) return NextResponse.json({ error: 'OTP introuvable' }, { status: 404 })

  const od = otpDoc.data()!
  if (od.used) return NextResponse.json({ error: 'OTP déjà utilisé' }, { status: 400 })
  if (od.otp !== otp) return NextResponse.json({ error: 'Code OTP incorrect' }, { status: 400 })
  if (od.expires_at.toDate() < new Date()) {
    return NextResponse.json({ error: 'OTP expiré' }, { status: 400 })
  }

  // Archiver PDF
  const buffer = Buffer.from(pdf_base64.replace(/^data:application\/pdf;base64,/, ''), 'base64')
  const filename = `avenants/${od.marie_uid}/${avenant_id}.pdf`
  const bucket = getStorageBucket()
  const fileRef = bucket.file(filename)
  await fileRef.save(buffer, { metadata: { contentType: 'application/pdf' } })
  try { await fileRef.makePublic() } catch { /* privé */ }
  const pdf_url = `https://storage.googleapis.com/${bucket.name}/${filename}`

  // MAJ avenant + portail_users
  const avDoc = await db.collection('avenants_mariage').doc(avenant_id).get()
  const av = avDoc.data()!

  await db.collection('avenants_mariage').doc(avenant_id).update({
    statut: 'signe',
    pdf_url,
    signed_at: Timestamp.now(),
  })
  await db.collection('portail_users').doc(od.marie_uid).update({
    pack_nom: av.nouveau_pack,
    montant_total: av.nouveau_montant,
    dernier_avenant: avenant_id,
  })
  await db.collection('contrats_otp').doc(avenant_id).update({ used: true })

  // Confirmation WhatsApp
  const confirmMsg = `*L&Lui Signature* - Avenant signé\n\nBonjour ${av.noms_maries},\n\nVotre avenant N° *${avenant_id}* a été signé.\n\nNouveau pack : *${av.nouveau_pack}* - ${fmt(av.nouveau_montant)}\n\nDocument : ${pdf_url}\n\nEquipe L&Lui Signature`
  await sendWhatsApp(av.whatsapp, confirmMsg)

  return NextResponse.json({ success: true, pdf_url })
}

// GET — liste avenants d'un marié
export async function GET(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const marie_uid = req.nextUrl.searchParams.get('marie_uid')
  const db = getDb()

  let q = db.collection('avenants_mariage').orderBy('date_creation', 'desc') as any
  if (marie_uid) q = q.where('marie_uid', '==', marie_uid)

  const snap = await q.limit(20).get()
  const avenants = snap.docs.map((d: any) => ({
    ...d.data(),
    date_creation: d.data().date_creation?.toDate?.()?.toISOString() ?? null,
    signed_at: d.data().signed_at?.toDate?.()?.toISOString() ?? null,
  }))

  return NextResponse.json({ avenants })
}
