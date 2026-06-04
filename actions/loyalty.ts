'use server'

import { db } from '@/lib/firebase'
import { Timestamp, FieldValue } from 'firebase-admin/firestore'
import type { LoyaltyProgram, LoyaltyCard, Niveau } from '@/types/loyalty'
import { calculerPoints, determinerNiveau } from '@/lib/loyalty-logic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'

// ─── Brevo Template IDs ───────────────────────────────────────────────────────
// Remplacer les 0 par les vrais IDs après création dans https://app.brevo.com
const BREVO_TEMPLATE_WELCOME     = Number(process.env.BREVO_TEMPLATE_WELCOME     ?? 0)
const BREVO_TEMPLATE_POINTS      = Number(process.env.BREVO_TEMPLATE_POINTS      ?? 0)
const BREVO_TEMPLATE_LEVEL_UP    = Number(process.env.BREVO_TEMPLATE_LEVEL_UP    ?? 0)
const BREVO_TEMPLATE_PAY_REQUEST = Number(process.env.BREVO_TEMPLATE_PAY_REQUEST ?? 0)
const BREVO_TEMPLATE_PAY_APPROVE = Number(process.env.BREVO_TEMPLATE_PAY_APPROVE ?? 0)

const ADMIN_EMAIL = 'olivier@l-et-lui.com'

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

    // Notifier admin (fire-and-forget)
    void envoyerEmailCreationProgram(params.nom, params.partenaire_id)

    console.log(`[Loyalty] Programme créé: ${ref.id} (${params.nom})`)
    return { success: true, program_id: ref.id }
  } catch (error) {
    console.error('[Loyalty] Erreur création programme:', error)
    return { success: false, error: 'Erreur serveur' }
  }
}

// ─── Mettre à jour un programme (admin configure) ────────────────────────────

export async function updateLoyaltyProgram(
  program_id: string,
  updates: {
    prix_fcfa?: number
    prix_eur?: number
    duree_validite_mois?: number
    commission_lui_percent?: number
    commission_partner_percent?: number
    niveaux?: Niveau[]
    statut?: 'DRAFT' | 'ACTIVE' | 'PAUSED'
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .collection('loyalty_programs')
      .doc(program_id)
      .update({ ...updates, updated_at: Timestamp.now() })
    return { success: true }
  } catch (error) {
    console.error('[Loyalty] Erreur mise à jour programme:', error)
    return { success: false, error: 'Erreur serveur' }
  }
}

// ─── Récupérer programme par ID (admin) ──────────────────────────────────────

export async function getLoyaltyProgramById(program_id: string): Promise<{
  success: boolean
  program?: LoyaltyProgram
  error?: string
}> {
  try {
    const doc = await db.collection('loyalty_programs').doc(program_id).get()
    if (!doc.exists) return { success: false, error: 'Programme non trouvé' }
    return { success: true, program: { program_id: doc.id, ...(doc.data() as Omit<LoyaltyProgram, 'program_id'>) } }
  } catch (error) {
    console.error('[Loyalty] Erreur lecture programme:', error)
    return { success: false, error: 'Erreur serveur' }
  }
}

// ─── Récupérer programme actif d'un partenaire (mini site) ───────────────────

export async function getLoyaltyProgramForPartenaire(partenaire_id: string): Promise<{
  success: boolean
  program?: LoyaltyProgram
  error?: string
}> {
  try {
    const snap = await db
      .collection('loyalty_programs')
      .where('partenaire_id', '==', partenaire_id)
      .where('statut', '==', 'ACTIVE')
      .limit(1)
      .get()
    if (snap.empty) return { success: false }
    const doc = snap.docs[0]
    return { success: true, program: { program_id: doc.id, ...(doc.data() as Omit<LoyaltyProgram, 'program_id'>) } }
  } catch (error) {
    console.error('[Loyalty] Erreur lecture programme partenaire:', error)
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

    // Email bienvenue client (fire-and-forget)
    void envoyerEmailBienvenueLoyalty(cardId, params.client_email, params.client_nom, program)

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

    // Emails client (fire-and-forget)
    void envoyerEmailPointsAjoutes(
      card.client_email, card.client_nom, pointsAjoutes, nouveauxPoints, program, nouveauNiveau,
    )
    if (levelChanged) {
      void envoyerEmailLevelUp(card.client_email, card.client_nom, program, nouveauNiveau)
    }

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

    const reqRef = await db.collection('loyalty_payment_requests').add({
      partenaire_id,
      montant: solde,
      statut: 'PENDING',
      requested_at: Timestamp.now(),
      processed_at: null,
    })

    // Notifier admin (fire-and-forget)
    void envoyerEmailDemandePayment(partenaire_id, solde, reqRef.id)

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

    // Email confirmation partenaire (fire-and-forget) — on utilise l'email admin si pas d'email partenaire
    const partenaireDoc = await db.collection('prescripteurs_partenaires').doc(params.partenaire_id).get()
    const partenaireEmail: string = (partenaireDoc.data()?.email as string) ?? ADMIN_EMAIL
    void envoyerEmailPaiementApprouve(partenaireEmail, params.montant)

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

// ── Brevo email sender ────────────────────────────────────────────────────────

async function brevoSend(payload: object): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) { console.warn('[Loyalty:email] BREVO_API_KEY manquant'); return }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch((e) => { console.error('[Loyalty:email] fetch error', e); return null })
  if (res && !res.ok) console.error('[Loyalty:email] Brevo error', await res.text())
}

