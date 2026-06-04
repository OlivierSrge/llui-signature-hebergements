'use server'

import { db } from '@/lib/firebase'
import { Timestamp, FieldValue } from 'firebase-admin/firestore'
import type { LoyaltyProgram, LoyaltyCard, Niveau } from '@/types/loyalty'
import { calculerPoints, determinerNiveau } from '@/lib/loyalty-logic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'

async function sendWhatsApp(to: string, message: string): Promise<void> {
  await fetch(`${APP_URL}/api/whatsapp/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.ADMIN_API_KEY}`,
    },
    body: JSON.stringify({ to, message }),
  }).catch((e) => console.warn('[loyalty:sendWhatsApp]', e))
}

// ─── Créer un programme de fidélité ─────────────────────────────────────────

export async function createLoyaltyProgram(params: {
  partenaire_id: string
  nom: string
  description: string
  logo_url?: string
  prix_fcfa: number
  prix_eur?: number
  duree_validite_mois: number
  niveaux: Array<{
    nom: string
    couleur: string
    emoji: string
    seuil_points: number
    avantages: string[]
  }>
  commission_lui_percent?: number
  commission_partner_percent?: number
}): Promise<{ success: boolean; program_id?: string; error?: string }> {
  try {
    const commissionLui = params.commission_lui_percent ?? 35
    const commissionPartner = params.commission_partner_percent ?? 65

    if (commissionLui + commissionPartner !== 100) {
      return { success: false, error: 'Commission total doit = 100%' }
    }

    const niveaux: Niveau[] = params.niveaux.map((n, idx) => ({
      id: ['bronze', 'argent', 'or'][idx] ?? `niveau_${idx}`,
      nom: n.nom,
      couleur: n.couleur,
      emoji: n.emoji,
      seuil_points: n.seuil_points,
      avantages: n.avantages,
    }))

    const ref = await db.collection('loyalty_programs').add({
      partenaire_id: params.partenaire_id,
      nom: params.nom,
      description: params.description,
      logo_url: params.logo_url ?? null,
      prix_fcfa: params.prix_fcfa,
      prix_eur: params.prix_eur ?? null,
      duree_validite_mois: params.duree_validite_mois,
      niveaux,
      commission_lui_percent: commissionLui,
      commission_partner_percent: commissionPartner,
      statut: 'ACTIVE',
      created_at: Timestamp.now(),
      created_by: 'admin',
      updated_at: Timestamp.now(),
    })

    console.log(`[Loyalty] Programme créé: ${ref.id} (${params.nom})`)
    return { success: true, program_id: ref.id }
  } catch (error) {
    console.error('[Loyalty] Erreur création programme:', error)
    return { success: false, error: 'Erreur serveur' }
  }
}

// ─── Récupérer les programmes d'un partenaire ────────────────────────────────

export async function getLoyaltyPrograms(partenaire_id: string): Promise<{
  success: boolean
  programs?: (LoyaltyProgram & { program_id: string })[]
  error?: string
}> {
  try {
    const snap = await db
      .collection('loyalty_programs')
      .where('partenaire_id', '==', partenaire_id)
      .get()

    const programs = snap.docs.map((d: any) => ({
      program_id: d.id,
      ...(d.data() as Omit<LoyaltyProgram, 'program_id'>),
    }))

    return { success: true, programs }
  } catch (error) {
    console.error('[Loyalty] Erreur lecture programmes:', error)
    return { success: false, error: 'Erreur serveur' }
  }
}

// ─── Récupérer tous les programmes (admin) ───────────────────────────────────

export async function getAllLoyaltyPrograms(): Promise<{
  success: boolean
  programs?: (LoyaltyProgram & { program_id: string })[]
  error?: string
}> {
  try {
    const snap = await db.collection('loyalty_programs').get()
    const programs = snap.docs.map((d: any) => ({
      program_id: d.id,
      ...(d.data() as Omit<LoyaltyProgram, 'program_id'>),
    }))
    return { success: true, programs }
  } catch (error) {
    console.error('[Loyalty] Erreur lecture tous programmes:', error)
    return { success: false, error: 'Erreur serveur' }
  }
}

// ─── Créer une carte après achat ─────────────────────────────────────────────

