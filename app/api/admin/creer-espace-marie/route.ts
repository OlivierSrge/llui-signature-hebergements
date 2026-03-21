// app/api/admin/creer-espace-marie/route.ts
// POST — Création complète espace marié : uid + code promo + Firestore + WhatsApp

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'
import { Timestamp, FieldValue } from 'firebase-admin/firestore'
import { generateCodePromo } from '@/lib/generatePromoCode'
import { sendWhatsApp } from '@/lib/whatsappNotif'

export const dynamic = 'force-dynamic'

interface Body {
  noms_maries: string
  whatsapp: string
  date_mariage: string
  lieu: string
  budget_previsionnel?: number
  nombre_invites_prevu?: number
}

function genUid(noms_maries: string): string {
  const annee = new Date().getFullYear()
  const slug = noms_maries
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s&]/g, '')
    .replace(/\s*&\s*/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
  return `mariage_${slug}_${annee}`
}

async function genUniqueCode(noms_maries: string, uid: string, db: FirebaseFirestore.Firestore): Promise<string> {
  const base = generateCodePromo(noms_maries, uid)
  const existing = await db.collection('codes_promos').doc(base).get()
  if (!existing.exists) return base
  const suffix = ['A', 'B', 'C', 'D']
  for (const s of suffix) {
    const alt = `${base}-${s}`
    const check = await db.collection('codes_promos').doc(alt).get()
    if (!check.exists) return alt
  }
  return `${base}-${Date.now().toString(36).toUpperCase()}`
}

export async function POST(req: Request) {
  // Auth : cookie admin_session (même logique que middleware.ts)
  const jar = await cookies()
  const session = jar.get('admin_session')?.value
  if (!session || session !== process.env.ADMIN_SESSION_TOKEN) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body: Body = await req.json()
    const { noms_maries, whatsapp, date_mariage, lieu, budget_previsionnel = 0, nombre_invites_prevu = 0 } = body

    if (!noms_maries || !whatsapp || !date_mariage || !lieu) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    const db = getDb()
    const now = new Date()

    // ÉTAPE A — UID
    const uid = genUid(noms_maries)

    // ÉTAPE B+C — Code unique + vérification unicité
    const existing = await db.collection('portail_users').doc(uid).get()
    if (existing.exists) {
      return NextResponse.json({ error: 'Un espace marié avec ces noms existe déjà', uid }, { status: 409 })
    }
    const code = await genUniqueCode(noms_maries, uid, db)

    // ÉTAPE D — Créer portail_users/{uid}
    const deadline30 = new Date(now); deadline30.setDate(now.getDate() + 30)
    const deadline60 = new Date(now); deadline60.setDate(now.getDate() + 60)
    const deadline90 = new Date(now); deadline90.setDate(now.getDate() + 90)

    await db.collection('portail_users').doc(uid).set({
      uid, role: 'MARIÉ', noms_maries, whatsapp,
      grade: 'START', rev_lifetime: 0,
      code_promo: code,
      wallets: { cash: 0, credits_services: 0 },
      fast_start: {
        enrolled_at: Timestamp.fromDate(now),
        deadline_30j: Timestamp.fromDate(deadline30),
        deadline_60j: Timestamp.fromDate(deadline60),
        deadline_90j: Timestamp.fromDate(deadline90),
      },
      projet: {
        nom: `Mariage ${noms_maries}`,
        date_evenement: Timestamp.fromDate(new Date(date_mariage)),
        lieu, budget_previsionnel, nombre_invites_prevu,
      },
      invites_confirmes: 0, actif: true,
      created_at: FieldValue.serverTimestamp(),
      created_by: 'admin',
    })

    // ÉTAPE E — Écrire dans codes_promos
    await db.collection('codes_promos').doc(code).set({
      code, mariage_uid: uid, noms_maries, date_mariage, whatsapp,
      actif: true, ca_total: 0,
      created_at: FieldValue.serverTimestamp(),
    })

    // ÉTAPE G — WhatsApp automatique
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'
    const message = `Bonjour ${noms_maries} 💛\nVotre espace mariage L&Lui Signature est prêt !\n\n🔑 Identifiant de connexion :\n${uid}\n\n🌐 Accédez à votre espace :\n${appUrl}/portail/login\n\n🎁 Votre code privilège :\n${code}\n\nCe code vous permettra de suivre toutes vos commandes et réservations. Partagez-le avec vos invités pour alimenter votre cagnotte mariage.\n\nAvec toute notre attention 💛\nL&Lui Signature\n+237 693 407 964`

    const waResult = await sendWhatsApp(whatsapp, message)

    return NextResponse.json({
      success: true, uid, code_promo: code,
      whatsapp_sent: waResult.success,
      sheets_updated: false,
      portail_url: '/portail/login',
      message: 'Espace créé et accès envoyés',
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
