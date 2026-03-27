// app/api/admin/white-label/route.ts — #148 White label multi-agence
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'
import { Timestamp } from 'firebase-admin/firestore'

function isAdmin(): boolean {
  const session = cookies().get('admin_session')?.value
  if (!session) return false
  const token = process.env.ADMIN_SESSION_TOKEN
  return !token || session === token
}

const AGENCES_DEFAUT = [
  {
    agence_id: 'kribi',
    nom: 'L&Lui Signature Kribi',
    ville: 'Kribi',
    region: 'Sud',
    sous_domaine: 'kribi',
    couleur_primaire: '#C9A84C',
    whatsapp_contact: '',
    email_contact: 'kribi@llui-signature.com',
    actif: true,
    is_master: true,
  },
  {
    agence_id: 'limbe',
    nom: 'L&Lui Signature Limbe',
    ville: 'Limbe',
    region: 'Sud-Ouest',
    sous_domaine: 'limbe',
    couleur_primaire: '#4C9BC9',
    whatsapp_contact: '',
    email_contact: 'limbe@llui-signature.com',
    actif: false,
    is_master: false,
  },
  {
    agence_id: 'bafoussam',
    nom: 'L&Lui Signature Bafoussam',
    ville: 'Bafoussam',
    region: 'Ouest',
    sous_domaine: 'bafoussam',
    couleur_primaire: '#C97E4C',
    whatsapp_contact: '',
    email_contact: 'bafoussam@llui-signature.com',
    actif: false,
    is_master: false,
  },
  {
    agence_id: 'ebolowa',
    nom: 'L&Lui Signature Ebolowa',
    ville: 'Ebolowa',
    region: 'Sud',
    sous_domaine: 'ebolowa',
    couleur_primaire: '#6AC94C',
    whatsapp_contact: '',
    email_contact: 'ebolowa@llui-signature.com',
    actif: false,
    is_master: false,
  },
]

// GET — liste des agences white label
export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const db = getDb()
  const snap = await db.collection('agences_white_label').get()

  if (snap.empty) {
    // Seed les agences par défaut
    const batch = db.batch()
    for (const agence of AGENCES_DEFAUT) {
      batch.set(db.collection('agences_white_label').doc(agence.agence_id), {
        ...agence,
        nb_maries: 0,
        revenus_total: 0,
        created_at: Timestamp.now(),
      })
    }
    await batch.commit()
    return NextResponse.json({ agences: AGENCES_DEFAUT })
  }

  const agences = snap.docs.map((d) => ({
    ...d.data(),
    created_at: d.data().created_at?.toDate?.()?.toISOString() ?? null,
  }))

  return NextResponse.json({ agences })
}

// POST — créer une nouvelle agence
export async function POST(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const { agence_id, nom, ville, region, sous_domaine, couleur_primaire, whatsapp_contact, email_contact } = body

  if (!agence_id || !nom || !ville) {
    return NextResponse.json({ error: 'agence_id, nom et ville requis' }, { status: 400 })
  }

  const db = getDb()
  await db.collection('agences_white_label').doc(agence_id).set({
    agence_id,
    nom,
    ville,
    region: region || '',
    sous_domaine: sous_domaine || agence_id,
    couleur_primaire: couleur_primaire || '#C9A84C',
    whatsapp_contact: whatsapp_contact || '',
    email_contact: email_contact || '',
    actif: false,
    is_master: false,
    nb_maries: 0,
    revenus_total: 0,
    created_at: Timestamp.now(),
  })

  return NextResponse.json({ success: true, agence_id })
}

// PATCH — activer/désactiver une agence ou MAJ ses paramètres
export async function PATCH(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { agence_id, ...updates } = await req.json()
  if (!agence_id) return NextResponse.json({ error: 'agence_id requis' }, { status: 400 })

  const db = getDb()
  await db.collection('agences_white_label').doc(agence_id).update(updates)
  return NextResponse.json({ success: true })
}
