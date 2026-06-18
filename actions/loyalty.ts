'use server'

import { db } from '@/lib/firebase'
import { Timestamp, FieldValue } from 'firebase-admin/firestore'
import type { LoyaltyProgram, LoyaltyCard, Niveau } from '@/types/loyalty'
import { calculerPoints, determinerNiveau } from '@/lib/loyalty-logic'
import { getPartnerInfo, getPartnerName } from '@/lib/loyalty-partner'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'

const ADMIN_EMAIL = process.env.LOYALTY_ADMIN_EMAIL ?? process.env.ADMIN_EMAIL ?? 'olivierfinestone@gmail.com'

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
  partenaire_type?: 'hebergement' | 'prescripteur'
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

    // Charger le nom du partenaire pour le cache Firestore
    const partenaireType = params.partenaire_type ?? 'prescripteur'
    const partenaireName = await getPartnerName(params.partenaire_id, partenaireType)

    const ref = await db.collection('loyalty_programs').add({
      partenaire_id: params.partenaire_id,
      partenaire_type: partenaireType,
      partenaire_name: partenaireName,
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

    console.log(`[Loyalty] Programme créé: ${ref.id} (${params.nom}) — type: ${partenaireType}`)
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
    taux_fcfa_par_point?: number
  }
): Promise<{ success: boolean; error?: string }> {
  if (updates.taux_fcfa_par_point !== undefined && updates.taux_fcfa_par_point <= 0) {
    return { success: false, error: 'Le taux doit être un nombre positif' }
  }
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

    // Rétro-compatibilité : partenaire_type absent sur anciens docs → défaut 'prescripteur'
    const programs = snap.docs.map((d: any) => ({
      program_id: d.id,
      partenaire_type: 'prescripteur' as const,
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

    const taux = program.taux_fcfa_par_point ?? 10000
    const pointsAjoutes = calculerPoints(params.montant_depense, taux)
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

    // Emails client supprimés — le client voit les points via polling sur sa page carte

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

    // Email confirmation partenaire (fire-and-forget) — résout l'email depuis les deux collections
    const partenaireInfo = await getPartnerInfo(params.partenaire_id).catch(() => null)
    const partenaireEmail: string = (partenaireInfo?.email as string | undefined) ?? ADMIN_EMAIL
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

// ── Resend email sender (remplace Brevo — clés Brevo révoquées automatiquement) ─

async function resendSend(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || apiKey === 're_XXXXXXXXXXXXX') {
    console.warn('[Loyalty:email] ⚠️ RESEND_API_KEY manquant — email non envoyé')
    return
  }
  const from = process.env.FROM_EMAIL ?? 'onboarding@resend.dev'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
  }).catch((e) => { console.error('[Loyalty:email] fetch error', e); return null })
  if (res) {
    if (res.ok) {
      console.log(`[Loyalty:email] ✅ Email envoyé via Resend → ${to}`)
    } else {
      const errText = await res.text()
      console.error(`[Loyalty:email] ❌ Resend HTTP ${res.status}:`, errText)
    }
  }
}

async function envoyerEmailBienvenueLoyalty(
  card_id: string,
  client_email: string,
  client_nom: string,
  program: LoyaltyProgram,
): Promise<void> {
  const cardUrl = `${APP_URL}/loyalty/card/${card_id}`
  console.log(`[Loyalty:email] 📧 Bienvenue — to:${client_email} card:${cardUrl}`)
  await resendSend(
    client_email,
    `🎉 Votre carte ${program.nom} est prête !`,
    `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px">
      <h2 style="color:#C9A84C">Bienvenue dans le programme ${program.nom} !</h2>
      <p>Bonjour ${client_nom},</p>
      <p>Votre carte de fidélité est activée. Accédez-y à tout moment via ce lien :</p>
      <a href="${cardUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#C9A84C;color:#000;font-weight:bold;border-radius:8px;text-decoration:none">
        Voir ma carte →
      </a>
      <p style="color:#888;font-size:12px">Conservez ce lien — il est personnel et ne nécessite pas de compte.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="color:#888;font-size:11px">L&Lui Signature · Kribi, Cameroun</p>
    </div>`
  )
}

async function envoyerEmailPointsAjoutes(
  client_email: string,
  client_nom: string,
  points_ajoutes: number,
  points_total: number,
  program: LoyaltyProgram,
  niveau_id: string,
): Promise<void> {
  const niveau = program.niveaux.find((n) => n.id === niveau_id) ?? program.niveaux[0]
  const nextIdx = program.niveaux.indexOf(niveau) + 1
  const nextNiveau = nextIdx < program.niveaux.length ? program.niveaux[nextIdx] : null
  await resendSend(
    client_email,
    `${niveau.emoji} +${points_ajoutes} points — ${program.nom}`,
    `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:28px">
      <h2 style="color:#C9A84C">${niveau.emoji} Vous avez gagné des points !</h2>
      <p>Bonjour ${client_nom},</p>
      <p>Vous venez de gagner <strong>+${points_ajoutes} points</strong> (total : ${points_total.toLocaleString('fr-FR')} pts).</p>
      <p>Niveau actuel : <strong>${niveau.nom}</strong></p>
      ${nextNiveau ? `<p>Plus que <strong>${(nextNiveau.seuil_points - points_total).toLocaleString('fr-FR')} pts</strong> pour atteindre ${nextNiveau.nom} ${nextNiveau.emoji}</p>` : '<p>Vous avez atteint le niveau maximum !</p>'}
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="color:#888;font-size:11px">L&Lui Signature · Kribi, Cameroun</p>
    </div>`
  )
}

async function envoyerEmailLevelUp(
  client_email: string,
  client_nom: string,
  program: LoyaltyProgram,
  nouveau_niveau_id: string,
): Promise<void> {
  const niveau = program.niveaux.find((n) => n.id === nouveau_niveau_id) ?? program.niveaux[0]
  await resendSend(
    client_email,
    `${niveau.emoji} Félicitations — niveau ${niveau.nom} atteint !`,
    `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:28px">
      <h2 style="color:#C9A84C">${niveau.emoji} Nouveau niveau : ${niveau.nom} !</h2>
      <p>Bravo ${client_nom},</p>
      <p>Vous venez de passer au niveau <strong>${niveau.nom}</strong> dans le programme <strong>${program.nom}</strong>.</p>
      <p>De nouveaux avantages vous attendent.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="color:#888;font-size:11px">L&Lui Signature · Kribi, Cameroun</p>
    </div>`
  )
}

async function envoyerEmailCreationProgram(
  nom_programme: string,
  partenaire_id: string,
): Promise<void> {
  const adminEmail = process.env.LOYALTY_ADMIN_EMAIL ?? process.env.ADMIN_EMAIL ?? 'olivierfinestone@gmail.com'
  await resendSend(
    adminEmail,
    `Nouveau programme fidélité : ${nom_programme}`,
    `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:28px">
      <h2 style="color:#C9A84C">Nouveau programme créé</h2>
      <p><strong>${nom_programme}</strong> — partenaire <code>${partenaire_id}</code></p>
      <p>Le programme est actif et disponible en boutique.</p>
    </div>`
  )
}

async function envoyerEmailDemandePayment(
  partenaire_id: string,
  montant: number,
  request_id: string,
): Promise<void> {
  const adminEmail = process.env.LOYALTY_ADMIN_EMAIL ?? process.env.ADMIN_EMAIL ?? 'olivierfinestone@gmail.com'
  await resendSend(
    adminEmail,
    `Demande de virement — ${montant.toLocaleString('fr-FR')} FCFA`,
    `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:28px">
      <h2 style="color:#C9A84C">Demande de virement commission</h2>
      <p>Partenaire : <strong>${partenaire_id}</strong></p>
      <p>Montant : <strong>${montant.toLocaleString('fr-FR')} FCFA</strong></p>
      <p>OM : <strong>693407964</strong></p>
      <p>Demande ID : <code>${request_id}</code></p>
    </div>`
  )
}

async function envoyerEmailPaiementApprouve(
  partenaire_email: string,
  montant: number,
): Promise<void> {
  await resendSend(
    partenaire_email,
    `Virement ${montant.toLocaleString('fr-FR')} FCFA en cours`,
    `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:28px">
      <h2 style="color:#C9A84C">Votre virement est en cours</h2>
      <p>Montant : <strong>${montant.toLocaleString('fr-FR')} FCFA</strong> sur Orange Money 693407964</p>
      <p>Date estimée : ${new Date(Date.now() + 2 * 86400000).toLocaleDateString('fr-FR')}</p>
    </div>`
  )
}

// ─── Créer une carte PENDING (avant validation admin) ────────────────────────

export async function createLoyaltyCardPending(params: {
  program_id: string
  client_email: string
  client_nom: string
  client_prenom: string
  client_phone: string
  montant_achat: number
  /** Niveau choisi par le client à l'achat */
  niveau_choisi?: string
}): Promise<{ success: boolean; card_id?: string; error?: string }> {
  try {
    const programDoc = await db.collection('loyalty_programs').doc(params.program_id).get()
    if (!programDoc.exists) return { success: false, error: 'Programme non trouvé' }
    const program = programDoc.data() as LoyaltyProgram

    const niveauInitial = params.niveau_choisi ?? program.niveaux[0]?.id ?? 'bronze'

    const token = crypto.randomUUID()
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const cardExpiresAt = new Date(Date.now() + program.duree_validite_mois * 30 * 24 * 60 * 60 * 1000)

    const cardRef = db.collection('loyalty_cards').doc()
    const cardId = cardRef.id

    await cardRef.set({
      card_id: cardId,
      program_id: params.program_id,
      programme_nom: program.nom,
      partenaire_id: program.partenaire_id,
      client_id: `guest_${Date.now()}`,
      client_email: params.client_email,
      client_nom: params.client_nom,
      client_prenom: params.client_prenom,
      client_phone: params.client_phone,
      niveau_initial: niveauInitial,
      niveau_actuel: niveauInitial,
      points_cumules: 0,
      nombre_utilisations: 0,
      qr_code_data: `loyalty://${cardId}`,
      qr_code_url: null,
      commission_lui_percent: program.commission_lui_percent,
      commission_partner_percent: program.commission_partner_percent,
      created_at: Timestamp.now(),
      expires_at: Timestamp.fromDate(cardExpiresAt),
      statut: 'PENDING',
      montant_achat: params.montant_achat,
      prix_achat_fcfa: params.montant_achat,
      updated_at: Timestamp.now(),
      confirmation_token: token,
      confirmation_token_expires_at: Timestamp.fromDate(tokenExpiresAt),
      confirmed_at: null,
      confirmed_by_admin: null,
    })

    // Admin reçoit un email pour valider le paiement (seul email conservé)
    void envoyerEmailAdminValidation(cardId, token, { ...params, niveau_choisi: niveauInitial }, program)

    console.log(`[Loyalty] Carte PENDING créée: ${cardId} pour ${params.client_email}`)
    return { success: true, card_id: cardId }
  } catch (error) {
    console.error('[Loyalty] Erreur création carte pending:', error)
    return { success: false, error: 'Erreur serveur' }
  }
}

// ─── Confirmer une carte (PENDING → ACTIVE) ───────────────────────────────────

export async function confirmLoyaltyCard(
  card_id: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  const cardRef = db.collection('loyalty_cards').doc(card_id)
  let savedCardData: any = null

  try {
    await db.runTransaction(async (tx) => {
      const cardDoc = await tx.get(cardRef)
      if (!cardDoc.exists) throw new Error('Carte non trouvée')

      const card = cardDoc.data()!
      if (card.confirmation_token !== token) throw new Error('Token invalide')
      if (card.statut !== 'PENDING') throw new Error(`Carte déjà traitée (statut : ${card.statut})`)

      const tokenExp = card.confirmation_token_expires_at?.toDate?.()
        ?? new Date((card.confirmation_token_expires_at?.seconds ?? 0) * 1000)
      if (tokenExp < new Date()) throw new Error('Lien de confirmation expiré (24h)')

      savedCardData = card

      tx.update(cardRef, {
        statut: 'ACTIVE',
        confirmation_token: FieldValue.delete(),
        confirmation_token_expires_at: FieldValue.delete(),
        confirmed_at: Timestamp.now(),
        confirmed_by_admin: 'admin',
        updated_at: Timestamp.now(),
      })
    })
  } catch (e: any) {
    console.error('[Loyalty] confirmLoyaltyCard error:', e.message)
    return { success: false, error: e.message ?? 'Erreur serveur' }
  }

  // Actions post-confirmation (fire-and-forget)
  if (savedCardData) {
    const card = savedCardData
    try {
      const programDoc = await db.collection('loyalty_programs').doc(card.program_id).get()
      const program = programDoc.data() as LoyaltyProgram

      const commission_partner = Math.round(card.montant_achat * (program.commission_partner_percent / 100))
      const commission_lui = card.montant_achat - commission_partner

      void Promise.all([
        db.collection('loyalty_transactions').add({
          card_id,
          program_id: card.program_id,
          partenaire_id: program.partenaire_id,
          type: 'ACHAT_CARTE',
          points_ajoutes: 0,
          commission_lui,
          commission_partner,
          description: `Achat carte ${program.nom}`,
          created_at: Timestamp.now(),
          created_by: 'admin',
        }),
        crediterWalletPartenaire(program.partenaire_id, commission_partner, `Vente carte ${program.nom}`),
        // Email client supprimé — le client voit l'activation via polling sur sa page carte
      ])

      // ── Unification identités : lier la carte à clients_fidelite via phone ──
      if (card.client_phone) {
        void (async () => {
          try {
            // Normaliser le numéro en E.164
            let t = (card.client_phone as string).replace(/[\s\-().]/g, '')
            if (t.startsWith('00')) t = '+' + t.slice(2)
            if (/^237\d{8,9}$/.test(t)) t = '+' + t
            if (!t.startsWith('+')) t = '+237' + t
            const phoneE164 = t

            const clientRef = db.collection('clients_fidelite').doc(phoneE164)
            const clientSnap = await clientRef.get()

            await Promise.all([
              // Mettre à jour client_id de la carte : guest_${ts} → phone E.164
              db.collection('loyalty_cards').doc(card_id).update({
                client_id: phoneE164,
              }),
              // Créer le profil Stars si inexistant, sinon ne rien écraser
              clientSnap.exists
                ? Promise.resolve() // déjà lié, ne pas modifier
                : clientRef.set({
                    telephone: phoneE164,
                    points_stars: 0,
                    total_stars_historique: 0,
                    membership_status: 'novice',
                    last_status_update: new Date().toISOString(),
                    phone_verified: false,
                    created_at: Timestamp.now(),
                    updated_at: Timestamp.now(),
                  }, { merge: true }),
            ])

            console.log(`[Loyalty] ✅ Carte ${card_id} liée à clients_fidelite[${phoneE164}]`)
          } catch (linkErr) {
            console.warn('[Loyalty] link clients_fidelite non-bloquant:', linkErr)
          }
        })()
      }
    } catch (e) {
      console.error('[Loyalty] Post-confirm error:', e)
    }
  }

  console.log(`[Loyalty] Carte confirmée: ${card_id}`)
  return { success: true }
}

// ─── Rejeter une carte (PENDING → REJECTED) ───────────────────────────────────

export async function rejectLoyaltyCard(
  card_id: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  const cardRef = db.collection('loyalty_cards').doc(card_id)

  try {
    await db.runTransaction(async (tx) => {
      const cardDoc = await tx.get(cardRef)
      if (!cardDoc.exists) throw new Error('Carte non trouvée')

      const card = cardDoc.data()!
      if (card.confirmation_token !== token) throw new Error('Token invalide')
      if (card.statut !== 'PENDING') throw new Error(`Carte déjà traitée (statut : ${card.statut})`)

      tx.update(cardRef, {
        statut: 'REJECTED',
        confirmation_token: FieldValue.delete(),
        confirmation_token_expires_at: FieldValue.delete(),
        updated_at: Timestamp.now(),
      })
    })

    console.log(`[Loyalty] Carte rejetée: ${card_id}`)
    return { success: true }
  } catch (e: any) {
    console.error('[Loyalty] rejectLoyaltyCard error:', e.message)
    return { success: false, error: e.message ?? 'Erreur serveur' }
  }
}

// ─── Récupérer les cartes PENDING (admin) ────────────────────────────────────

export async function getPendingLoyaltyCards(): Promise<{
  success: boolean
  cards?: any[]
  error?: string
}> {
  try {
    const snap = await db
      .collection('loyalty_cards')
      .where('statut', '==', 'PENDING')
      .get()

    const cards = snap.docs.map((d) => ({
      card_id: d.id,
      ...d.data(),
      created_at: (d.data().created_at?.toDate?.() ?? new Date()).toISOString(),
      expires_at: (d.data().expires_at?.toDate?.() ?? new Date()).toISOString(),
      confirmation_token_expires_at:
        (d.data().confirmation_token_expires_at?.toDate?.() ?? new Date()).toISOString(),
    }))

    return { success: true, cards }
  } catch (error) {
    console.error('[Loyalty] Erreur getPendingLoyaltyCards:', error)
    return { success: false, error: 'Erreur serveur' }
  }
}

// ─── Email admin : validation demande ────────────────────────────────────────

async function envoyerEmailAdminValidation(
  card_id: string,
  token: string,
  params: {
    client_nom: string
    client_prenom: string
    client_email: string
    client_phone: string
    montant_achat: number
    niveau_choisi?: string
  },
  program: LoyaltyProgram,
): Promise<void> {
  const adminEmail = process.env.LOYALTY_ADMIN_EMAIL ?? process.env.ADMIN_EMAIL ?? 'olivierfinestone@gmail.com'
  const confirmUrl = `${APP_URL}/admin/loyalty-confirmations?card_id=${card_id}&token=${token}`
  const niveauObj = params.niveau_choisi
    ? program.niveaux.find((n) => n.id === params.niveau_choisi)
    : program.niveaux[0]
  const niveauLabel = niveauObj ? `${niveauObj.emoji} ${niveauObj.nom}` : params.niveau_choisi ?? '—'
  await resendSend(
    adminEmail,
    `🎫 Demande carte ${niveauLabel} — ${program.nom} — ${params.montant_achat.toLocaleString('fr-FR')} FCFA`,
    `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;background:#fff">
      <h2 style="color:#C9A84C;margin-bottom:4px">Nouvelle demande de carte fidélité</h2>
      <p style="color:#888;margin-top:0;font-size:13px">Action requise : valider le paiement Orange Money</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">
        <tr style="border-bottom:1px solid #f0f0f0"><td style="padding:10px 8px;color:#666;width:40%">Programme</td><td style="padding:10px 8px;font-weight:600">${program.nom}</td></tr>
        <tr style="border-bottom:1px solid #f0f0f0"><td style="padding:10px 8px;color:#666">Niveau choisi</td><td style="padding:10px 8px;font-weight:700;font-size:15px">${niveauLabel}</td></tr>
        <tr style="border-bottom:1px solid #f0f0f0"><td style="padding:10px 8px;color:#666">Client</td><td style="padding:10px 8px;font-weight:600">${params.client_prenom} ${params.client_nom}</td></tr>
        <tr style="border-bottom:1px solid #f0f0f0"><td style="padding:10px 8px;color:#666">Email</td><td style="padding:10px 8px">${params.client_email}</td></tr>
        <tr style="border-bottom:1px solid #f0f0f0"><td style="padding:10px 8px;color:#666">Téléphone</td><td style="padding:10px 8px">${params.client_phone}</td></tr>
        <tr><td style="padding:10px 8px;color:#666">Montant</td><td style="padding:10px 8px;font-weight:700;color:#C9A84C;font-size:18px">${params.montant_achat.toLocaleString('fr-FR')} FCFA</td></tr>
      </table>
      <a href="${confirmUrl}" style="display:inline-block;margin:8px 0 16px;padding:16px 32px;background:#22c55e;color:#fff;font-weight:700;border-radius:10px;text-decoration:none;font-size:16px">
        ✅ Confirmer le paiement
      </a>
      <p style="color:#888;font-size:12px;margin-top:8px">
        Ce lien est valable <strong>24h</strong>.<br>
        Il ouvre la page admin de confirmation sécurisée.
      </p>
    </div>`
  )
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
