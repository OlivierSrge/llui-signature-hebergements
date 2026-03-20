// lib/walletsService.ts
// Wallets atomic Firestore — P4 — SEUL endroit autorisé pour toucher les wallets
// NE JAMAIS update wallets directement en dehors de ce fichier

import { getDb } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { calculatePayout, getGradeFromRev } from '@/lib/calculatePayout'
import type { TransactionType } from '@/lib/calculatePayout'
import type { PortailGrade } from '@/lib/portailGrades'

export type WalletOpType = 'CREDIT_COMMISSION' | 'CREDIT_PRIME' | 'DEBIT_RETRAIT' | 'CREDIT_BONUS'

export interface WalletOpResult {
  success: boolean
  payout: { cash: number; credits_services: number; rev_gagnes: number }
  grade_change: { ancien: PortailGrade; nouveau: PortailGrade; changed: boolean; changed_at?: string }
}

// ─── crediterWallet ───────────────────────────────────────────────────────────
// Transaction atomique : calcul payout → update wallet + rev + grade → log
export async function crediterWallet(
  uid: string,
  transaction_id: string,
  amount_ht: number,
  type: TransactionType,
  level: 1 | 2,
  source: string
): Promise<WalletOpResult> {
  const payout = calculatePayout(amount_ht, type, level)
  const db = getDb()
  const userRef = db.collection('portail_users').doc(uid)
  let gradeChange = { ancien: 'START' as PortailGrade, nouveau: 'START' as PortailGrade, changed: false, changed_at: undefined as string | undefined }

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef)
    if (!snap.exists) throw new Error('crediterWallet: utilisateur introuvable')
    const d = snap.data()!
    const cashAvant: number = d.wallets?.cash ?? 0
    const creditsAvant: number = d.wallets?.credits_services ?? 0
    const revAvant: number = d.rev_lifetime ?? 0
    const ancienGrade: PortailGrade = (d.grade ?? 'START') as PortailGrade
    const newRev = revAvant + payout.rev_gagnes
    const nouveauGrade = getGradeFromRev(newRev)
    const changed = nouveauGrade !== ancienGrade
    const now = new Date().toISOString()
    gradeChange = { ancien: ancienGrade, nouveau: nouveauGrade, changed, changed_at: changed ? now : undefined }

    const updates: Record<string, unknown> = {
      'wallets.cash': FieldValue.increment(payout.cash),
      'wallets.credits_services': FieldValue.increment(payout.credits_services),
      rev_lifetime: FieldValue.increment(payout.rev_gagnes),
      grade: nouveauGrade,
    }
    if (changed) updates.grade_change = { ancien: ancienGrade, nouveau: nouveauGrade, changed_at: FieldValue.serverTimestamp() }
    tx.update(userRef, updates)

    const opRef = userRef.collection('wallet_operations').doc()
    tx.set(opRef, {
      uid,
      transaction_id,
      type: 'CREDIT_COMMISSION' as WalletOpType,
      amount_cash: payout.cash,
      amount_credits: payout.credits_services,
      rev_attribues: payout.rev_gagnes,
      balance_cash_avant: cashAvant,
      balance_cash_apres: cashAvant + payout.cash,
      balance_credits_avant: creditsAvant,
      balance_credits_apres: creditsAvant + payout.credits_services,
      source,
      created_at: FieldValue.serverTimestamp(),
    })
  })

  // Notif grade change (non-bloquant)
  if (gradeChange.changed) {
    fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/portail/notif-whatsapp`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, type: 'NOUVEAU_GRADE', data: { grade: gradeChange.nouveau } }),
    }).catch(() => {})
  }

  return { success: true, payout, grade_change: gradeChange }
}

// ─── demanderRetrait ──────────────────────────────────────────────────────────
// Vérifie solde → crée doc retraits_demandes → notif admin
export async function demanderRetrait(
  uid: string,
  montant: number,
  telephone_om: string,
  wallet_type: 'cash' | 'credits_services'
): Promise<string> {
  if (montant < 5_000) throw new Error('Montant minimum : 5 000 FCFA')
  const db = getDb()
  const snap = await db.collection('portail_users').doc(uid).get()
  if (!snap.exists) throw new Error('Utilisateur introuvable')
  const solde: number = snap.data()?.wallets?.[wallet_type] ?? 0
  if (solde < montant) throw new Error(`Solde insuffisant (${solde} FCFA disponible)`)

  const ref = await db.collection('retraits_demandes').add({
    uid, montant, telephone_om, wallet_type,
    statut: 'EN_ATTENTE',
    created_at: FieldValue.serverTimestamp(),
  })

  // Notif admin (non-bloquant)
  fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/portail/notif-whatsapp`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: 'admin', type: 'RETRAIT_DEMANDE', data: { uid, montant, telephone_om, wallet_type, demande_id: ref.id } }),
  }).catch(() => {})

  return ref.id
}

// ─── crediterPrime ────────────────────────────────────────────────────────────
// Pour primes Fast Start : crédit cash uniquement, log CREDIT_PRIME
export async function crediterPrime(
  uid: string,
  montant: number,
  source: string,
  refId: string
): Promise<void> {
  const db = getDb()
  const userRef = db.collection('portail_users').doc(uid)
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef)
    if (!snap.exists) throw new Error('crediterPrime: utilisateur introuvable')
    const cashAvant: number = snap.data()?.wallets?.cash ?? 0
    tx.update(userRef, { 'wallets.cash': FieldValue.increment(montant) })
    const opRef = userRef.collection('wallet_operations').doc()
    tx.set(opRef, {
      uid, transaction_id: refId, type: 'CREDIT_PRIME' as WalletOpType,
      amount_cash: montant, amount_credits: 0, rev_attribues: 0,
      balance_cash_avant: cashAvant, balance_cash_apres: cashAvant + montant,
      balance_credits_avant: 0, balance_credits_apres: 0,
      source, created_at: FieldValue.serverTimestamp(),
    })
  })
}

// ─── getWallets ───────────────────────────────────────────────────────────────
export async function getWallets(uid: string) {
  const snap = await getDb().collection('portail_users').doc(uid).get()
  if (!snap.exists) return { cash: 0, credits_services: 0, rev_lifetime: 0 }
  const d = snap.data()!
  return { cash: d.wallets?.cash ?? 0, credits_services: d.wallets?.credits_services ?? 0, rev_lifetime: d.rev_lifetime ?? 0 }
}

// ─── getWalletHistory ─────────────────────────────────────────────────────────
export async function getWalletHistory(uid: string, limit = 20) {
  const snap = await getDb().collection('portail_users').doc(uid)
    .collection('wallet_operations').orderBy('created_at', 'desc').limit(limit).get()
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
