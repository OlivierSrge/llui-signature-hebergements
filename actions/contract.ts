'use server'

import { db } from '@/lib/firebase'
import { DEFAULT_CONTRACT_TEXT, DEFAULT_COMMISSION_CLAUSES } from '@/lib/contractDefaults'
import crypto from 'crypto'

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export type ContractStatus = 'not_sent' | 'sent' | 'otp_pending' | 'signed'

export interface ContractData {
  status: ContractStatus
  version: string
  contractId: string
  sentAt?: string
  otpCode?: string
  otpExpiresAt?: string
  otpAttempts?: number
  signedAt?: string
  signatoryName?: string
  signatoryRole?: string
  pdfUrl?: string
  userAgent?: string
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function generateContractId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let id = 'LLUI-CTR-'
  for (let i = 0; i < 5; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex')
}

function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// ═══════════════════════════════════════════
// ADMIN — Sauvegarder le texte du contrat
// ═══════════════════════════════════════════

export async function saveContractClauses(clauses: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection('settings').doc('contract').collection('current').doc('current').set({
      clauses,
      updatedAt: new Date().toISOString(),
    }, { merge: true })
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ═══════════════════════════════════════════
// ADMIN — Charger le texte du contrat
// ═══════════════════════════════════════════

export async function loadContractClauses(): Promise<string> {
  try {
    const snap = await db.collection('settings').doc('contract').collection('current').doc('current').get()
    if (snap.exists && snap.data()?.clauses) return snap.data()!.clauses
    return DEFAULT_CONTRACT_TEXT
  } catch {
    return DEFAULT_CONTRACT_TEXT
  }
}

// ═══════════════════════════════════════════
// ADMIN — Sauvegarder les commissions
// ═══════════════════════════════════════════

export async function saveCommissionPlan(
  plan: string,
  data: {
    rate: number
    fee: number
    maxAccommodations: number | 'illimité'
    paymentDelay: number
    clause: string
    specialConditions: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection('settings').doc('contract').collection('commissions').doc(plan).set({
      commissionRate: data.rate,
      monthlyFee: data.fee,
      maxAccommodations: data.maxAccommodations,
      paymentDelay: data.paymentDelay,
      commissionClause: data.clause,
      specialConditions: data.specialConditions,
      updatedAt: new Date().toISOString(),
    }, { merge: true })
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ═══════════════════════════════════════════
// ADMIN — Charger les commissions (tous les plans)
// ═══════════════════════════════════════════

export async function loadCommissions(): Promise<typeof DEFAULT_COMMISSION_CLAUSES> {
  try {
    const plans = Object.keys(DEFAULT_COMMISSION_CLAUSES)
    const result = { ...DEFAULT_COMMISSION_CLAUSES }
    await Promise.all(
      plans.map(async (plan) => {
        const snap = await db.collection('settings').doc('contract').collection('commissions').doc(plan).get()
        if (snap.exists) {
          const d = snap.data()!
          result[plan] = {
            rate: d.commissionRate ?? DEFAULT_COMMISSION_CLAUSES[plan].rate,
            fee: d.monthlyFee ?? DEFAULT_COMMISSION_CLAUSES[plan].fee,
            maxAccommodations: d.maxAccommodations ?? DEFAULT_COMMISSION_CLAUSES[plan].maxAccommodations,
            paymentDelay: d.paymentDelay ?? DEFAULT_COMMISSION_CLAUSES[plan].paymentDelay,
            clause: d.commissionClause ?? DEFAULT_COMMISSION_CLAUSES[plan].clause,
            specialConditions: d.specialConditions ?? DEFAULT_COMMISSION_CLAUSES[plan].specialConditions,
          }
        }
      })
    )
    return result
  } catch {
    return DEFAULT_COMMISSION_CLAUSES
  }
}

// ═══════════════════════════════════════════
// ADMIN — Paramètres / version
// ═══════════════════════════════════════════

export async function saveContractMeta(data: {
  version: string
  effectiveDate: string
  forceResign: boolean
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Mettre à jour la meta
    await db.collection('settings').doc('contract').collection('meta').doc('meta').set({
      activeVersion: data.version,
      effectiveDate: data.effectiveDate,
      publishedAt: new Date().toISOString(),
      forceResign: data.forceResign,
    }, { merge: true })

    // Si forceResign → repasser tous les partenaires signés à 'sent'
    if (data.forceResign) {
      const snap = await db.collection('partenaires').get()
      const batch = db.batch()
      snap.docs.forEach((doc) => {
        const contract = doc.data().contract
        if (contract?.status === 'signed') {
          batch.update(doc.ref, {
            'contract.status': 'sent',
            'contract.version': '',
          })
        }
      })
      await batch.commit()
    }

    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function loadContractMeta(): Promise<{ version: string; effectiveDate: string; publishedAt?: string }> {
  try {
    const snap = await db.collection('settings').doc('contract').collection('meta').doc('meta').get()
    if (snap.exists) {
      const d = snap.data()!
      return {
        version: d.activeVersion || 'v1.0-2026',
        effectiveDate: d.effectiveDate || new Date().toISOString().split('T')[0],
        publishedAt: d.publishedAt,
      }
    }
    return { version: 'v1.0-2026', effectiveDate: new Date().toISOString().split('T')[0] }
  } catch {
    return { version: 'v1.0-2026', effectiveDate: new Date().toISOString().split('T')[0] }
  }
}

// ═══════════════════════════════════════════
// ADMIN — Envoyer le contrat à un partenaire
// ═══════════════════════════════════════════

export async function sendContractToPartner(
  partnerId: string
): Promise<{ success: boolean; contractId?: string; whatsappUrl?: string; error?: string }> {
  try {
    const partnerRef = db.collection('partenaires').doc(partnerId)
    const partnerSnap = await partnerRef.get()
    if (!partnerSnap.exists) return { success: false, error: 'Partenaire introuvable' }

    const partner = partnerSnap.data()!
    const contractId = generateContractId()
    const now = new Date().toISOString()

    // Charger la version active
    const meta = await loadContractMeta()

    await partnerRef.update({
      contract: {
        status: 'sent',
        version: meta.version,
        contractId,
        sentAt: now,
      },
    })

    // Préparer le lien WhatsApp
    const partnerName = partner.name || 'Partenaire'
    const phone = (partner.whatsapp_number || partner.phone || '').replace(/\D/g, '')
    const siteUrl = 'https://llui-signature-hebergements.vercel.app'
    const msg = `Bonjour ${partnerName},\n\nVotre contrat de partenariat L&Lui Signature est prêt à être signé.\n\nNuméro de contrat : ${contractId}\n\nVeuillez vous connecter à votre espace partenaire pour lire et signer votre contrat :\n${siteUrl}/partenaire/contrat\n\nCe contrat est important pour la validité de votre partenariat. Merci de le signer dès que possible.\n\nL&Lui Signature`
    const whatsappUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : null

    return { success: true, contractId, whatsappUrl: whatsappUrl || undefined }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ═══════════════════════════════════════════
// ADMIN — Initialiser les contrats manquants
// ═══════════════════════════════════════════

export async function initializeMissingContracts(): Promise<{ success: boolean; count: number }> {
  try {
    const snap = await db.collection('partenaires').get()
    const batch = db.batch()
    let count = 0
    snap.docs.forEach((doc) => {
      if (!doc.data().contract) {
        batch.update(doc.ref, {
          'contract.status': 'not_sent',
          'contract.version': '',
          'contract.contractId': '',
        })
        count++
      }
    })
    if (count > 0) await batch.commit()
    return { success: true, count }
  } catch {
    return { success: false, count: 0 }
  }
}

// ═══════════════════════════════════════════
// PARTENAIRE — Charger son contrat
// ═══════════════════════════════════════════

export async function loadPartnerContractData(partnerId: string): Promise<{
  partner: {
    name: string
    whatsapp_number: string
    phone: string
    subscriptionPlan?: string
    address?: string
  }
  contract: ContractData
  contractText: string
  commissionClause: string
  contractMeta: { version: string; effectiveDate: string }
}> {
  const [partnerSnap, clausesSnap, meta, commissions] = await Promise.all([
    db.collection('partenaires').doc(partnerId).get(),
    db.collection('settings').doc('contract').collection('current').doc('current').get(),
    loadContractMeta(),
    loadCommissions(),
  ])

  if (!partnerSnap.exists) throw new Error('Partenaire introuvable')
  const partner = partnerSnap.data()!

  // Initialiser le contrat s'il n'existe pas
  if (!partner.contract) {
    await partnerSnap.ref.update({
      'contract.status': 'not_sent',
      'contract.version': '',
      'contract.contractId': '',
    })
    partner.contract = { status: 'not_sent', version: '', contractId: '' }
  }

  const contract = partner.contract as ContractData

  // Charger le texte du contrat
  const rawText = clausesSnap.exists && clausesSnap.data()?.clauses
    ? clausesSnap.data()!.clauses
    : DEFAULT_CONTRACT_TEXT

  // Clause commission selon le plan
  const plan = (partner.subscriptionPlan || 'essentiel').toLowerCase()
  const planData = commissions[plan] || commissions['essentiel']
  const commissionClause = planData.clause

  return {
    partner: {
      name: partner.name || '',
      whatsapp_number: partner.whatsapp_number || partner.phone || '',
      phone: partner.phone || '',
      subscriptionPlan: partner.subscriptionPlan,
      address: partner.address,
    },
    contract,
    contractText: rawText,
    commissionClause,
    contractMeta: meta,
  }
}

// ═══════════════════════════════════════════
// PARTENAIRE — Générer et envoyer OTP
// ═══════════════════════════════════════════

export async function generateAndSendOtp(
  partnerId: string,
  signatoryName: string,
  signatoryRole: string
): Promise<{ success: boolean; otpCode?: string; error?: string }> {
  try {
    const partnerRef = db.collection('partenaires').doc(partnerId)
    const snap = await partnerRef.get()
    if (!snap.exists) return { success: false, error: 'Partenaire introuvable' }

    const partner = snap.data()!
    const contract = partner.contract as ContractData

    // Vérifier le blocage (5 tentatives)
    if (contract?.otpAttempts && contract.otpAttempts >= 5) {
      const expiresAt = contract.otpExpiresAt ? new Date(contract.otpExpiresAt) : null
      if (expiresAt && expiresAt > new Date()) {
        return { success: false, error: 'Compte bloqué 1 heure après 5 tentatives échouées.' }
      }
    }

    const otp = generateOtpCode()
    const otpHash = hashOtp(otp)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

    await partnerRef.update({
      'contract.otpCode': otpHash,
      'contract.otpExpiresAt': expiresAt,
      'contract.otpAttempts': 0,
      'contract.status': 'otp_pending',
      'contract.signatoryName': signatoryName,
      'contract.signatoryRole': signatoryRole,
    })

    // Retourner le code en clair pour que le front génère le lien WhatsApp
    return { success: true, otpCode: otp }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ═══════════════════════════════════════════
// PARTENAIRE — Vérifier OTP
// ═══════════════════════════════════════════

export async function verifyOtp(
  partnerId: string,
  inputCode: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const partnerRef = db.collection('partenaires').doc(partnerId)
    const snap = await partnerRef.get()
    if (!snap.exists) return { success: false, error: 'Partenaire introuvable' }

    const contract = snap.data()!.contract as ContractData

    if (!contract?.otpCode || !contract?.otpExpiresAt) {
      return { success: false, error: 'Aucun code OTP en attente.' }
    }

    // Vérifier expiration
    if (new Date(contract.otpExpiresAt) < new Date()) {
      return { success: false, error: 'Le code OTP a expiré. Veuillez en demander un nouveau.' }
    }

    // Vérifier blocage
    if ((contract.otpAttempts || 0) >= 5) {
      return { success: false, error: 'Compte bloqué après 5 tentatives. Réessayez dans 1 heure.' }
    }

    const inputHash = hashOtp(inputCode.trim())

    if (inputHash !== contract.otpCode) {
      const newAttempts = (contract.otpAttempts || 0) + 1
      const updates: any = { 'contract.otpAttempts': newAttempts }

      // Bloquer 1h après 5 tentatives
      if (newAttempts >= 5) {
        updates['contract.otpExpiresAt'] = new Date(Date.now() + 60 * 60 * 1000).toISOString()
      }

      await partnerRef.update(updates)
      const remaining = 5 - newAttempts
      return {
        success: false,
        error: remaining > 0
          ? `Code incorrect. ${remaining} tentative${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}.`
          : 'Compte bloqué 1 heure.',
      }
    }

    // Code correct — marquer OTP validé (la signature finale se fait après génération PDF)
    await partnerRef.update({
      'contract.otpAttempts': 0,
      'contract.status': 'otp_pending', // reste en otp_pending jusqu'à la signature finale
    })

    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ═══════════════════════════════════════════
// PARTENAIRE — Finaliser la signature
// ═══════════════════════════════════════════

export async function finalizeSignature(
  partnerId: string,
  data: {
    pdfUrl: string
    userAgent: string
    version: string
    contractId: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const partnerRef = db.collection('partenaires').doc(partnerId)
    const snap = await partnerRef.get()
    if (!snap.exists) return { success: false, error: 'Partenaire introuvable' }

    const now = new Date().toISOString()
    await partnerRef.update({
      'contract.status': 'signed',
      'contract.signedAt': now,
      'contract.pdfUrl': data.pdfUrl,
      'contract.userAgent': data.userAgent,
      'contract.version': data.version,
      'contract.contractId': data.contractId,
    })

    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ═══════════════════════════════════════════
// ADMIN — Stats contrats
// ═══════════════════════════════════════════

export async function getContractStats(): Promise<{
  total: number
  not_sent: number
  sent: number
  otp_pending: number
  signed: number
}> {
  try {
    const snap = await db.collection('partenaires').get()
    const stats = { total: 0, not_sent: 0, sent: 0, otp_pending: 0, signed: 0 }
    snap.docs.forEach((doc) => {
      stats.total++
      const status = doc.data().contract?.status as ContractStatus || 'not_sent'
      if (status in stats) (stats as any)[status]++
      else stats.not_sent++
    })
    return stats
  } catch {
    return { total: 0, not_sent: 0, sent: 0, otp_pending: 0, signed: 0 }
  }
}