export async function createLoyaltyCardAfterPurchase(params: {
  program_id: string
  client_id: string
  client_email: string
  client_nom: string
  montant_achat: number
  order_id?: string
}): Promise<{ success: boolean; card_id?: string; error?: string }> {
  try {
    const programDoc = await db.collection('loyalty_programs').doc(params.program_id).get()
    if (!programDoc.exists) return { success: false, error: 'Programme non trouvé' }
    const program = programDoc.data() as LoyaltyProgram

    // Vérifier qu'il n'y a pas déjà une carte active
    const existante = await db
      .collection('loyalty_cards')
      .where('program_id', '==', params.program_id)
      .where('client_id', '==', params.client_id)
      .where('statut', '==', 'ACTIVE')
      .limit(1)
      .get()

    if (!existante.empty) {
      return { success: false, error: 'Vous avez déjà une carte active pour ce programme' }
    }

    const expiresAt = new Date(
      Date.now() + program.duree_validite_mois * 30 * 24 * 60 * 60 * 1000
    )

    const cardRef = db.collection('loyalty_cards').doc()
    const cardId = cardRef.id

    const commission_partner = Math.round(
      params.montant_achat * (program.commission_partner_percent / 100)
    )
    const commission_lui = params.montant_achat - commission_partner

    await cardRef.set({
      card_id: cardId,
      program_id: params.program_id,
      partenaire_id: program.partenaire_id,
      client_id: params.client_id,
      client_email: params.client_email,
      client_nom: params.client_nom,
      niveau_actuel: program.niveaux[0].id,
      points_cumules: 0,
      nombre_utilisations: 0,
      qr_code_data: `loyalty://${cardId}`,
      qr_code_url: null,
      commission_lui_percent: program.commission_lui_percent,
      commission_partner_percent: program.commission_partner_percent,
      created_at: Timestamp.now(),
      expires_at: Timestamp.fromDate(expiresAt),
      statut: 'ACTIVE',
      order_id: params.order_id ?? null,
      montant_achat: params.montant_achat,
      updated_at: Timestamp.now(),
    })

    // Transaction d'achat
    await db.collection('loyalty_transactions').add({
      card_id: cardId,
      program_id: params.program_id,
      partenaire_id: program.partenaire_id,
      type: 'ACHAT_CARTE',
      points_ajoutes: 0,
      commission_lui,
      commission_partner,
      description: `Achat carte ${program.nom}`,
      created_at: Timestamp.now(),
      created_by: 'system',
    })

    // Créditer wallet partenaire
    await crediterWalletPartenaire(program.partenaire_id, commission_partner, `Vente carte ${program.nom}`)

    console.log(`[Loyalty] Carte créée: ${cardId} pour ${params.client_email}`)
    return { success: true, card_id: cardId }
  } catch (error) {
    console.error('[Loyalty] Erreur création carte:', error)
    return { success: false, error: 'Erreur serveur' }
  }
}

// ─── Ajouter des points (partenaire scanne QR) ───────────────────────────────

export async function addPointsToCard(params: {
  card_id: string
  montant_depense: number
  description?: string
}): Promise<{ success: boolean; new_level?: string; points_ajoutes?: number; error?: string }> {
  try {
    const cardDoc = await db.collection('loyalty_cards').doc(params.card_id).get()
    if (!cardDoc.exists) return { success: false, error: 'Carte non trouvée' }
    const card = cardDoc.data() as LoyaltyCard

    if (card.statut !== 'ACTIVE') return { success: false, error: 'Carte inactive' }

    const programDoc = await db.collection('loyalty_programs').doc(card.program_id).get()
    if (!programDoc.exists) return { success: false, error: 'Programme non trouvé' }
    const program = programDoc.data() as LoyaltyProgram

    const pointsAjoutes = calculerPoints(params.montant_depense)
    const nouveauxPoints = card.points_cumules + pointsAjoutes
    const ancienNiveau = card.niveau_actuel
    const nouveauNiveau = determinerNiveau(nouveauxPoints, program.niveaux)
    const levelChanged = ancienNiveau !== nouveauNiveau

    await db.collection('loyalty_cards').doc(params.card_id).update({
      points_cumules: nouveauxPoints,
      niveau_actuel: nouveauNiveau,
      nombre_utilisations: FieldValue.increment(1),
      updated_at: Timestamp.now(),
    })

    await db.collection('loyalty_transactions').add({
      card_id: params.card_id,
      program_id: card.program_id,
      partenaire_id: card.partenaire_id,
      type: 'POINTS_AJOUTES',
      points_ajoutes: pointsAjoutes,
      montant_depense: params.montant_depense,
      description: params.description ?? `Dépense ${params.montant_depense.toLocaleString('fr-FR')} FCFA`,
      created_at: Timestamp.now(),
      created_by: 'partenaire',
    })

    console.log(`[Loyalty] +${pointsAjoutes} pts sur ${params.card_id} (${card.client_email})`)
    return {
      success: true,
      new_level: levelChanged ? nouveauNiveau : undefined,
      points_ajoutes: pointsAjoutes,
    }
  } catch (error) {
    console.error('[Loyalty] Erreur ajout points:', error)
    return { success: false, error: 'Erreur serveur' }
  }
}

