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

function checkAdminAuth(session: string | undefined): boolean {
  if (!session) return false
  const token = process.env.ADMIN_SESSION_TOKEN
  // Si le token env est configuré, le cookie doit correspondre exactement
  // Si non configuré (dev sans .env), on accepte tout cookie non vide
  // (le middleware a déjà validé l'accès à /admin/*)
  return !token || session === token
}

export async function POST(req: Request) {
  // Auth : cookie admin_session (même logique que middleware.ts)
  const jar = await cookies()
  const session = jar.get('admin_session')?.value
  if (!checkAdminAuth(session)) {
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

    const dateMariageTs = Timestamp.fromDate(new Date(date_mariage))
    const v1Montant = Math.round(budget_previsionnel * 0.3)
    const v2Montant = Math.round(budget_previsionnel * 0.4)
    const v3Montant = Math.round(budget_previsionnel * 0.3)

    const TACHES_TEMPLATE = [
      { titre: 'Confirmer le lieu de réception', statut: 'todo', priorite: 'haute' },
      { titre: 'Signer le contrat traiteur', statut: 'todo', priorite: 'haute' },
      { titre: 'Finaliser la liste des invités', statut: 'todo', priorite: 'moyenne' },
      { titre: 'Choisir les hébergements', statut: 'todo', priorite: 'moyenne' },
      { titre: 'Envoyer les invitations', statut: 'todo', priorite: 'basse' },
    ]

    await db.collection('portail_users').doc(uid).set({
      uid,
      marie_uid: uid,
      role: 'MARIÉ',
      noms_maries,
      whatsapp,
      grade: 'START',
      rev_lifetime: 0,
      code_promo: code,

      // Identité mariage
      date_mariage: dateMariageTs,
      lieu,

      // Financier
      budget_total: budget_previsionnel,
      budget_categories: {
        traiteur: 0,
        decoration: 0,
        hebergement: 0,
        beaute: 0,
        photographie: 0,
        autres: 0,
      },
      cagnotte_cash: 0,
      cagnotte_credits: 0,
      wallets: { cash: 0, credits_services: 0 },

      // Versements 30/40/30
      versements: {
        v1: { label: 'Acompte 30%', montant: v1Montant, statut: 'en_attente' },
        v2: { label: 'Versement 40%', montant: v2Montant, statut: 'en_attente' },
        v3: { label: 'Solde 30%', montant: v3Montant, statut: 'en_attente' },
      },

      // Prestataires (template)
      prestataires: [
        { nom: 'L&Lui Signature', statut: 'confirme', type: 'wedding_planner' },
        { nom: 'Photographe', statut: 'a_confirmer', type: 'photo' },
        { nom: 'Traiteur', statut: 'a_confirmer', type: 'traiteur' },
      ],

      // Invités
      nb_invites_prevus: nombre_invites_prevu,
      invites_confirmes: 0,
      invites: [],

      // Tâches (template admin — pour référence et dashboard)
      taches: TACHES_TEMPLATE,

      fast_start: {
        enrolled_at: Timestamp.fromDate(now),
        deadline_30j: Timestamp.fromDate(deadline30),
        deadline_60j: Timestamp.fromDate(deadline60),
        deadline_90j: Timestamp.fromDate(deadline90),
      },
      projet: {
        nom: `Mariage ${noms_maries}`,
        date_evenement: dateMariageTs,
        lieu,
        budget_previsionnel,
        nombre_invites_prevu,
      },

      actif: true,
      derniere_connexion: null,
      created_at: FieldValue.serverTimestamp(),
      created_by: 'admin',
    })

    // Seeder la sous-collection todos depuis le template (tâches interactives portail)
    const TODOS_SEED = [
      { libelle: 'Confirmer le lieu de réception', done: false, rev: 50, priorite: 'haute' },
      { libelle: 'Signer le contrat traiteur', done: false, rev: 50, priorite: 'haute' },
      { libelle: 'Finaliser la liste des invités', done: false, rev: 30, priorite: 'moyenne' },
      { libelle: 'Choisir les hébergements', done: false, rev: 30, priorite: 'moyenne' },
      { libelle: 'Envoyer les invitations', done: false, rev: 20, priorite: 'basse' },
    ]
    const batch = db.batch()
    for (const t of TODOS_SEED) {
      const ref = db.collection('portail_users').doc(uid).collection('todos').doc()
      batch.set(ref, { ...t, created_at: FieldValue.serverTimestamp() })
    }
    await batch.commit()

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
