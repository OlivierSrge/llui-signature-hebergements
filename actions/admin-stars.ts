'use server'
// actions/admin-stars.ts
// Crédit/débit Stars manuel par admin + recherche client

import { db } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { serializeFirestoreDoc } from '@/lib/serialization'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'

function gradeFromStars(stars: number): string {
  if (stars >= 10000) return 'DIAMANT'
  if (stars >= 5000)  return 'SAPHIR'
  if (stars >= 2000)  return 'OR'
  if (stars >= 500)   return 'ARGENT'
  if (stars >= 100)   return 'BRONZE'
  return 'START'
}

async function sendWhatsApp(to: string, message: string): Promise<void> {
  await fetch(`${APP_URL}/api/whatsapp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.ADMIN_API_KEY}` },
    body: JSON.stringify({ to, message }),
  }).catch((e) => console.warn('[admin-stars sendWhatsApp]', e))
}

/** Retourne toutes les variantes possibles d'un numéro camérounais */
function phoneFormats(telephone: string): string[] {
  const raw = telephone.trim().replace(/\s/g, '')
  const digits = raw.replace(/\D/g, '')
  const without237 = digits.startsWith('237') ? digits.slice(3) : digits
  const with237 = digits.startsWith('237') ? digits : `237${digits}`
  return [...new Set([raw, digits, without237, with237, `+${with237}`])]
}

/** Cherche un doc clients_fidelite en testant plusieurs formats de numéro */
async function findClientDoc(telephone: string) {
  const formats = phoneFormats(telephone)

  // 1) Essai en parallèle par doc ID (le plus rapide)
  const snaps = await Promise.all(
    formats.map((f) => db.collection('clients_fidelite').doc(f).get()),
  )
  const byId = snaps.find((s) => s.exists)
  if (byId) return byId

  // 2) Requête par champ telephone (au cas où le doc ID diffère)
  const fieldSnap = await db.collection('clients_fidelite')
    .where('telephone', 'in', formats.slice(0, 10))
    .limit(1)
    .get()
  if (!fieldSnap.empty) return fieldSnap.docs[0]

  return null
}

export interface ClientStarsInfo {
  uid: string
  prenom: string
  nom: string
  telephone: string
  points_stars: number
  total_stars_historique: number
  grade_actuel: string
}

// ─── rechercherClientStars ────────────────────────────────────────────────────

export async function rechercherClientStars(telephone: string): Promise<ClientStarsInfo | null> {
  const doc = await findClientDoc(telephone)
  if (!doc) return null
  const s = serializeFirestoreDoc(doc.data()!)
  const totalHist = (s.total_stars_historique as number) ?? 0
  return {
    uid: doc.id,
    prenom: (s.prenom as string) ?? '',
    nom: (s.nom as string) ?? '',
    telephone: doc.id,
    points_stars: (s.points_stars as number) ?? 0,
    total_stars_historique: totalHist,
    grade_actuel: gradeFromStars(totalHist),
  }
}

// ─── creditStarsManuel ────────────────────────────────────────────────────────

export interface CreditStarsParams {
  telephone: string
  prenom: string
  nom: string
  montant_stars: number  // positif = crédit, négatif = débit
  motif: string
}

export interface CreditStarsResult {
  success: boolean
  error?: string
  client_nom?: string
  nouveau_solde?: number
  nouveau_grade?: string
}

export async function creditStarsManuel(params: CreditStarsParams): Promise<CreditStarsResult> {
  const { telephone, montant_stars, motif } = params
  if (!motif?.trim()) return { success: false, error: 'Motif obligatoire' }
  if (montant_stars === 0) return { success: false, error: 'Montant doit être différent de 0' }

  // Trouver le doc réel (multi-format)
  const existingDoc = await findClientDoc(telephone)
  if (!existingDoc) return { success: false, error: 'Client introuvable' }

  const clientRef = existingDoc.ref

  try {
    let nouveauSolde = 0
    let nouveauGrade = 'START'
    let clientNom = ''

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(clientRef)
      if (!snap.exists) throw new Error('Client introuvable')

      const d = snap.data()!
      const pointsActuels: number = (d.points_stars as number) ?? 0
      const histActuel: number = (d.total_stars_historique as number) ?? 0
      const prenom: string = (d.prenom as string) ?? ''
      const nom: string = (d.nom as string) ?? ''
      clientNom = `${prenom} ${nom}`.trim()

      if (montant_stars < 0 && pointsActuels + montant_stars < 0) {
        throw new Error(`Solde insuffisant (${pointsActuels} Stars disponibles)`)
      }

      const newPoints = pointsActuels + montant_stars
      const newHist = Math.max(0, histActuel + montant_stars)
      nouveauGrade = gradeFromStars(newHist)
      nouveauSolde = newPoints

      tx.update(clientRef, {
        points_stars: FieldValue.increment(montant_stars),
        total_stars_historique: newHist,
        updated_at: FieldValue.serverTimestamp(),
      })

      const txRef = db.collection('transactions_fidelite').doc()
      tx.set(txRef, {
        client_id: clientRef.id,
        partenaire_id: 'admin',
        code_session: 'admin-manuel',
        type: montant_stars > 0 ? 'credit_admin' : 'debit_admin',
        montant_stars: Math.abs(montant_stars),
        stars_gagnees: montant_stars,
        montant_brut: 0,
        remise_appliquee: 0,
        montant_net: 0,
        remise_pct: 0,
        multiplier: 1,
        valeur_star_fcfa: 0,
        motif: motif.trim(),
        status: 'confirmed',
        confirmed_at: FieldValue.serverTimestamp(),
        created_at: FieldValue.serverTimestamp(),
      })
    })

    // Notif WhatsApp client non-bloquante
    const clientSnap = await clientRef.get()
    const clientPhone = (clientSnap.data()?.telephone as string) ?? clientRef.id
    const verb = montant_stars > 0 ? `reçu +${montant_stars}` : `déduit ${montant_stars}`
    await sendWhatsApp(
      clientPhone,
      `⭐ L&Lui Stars — Mise à jour de votre compte\n${verb} Stars par L&Lui Signature.\nMotif : ${motif}\nNouveau solde : ${nouveauSolde} Stars\nGrade : ${nouveauGrade}`,
    )

    return { success: true, client_nom: clientNom, nouveau_solde: nouveauSolde, nouveau_grade: nouveauGrade }
  } catch (e: unknown) {
    console.error('[creditStarsManuel]', e)
    return { success: false, error: e instanceof Error ? e.message : 'Erreur interne' }
  }
}
