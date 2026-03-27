// app/api/admin/registre-legal/route.ts — #128 Registre légal événements Kribi
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'
import { Timestamp } from 'firebase-admin/firestore'
import { sendWhatsApp } from '@/lib/whatsappNotif'

function isAdmin(): boolean {
  return cookies().get('admin_session')?.value === process.env.ADMIN_SESSION_TOKEN
}

// GET — liste des registres légaux (tous ou filtré par marie_uid)
export async function GET(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const marie_uid = req.nextUrl.searchParams.get('marie_uid')
  const db = getDb()

  let q = db.collection('registre_legal').orderBy('date_creation', 'desc') as any
  if (marie_uid) q = q.where('marie_uid', '==', marie_uid)

  const snap = await q.limit(100).get()
  const registres = snap.docs.map((d: any) => ({
    id: d.id,
    ...d.data(),
    date_creation: d.data().date_creation?.toDate?.()?.toISOString() ?? null,
    date_mariage: d.data().date_mariage?.toDate?.()?.toISOString() ?? null,
    date_rappel_j45: d.data().date_rappel_j45?.toDate?.()?.toISOString() ?? null,
  }))

  return NextResponse.json({ registres })
}

// POST — créer ou MAJ le registre légal d'un mariage
export async function POST(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { marie_uid, autorisations } = await req.json()
  if (!marie_uid) return NextResponse.json({ error: 'marie_uid requis' }, { status: 400 })

  const db = getDb()
  const userDoc = await db.collection('portail_users').doc(marie_uid).get()
  if (!userDoc.exists) return NextResponse.json({ error: 'Marié introuvable' }, { status: 404 })

  const u = userDoc.data()!
  const dateMariage = u.date_mariage?.toDate?.() ?? new Date(u.date_mariage)
  const rappelJ45 = new Date(dateMariage.getTime() - 45 * 24 * 60 * 60 * 1000)

  const registreId = `REG-${marie_uid}`
  await db.collection('registre_legal').doc(registreId).set({
    registre_id: registreId,
    marie_uid,
    noms_maries: u.noms_maries,
    whatsapp: u.whatsapp,
    date_mariage: u.date_mariage,
    lieu: u.lieu || 'Kribi',
    autorisations: autorisations || [],
    date_creation: Timestamp.now(),
    date_rappel_j45: Timestamp.fromDate(rappelJ45),
    rappel_j45_envoye: false,
  }, { merge: true })

  return NextResponse.json({ registre_id: registreId, rappel_j45: rappelJ45.toISOString() })
}

// PATCH — cocher/décocher une autorisation ou envoyer rappel WhatsApp
export async function PATCH(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { registre_id, autorisations, envoyer_rappel } = await req.json()
  if (!registre_id) return NextResponse.json({ error: 'registre_id requis' }, { status: 400 })

  const db = getDb()
  const regDoc = await db.collection('registre_legal').doc(registre_id).get()
  if (!regDoc.exists) return NextResponse.json({ error: 'Registre introuvable' }, { status: 404 })

  const r = regDoc.data()!
  const updates: Record<string, unknown> = {}

  if (autorisations !== undefined) updates.autorisations = autorisations

  if (envoyer_rappel) {
    const manquantes = (autorisations || r.autorisations || [])
      .filter((a: { valide: boolean; label: string }) => !a.valide)
      .map((a: { label: string }) => `• ${a.label}`)
      .join('\n')

    const msg = `*L&Lui Signature* - Rappel autorisations J-45\n\nBonjour Equipe L&Lui,\n\nMariage de *${r.noms_maries}* le ${new Date(r.date_mariage?.toDate?.() ?? r.date_mariage).toLocaleDateString('fr-FR')} à ${r.lieu}.\n\nAutorisations en attente :\n${manquantes || 'Toutes les autorisations sont validées ✅'}\n\nMerci de régulariser dans les meilleurs délais.`

    await sendWhatsApp(process.env.ADMIN_WHATSAPP || r.whatsapp, msg)
    updates.rappel_j45_envoye = true
    updates.rappel_j45_date = Timestamp.now()
  }

  await db.collection('registre_legal').doc(registre_id).update(updates)
  return NextResponse.json({ success: true })
}