async function envoyerEmailBienvenueLoyalty(
  card_id: string,
  client_email: string,
  client_nom: string,
  program: LoyaltyProgram,
): Promise<void> {
  if (!BREVO_TEMPLATE_WELCOME) return
  await brevoSend({
    to: [{ email: client_email }],
    templateId: BREVO_TEMPLATE_WELCOME,
    params: {
      program_nom: program.nom,
      client_nom,
      card_url: `${APP_URL}/loyalty/card/${card_id}`,
    },
  })
}

async function envoyerEmailPointsAjoutes(
  client_email: string,
  client_nom: string,
  points_ajoutes: number,
  points_total: number,
  program: LoyaltyProgram,
  niveau_id: string,
): Promise<void> {
  if (!BREVO_TEMPLATE_POINTS) return
  const niveau = program.niveaux.find((n) => n.id === niveau_id) ?? program.niveaux[0]
  const nextIdx = program.niveaux.indexOf(niveau) + 1
  const nextNiveau = nextIdx < program.niveaux.length ? program.niveaux[nextIdx] : null
  await brevoSend({
    to: [{ email: client_email }],
    templateId: BREVO_TEMPLATE_POINTS,
    params: {
      client_nom,
      points_ajoutes,
      program_nom: program.nom,
      points_total,
      niveau_nom: niveau.nom,
      niveau_emoji: niveau.emoji,
      points_jusqua_prochain: nextNiveau ? Math.max(0, nextNiveau.seuil_points - points_total) : 0,
      card_url: `${APP_URL}/loyalty/dashboard`,
    },
  })
}

async function envoyerEmailLevelUp(
  client_email: string,
  client_nom: string,
  program: LoyaltyProgram,
  nouveau_niveau_id: string,
): Promise<void> {
  if (!BREVO_TEMPLATE_LEVEL_UP) return
  const niveau = program.niveaux.find((n) => n.id === nouveau_niveau_id) ?? program.niveaux[0]
  await brevoSend({
    to: [{ email: client_email }],
    templateId: BREVO_TEMPLATE_LEVEL_UP,
    params: {
      client_nom,
      nouveau_niveau: niveau.nom,
      emoji: niveau.emoji,
      program_nom: program.nom,
      card_url: `${APP_URL}/loyalty/dashboard`,
    },
  })
}

async function envoyerEmailCreationProgram(
  nom_programme: string,
  partenaire_id: string,
): Promise<void> {
  await brevoSend({
    to: [{ email: ADMIN_EMAIL }],
    subject: `✅ Nouveau programme fidélité : ${nom_programme}`,
    htmlContent: `<h2>Nouveau programme créé</h2>
      <p><strong>${nom_programme}</strong> — partenaire <code>${partenaire_id}</code></p>
      <p>Le programme est actif et disponible en boutique.</p>`,
    sender: { name: 'L&Lui Signature', email: ADMIN_EMAIL },
  })
}

async function envoyerEmailDemandePayment(
  partenaire_id: string,
  montant: number,
  request_id: string,
): Promise<void> {
  if (!BREVO_TEMPLATE_PAY_REQUEST) return
  await brevoSend({
    to: [{ email: ADMIN_EMAIL }],
    templateId: BREVO_TEMPLATE_PAY_REQUEST,
    params: {
      partenaire_nom: partenaire_id,
      montant: montant.toLocaleString('fr-FR'),
      date_demande: new Date().toLocaleDateString('fr-FR'),
      om_number: '693407964',
      approve_url: `${APP_URL}/admin/loyalty/approve/${request_id}`,
      deny_url: `${APP_URL}/admin/loyalty/deny/${request_id}`,
    },
  })
}

async function envoyerEmailPaiementApprouve(
  partenaire_email: string,
  montant: number,
): Promise<void> {
  if (!BREVO_TEMPLATE_PAY_APPROVE) return
  await brevoSend({
    to: [{ email: partenaire_email }],
    templateId: BREVO_TEMPLATE_PAY_APPROVE,
    params: {
      montant: montant.toLocaleString('fr-FR'),
      om_number: '693407964',
      date_virement: new Date(Date.now() + 2 * 86400000).toLocaleDateString('fr-FR'),
    },
  })
}

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