// ─── Récupérer les cartes d'un programme ─────────────────────────────────────

export async function getLoyaltyCards(program_id: string): Promise<{
  success: boolean
  cards?: (LoyaltyCard & { card_id: string })[]
  error?: string
}> {
  try {
    const snap = await db
      .collection('loyalty_cards')
      .where('program_id', '==', program_id)
      .get()

    const cards = snap.docs.map((d: any) => ({
      card_id: d.id,
      ...(d.data() as Omit<LoyaltyCard, 'card_id'>),
    }))

    return { success: true, cards }
  } catch (error) {
    console.error('[Loyalty] Erreur lecture cartes:', error)
    return { success: false, error: 'Erreur serveur' }
  }
}

// ─── Récupérer les transactions d'un programme ───────────────────────────────

export async function getLoyaltyTransactions(
  partenaire_id: string,
  limit = 50
): Promise<{ success: boolean; transactions?: any[]; error?: string }> {
  try {
    const snap = await db
      .collection('loyalty_transactions')
      .where('partenaire_id', '==', partenaire_id)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .get()

    const transactions = snap.docs.map((d: any) => ({
      transaction_id: d.id,
      ...d.data(),
    }))

    return { success: true, transactions }
  } catch (error) {
    console.error('[Loyalty] Erreur lecture transactions:', error)
    return { success: false, error: 'Erreur serveur' }
  }
}

// ─── Récupérer les stats d'un programme ──────────────────────────────────────

export async function getLoyaltyProgramStats(program_id: string): Promise<{
  success: boolean
  stats?: {
    total_cartes: number
    cartes_actives: number
    ca_total: number
    commission_partenaire: number
    points_distribues: number
  }
  error?: string
}> {
  try {
    const [cardsSnap, txSnap] = await Promise.all([
      db.collection('loyalty_cards').where('program_id', '==', program_id).get(),
      db.collection('loyalty_transactions').where('program_id', '==', program_id).get(),
    ])

    const cards: any[] = cardsSnap.docs.map((d: any) => d.data())
    const txs: any[] = txSnap.docs.map((d: any) => d.data())

    const total_cartes = cards.length
    const cartes_actives = cards.filter((c: any) => c.statut === 'ACTIVE').length
    const ca_total = txs
      .filter((t: any) => t.type === 'ACHAT_CARTE')
      .reduce((sum: number, t: any) => sum + (t.commission_lui ?? 0) + (t.commission_partner ?? 0), 0)
    const commission_partenaire = txs
      .filter((t: any) => t.type === 'ACHAT_CARTE')
      .reduce((sum: number, t: any) => sum + (t.commission_partner ?? 0), 0)
    const points_distribues = txs
      .filter((t: any) => t.type === 'POINTS_AJOUTES')
      .reduce((sum: number, t: any) => sum + (t.points_ajoutes ?? 0), 0)

    return { success: true, stats: { total_cartes, cartes_actives, ca_total, commission_partenaire, points_distribues } }
  } catch (error) {
    console.error('[Loyalty] Erreur stats:', error)
    return { success: false, error: 'Erreur serveur' }
  }
}

// ─── Demander un paiement (partenaire) ───────────────────────────────────────

