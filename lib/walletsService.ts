// lib/walletsService.ts
// Wallets atomic Firestore — L&Lui Signature Portail
// Toutes les mutations de wallet passent par ce service (runTransaction ou FieldValue.increment)
// NE JAMAIS modifier wallets directement depuis une page ou action sans passer par ici

import { getDb } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { getGradeFromRev } from '@/lib/calculatePayout'
import type { WalletOperation } from '@/lib/firestoreTypes'

export type WalletKey = 'cash' | 'credits_services'

// ─── Credit simple (FieldValue.increment — safe en parallèle) ────────────────
export async function creditWallet(
  uid: string,
  wallet: WalletKey,
  amount: number,
  description: string,
  refCommissionId: string | null = null
): Promise<void> {
  if (amount <= 0) throw new Error('creditWallet: amount doit être positif')
  const db = getDb()
  const userRef = db.collection('portail_users').doc(uid)
  const logRef = userRef.collection('wallet_operations').doc()
  const batch = db.batch()
  batch.update(userRef, { [`wallets.${wallet}`]: FieldValue.increment(amount) })
  const op: Omit<WalletOperation, 'id'> = {
    user_id: uid,
    type: 'CREDIT',
    amount,
    wallet,
    description,
    ref_commission_id: refCommissionId,
    created_at: FieldValue.serverTimestamp() as WalletOperation['created_at'],
  }
  batch.set(logRef, op)
  await batch.commit()
}

// ─── Debit atomique (runTransaction — vérifie solde suffisant) ────────────────
export async function debitWallet(
  uid: string,
  wallet: WalletKey,
  amount: number,
  description: string,
  refCommissionId: string | null = null
): Promise<void> {
  if (amount <= 0) throw new Error('debitWallet: amount doit être positif')
  const db = getDb()
  const userRef = db.collection('portail_users').doc(uid)
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef)
    if (!snap.exists) throw new Error('debitWallet: utilisateur introuvable')
    const solde: number = snap.data()?.wallets?.[wallet] ?? 0
    if (solde < amount) throw new Error(`debitWallet: solde insuffisant (${solde} < ${amount})`)
    const logRef = userRef.collection('wallet_operations').doc()
    tx.update(userRef, { [`wallets.${wallet}`]: FieldValue.increment(-amount) })
    const op: Omit<WalletOperation, 'id'> = {
      user_id: uid,
      type: 'DEBIT',
      amount,
      wallet,
      description,
      ref_commission_id: refCommissionId,
      created_at: FieldValue.serverTimestamp() as WalletOperation['created_at'],
    }
    tx.set(logRef, op)
  })
}

// ─── Apply commission (atomique : cash + credits + REV + grade) ───────────────
// Appeler après validation d'une transaction boutique ou pack mariage
export async function applyCommission(
  uid: string,
  amountCash: number,
  amountCredits: number,
  revAttribues: number,
  description: string,
  refCommissionId: string | null = null
): Promise<void> {
  if (amountCash < 0 || amountCredits < 0 || revAttribues < 0)
    throw new Error('applyCommission: montants négatifs interdits')
  const db = getDb()
  const userRef = db.collection('portail_users').doc(uid)
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef)
    if (!snap.exists) throw new Error('applyCommission: utilisateur introuvable')
    const d = snap.data()!
    const newRev: number = (d.rev_lifetime ?? 0) + revAttribues
    const newGrade = getGradeFromRev(newRev)
    tx.update(userRef, {
      'wallets.cash': FieldValue.increment(amountCash),
      'wallets.credits_services': FieldValue.increment(amountCredits),
      rev_lifetime: FieldValue.increment(revAttribues),
      grade: newGrade,
    })
    // Log cash
    if (amountCash > 0) {
      const logCash = userRef.collection('wallet_operations').doc()
      const opCash: Omit<WalletOperation, 'id'> = {
        user_id: uid,
        type: 'CREDIT',
        amount: amountCash,
        wallet: 'cash',
        description,
        ref_commission_id: refCommissionId,
        created_at: FieldValue.serverTimestamp() as WalletOperation['created_at'],
      }
      tx.set(logCash, opCash)
    }
    // Log credits
    if (amountCredits > 0) {
      const logCredits = userRef.collection('wallet_operations').doc()
      const opCredits: Omit<WalletOperation, 'id'> = {
        user_id: uid,
        type: 'CREDIT',
        amount: amountCredits,
        wallet: 'credits_services',
        description,
        ref_commission_id: refCommissionId,
        created_at: FieldValue.serverTimestamp() as WalletOperation['created_at'],
      }
      tx.set(logCredits, opCredits)
    }
  })
}

// ─── Lecture wallets (snapshot simple) ───────────────────────────────────────
export async function getWallets(uid: string): Promise<{
  cash: number
  credits_services: number
  rev_lifetime: number
}> {
  const db = getDb()
  const snap = await db.collection('portail_users').doc(uid).get()
  if (!snap.exists) return { cash: 0, credits_services: 0, rev_lifetime: 0 }
  const d = snap.data()!
  return {
    cash: d.wallets?.cash ?? 0,
    credits_services: d.wallets?.credits_services ?? 0,
    rev_lifetime: d.rev_lifetime ?? 0,
  }
}

// ─── Historique opérations (50 dernières) ────────────────────────────────────
export async function getWalletHistory(uid: string): Promise<(WalletOperation & { id: string })[]> {
  const db = getDb()
  const snap = await db
    .collection('portail_users')
    .doc(uid)
    .collection('wallet_operations')
    .orderBy('created_at', 'desc')
    .limit(50)
    .get()
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WalletOperation & { id: string }))
}