export async function requestLoyaltyPayment(partenaire_id: string): Promise<{
  success: boolean
  montant_total?: number
  error?: string
}> {
  try {
    const walletSnap = await db
      .collection('loyalty_wallets')
      .where('partenaire_id', '==', partenaire_id)
      .limit(1)
      .get()

    if (walletSnap.empty) return { success: false, error: 'Aucun solde trouvé' }

    const wallet = walletSnap.docs[0].data()
    const solde: number = wallet.solde_cash ?? 0

    if (solde <= 0) return { success: false, error: 'Solde insuffisant' }

    await db.collection('loyalty_payment_requests').add({
      partenaire_id,
      montant: solde,
      statut: 'PENDING',
      requested_at: Timestamp.now(),
      processed_at: null,
    })

    console.log(`[Loyalty] Demande paiement: ${partenaire_id} (${solde} FCFA)`)
    return { success: true, montant_total: solde }
  } catch (error) {
    console.error('[Loyalty] Erreur demande paiement:', error)
    return { success: false, error: 'Erreur serveur' }
  }
}

// ─── Approuver un paiement (admin) ───────────────────────────────────────────

export async function approveLoyaltyPayment(params: {
  request_id: string
  partenaire_id: string
  montant: number
}): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection('loyalty_payment_requests').doc(params.request_id).update({
      statut: 'APPROVED',
      processed_at: Timestamp.now(),
    })

    await db.collection('loyalty_transactions').add({
      card_id: null,
      program_id: null,
      partenaire_id: params.partenaire_id,
      type: 'PAIEMENT',
      points_ajoutes: 0,
      description: `Paiement commission cartes fidélité : ${params.montant.toLocaleString('fr-FR')} FCFA`,
      created_at: Timestamp.now(),
      created_by: 'admin',
    })

    // Remettre le solde à zéro
    const walletSnap = await db
      .collection('loyalty_wallets')
      .where('partenaire_id', '==', params.partenaire_id)
      .limit(1)
      .get()
    if (!walletSnap.empty) {
      await walletSnap.docs[0].ref.update({ solde_cash: 0, derniere_maj: Timestamp.now() })
    }

    console.log(`[Loyalty] Paiement approuvé: ${params.partenaire_id} (${params.montant} FCFA)`)
    return { success: true }
  } catch (error) {
    console.error('[Loyalty] Erreur approbation paiement:', error)
    return { success: false, error: 'Erreur serveur' }
  }
}

// ─── Récupérer les demandes de paiement (admin) ──────────────────────────────

export async function getLoyaltyPaymentRequests(): Promise<{
  success: boolean
  requests?: any[]
  error?: string
}> {
  try {
    const snap = await db
      .collection('loyalty_payment_requests')
      .orderBy('requested_at', 'desc')
      .limit(100)
      .get()

    const requests = snap.docs.map((d: any) => ({ request_id: d.id, ...d.data() }))
    return { success: true, requests }
  } catch (error) {
    console.error('[Loyalty] Erreur lecture demandes paiement:', error)
    return { success: false, error: 'Erreur serveur' }
  }
}

// ─── Récupérer le solde wallet partenaire ────────────────────────────────────

export async function getLoyaltyWallet(partenaire_id: string): Promise<{
  success: boolean
  solde?: number
  error?: string
}> {
  try {
    const snap = await db
      .collection('loyalty_wallets')
      .where('partenaire_id', '==', partenaire_id)
      .limit(1)
      .get()

    if (snap.empty) return { success: true, solde: 0 }
    const solde: number = snap.docs[0].data().solde_cash ?? 0
    return { success: true, solde }
  } catch (error) {
    console.error('[Loyalty] Erreur wallet:', error)
    return { success: false, error: 'Erreur serveur' }
  }
}

// ─── Helpers internes ────────────────────────────────────────────────────────

async function crediterWalletPartenaire(
  partenaire_id: string,
  montant: number,
  description: string
) {
  const snap = await db
    .collection('loyalty_wallets')
    .where('partenaire_id', '==', partenaire_id)
    .limit(1)
    .get()

  if (!snap.empty) {
    await snap.docs[0].ref.update({
      solde_cash: FieldValue.increment(montant),
      derniere_maj: Timestamp.now(),
    })
  } else {
    await db.collection('loyalty_wallets').add({
      partenaire_id,
      solde_cash: montant,
      created_at: Timestamp.now(),
      derniere_maj: Timestamp.now(),
    })
  }
  console.log(`[Loyalty] Wallet +${montant} FCFA → ${partenaire_id}: ${description}`)
}
