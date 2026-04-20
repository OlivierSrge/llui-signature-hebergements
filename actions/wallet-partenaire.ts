'use server'
// actions/wallet-partenaire.ts
// Portefeuille commission partenaires prescripteurs — 8 actions
// Collection Firestore : wallets_partenaires, commissions_partenaires, retraits_partenaires

import { db } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { serializeFirestoreDoc } from '@/lib/serialization'
import {
  TAUX_COMMISSION,
  REV_PAR_FCFA,
  NIVEAUX_DEBLOQUES,
  GRADE_ORDER_WALLET,
  type WalletPartenaire,
  type CommissionPartenaire,
  type RetraitPartenaire,
  type WalletAvecPartenaire,
  type TypeVente,
  type NiveauCommission,
  type OperateurMobileMoney,
} from '@/types/wallet-partenaire'

const SPLIT_CASH    = 0.70
const SPLIT_CREDITS = 0.30

// ─── Helpers ──────────────────────────────────────────────────────────────────

function gradeFromRev(rev: number): string {
  if (rev >= 150_001) return 'DIAMANT'
  if (rev >= 75_001)  return 'SAPHIR'
  if (rev >= 35_001)  return 'OR'
  if (rev >= 15_001)  return 'ARGENT'
  if (rev >= 5_001)   return 'BRONZE'
  return 'START'
}

function buildWallet(id: string, data: Record<string, unknown>): WalletPartenaire {
  return {
    partenaire_id: id,
    cash: (data.cash as number) ?? 0,
    credits: (data.credits as number) ?? 0,
    cash_en_attente: (data.cash_en_attente as number) ?? 0,
    credits_en_attente: (data.credits_en_attente as number) ?? 0,
    rev_total: (data.rev_total as number) ?? 0,
    grade_actuel: (data.grade_actuel as string) ?? 'START',
    updated_at: (data.updated_at as string) ?? new Date().toISOString(),
  }
}

// ─── 1. getWalletPartenaire ───────────────────────────────────────────────────

export async function getWalletPartenaire(partenaire_id: string): Promise<WalletPartenaire> {
  const ref = db.collection('wallets_partenaires').doc(partenaire_id)
  const snap = await ref.get()
  if (snap.exists) return buildWallet(partenaire_id, serializeFirestoreDoc(snap.data()!))

  // Création automatique si absent
  const now = new Date().toISOString()
  const init = {
    partenaire_id,
    cash: 0, credits: 0,
    cash_en_attente: 0, credits_en_attente: 0,
    rev_total: 0, grade_actuel: 'START',
    created_at: now, updated_at: now,
  }
  await ref.set(init)
  return buildWallet(partenaire_id, init)
}

// ─── 2. getCommissionsPartenaire ──────────────────────────────────────────────

export async function getCommissionsPartenaire(
  partenaire_id: string,
  limit = 20
): Promise<CommissionPartenaire[]> {
  const snap = await db.collection('commissions_partenaires')
    .where('partenaire_id', '==', partenaire_id)
    .orderBy('created_at', 'desc')
    .limit(limit)
    .get()

  return snap.docs.map((doc) => {
    const d = serializeFirestoreDoc(doc.data())
    return {
      id: doc.id,
      partenaire_id: d.partenaire_id as string,
      partenaire_source_id: d.partenaire_source_id as string,
      partenaire_source_grade: (d.partenaire_source_grade as string) ?? 'START',
      type_vente: d.type_vente as TypeVente,
      niveau: d.niveau as NiveauCommission,
      montant_vente: (d.montant_vente as number) ?? 0,
      taux_commission: (d.taux_commission as number) ?? 0,
      montant_commission: (d.montant_commission as number) ?? 0,
      montant_cash: (d.montant_cash as number) ?? 0,
      montant_credits: (d.montant_credits as number) ?? 0,
      rev_generes: (d.rev_generes as number) ?? 0,
      statut: (d.statut as CommissionPartenaire['statut']) ?? 'pending',
      reference_vente: (d.reference_vente as string) ?? '',
      created_at: (d.created_at as string) ?? new Date().toISOString(),
      validee_at: d.validee_at as string | undefined,
    }
  })
}

// ─── 3. creerCommissionPartenaire ─────────────────────────────────────────────
// Crée la commission ET crédite le wallet atomiquement.
// type_vente, montant_vente, niveau, partenaire_source_id, partenaire_source_grade

export interface CreerCommissionParams {
  partenaire_id: string
  partenaire_source_id: string
  partenaire_source_grade: string
  type_vente: TypeVente
  niveau: NiveauCommission
  montant_vente: number
  reference_vente: string
}

export async function creerCommissionPartenaire(params: CreerCommissionParams): Promise<CommissionPartenaire> {
  const {
    partenaire_id, partenaire_source_id, partenaire_source_grade,
    type_vente, niveau, montant_vente, reference_vente,
  } = params

  // Vérifier que le niveau est débloqué par le grade
  const niveauxDebloques = NIVEAUX_DEBLOQUES[partenaire_source_grade] ?? []
  if (!niveauxDebloques.includes(niveau)) {
    throw new Error(`Niveau ${niveau} non débloqué pour le grade ${partenaire_source_grade}`)
  }

  const taux = TAUX_COMMISSION[type_vente][niveau]
  const montant_commission = Math.round(montant_vente * taux)
  const montant_cash    = Math.round(montant_commission * SPLIT_CASH)
  const montant_credits = Math.round(montant_commission * SPLIT_CREDITS)
  const rev_generes     = Math.floor(montant_vente / REV_PAR_FCFA[type_vente])
  const now = new Date().toISOString()

  const walletRef = db.collection('wallets_partenaires').doc(partenaire_id)
  const commRef   = db.collection('commissions_partenaires').doc()

  await db.runTransaction(async (tx) => {
    const walletSnap = await tx.get(walletRef)
    const revAvant: number = walletSnap.exists ? (walletSnap.data()!.rev_total ?? 0) : 0
    const newRev = revAvant + rev_generes
    const nouveauGrade = gradeFromRev(newRev)

    const walletUpdate: Record<string, unknown> = {
      partenaire_id,
      cash:    FieldValue.increment(montant_cash),
      credits: FieldValue.increment(montant_credits),
      rev_total:    FieldValue.increment(rev_generes),
      grade_actuel: nouveauGrade,
      updated_at: now,
    }
    if (!walletSnap.exists) {
      walletUpdate.created_at = now
      walletUpdate.cash_en_attente = 0
      walletUpdate.credits_en_attente = 0
    }
    tx.set(walletRef, walletUpdate, { merge: true })

    tx.set(commRef, {
      partenaire_id, partenaire_source_id, partenaire_source_grade,
      type_vente, niveau, montant_vente,
      taux_commission: taux, montant_commission,
      montant_cash, montant_credits, rev_generes,
      statut: 'validee',
      reference_vente,
      created_at: now, validee_at: now,
    })
  })

  return {
    id: commRef.id,
    partenaire_id, partenaire_source_id, partenaire_source_grade,
    type_vente, niveau, montant_vente,
    taux_commission: taux, montant_commission,
    montant_cash, montant_credits, rev_generes,
    statut: 'validee',
    reference_vente, created_at: now, validee_at: now,
  }
}

// ─── 4. validerCommission ─────────────────────────────────────────────────────

export async function validerCommission(commission_id: string): Promise<void> {
  const ref = db.collection('commissions_partenaires').doc(commission_id)
  await ref.update({ statut: 'validee', validee_at: new Date().toISOString() })
}

// ─── 5. demanderRetraitPartenaire ─────────────────────────────────────────────

export async function demanderRetraitPartenaire(
  partenaire_id: string,
  montant: number,
  operateur: OperateurMobileMoney,
  numero_mobile_money: string,
): Promise<string> {
  if (montant < 5_000) throw new Error('Montant minimum : 5 000 FCFA')

  const walletSnap = await db.collection('wallets_partenaires').doc(partenaire_id).get()
  const cash: number = walletSnap.exists ? (walletSnap.data()!.cash ?? 0) : 0
  if (cash < montant) throw new Error(`Solde cash insuffisant (${cash} FCFA disponible)`)

  const now = new Date().toISOString()
  const walletRef = db.collection('wallets_partenaires').doc(partenaire_id)
  const retraitRef = db.collection('retraits_partenaires').doc()

  await db.runTransaction(async (tx) => {
    tx.update(walletRef, {
      cash: FieldValue.increment(-montant),
      cash_en_attente: FieldValue.increment(montant),
      updated_at: now,
    })
    tx.set(retraitRef, {
      partenaire_id, montant, operateur,
      numero_mobile_money, statut: 'demande',
      created_at: now,
    })
  })

  // Notif admin non-bloquante
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'
  fetch(`${APP_URL}/api/whatsapp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.ADMIN_API_KEY}` },
    body: JSON.stringify({
      to: process.env.ADMIN_WHATSAPP_PHONE,
      message: `💰 Demande retrait partenaire\nID: ${partenaire_id}\nMontant: ${montant} FCFA\nOpérateur: ${operateur}\nNuméro: ${numero_mobile_money}`,
    }),
  }).catch(() => {})

  return retraitRef.id
}

// ─── 6. getRetraitsPartenaire ─────────────────────────────────────────────────

export async function getRetraitsPartenaire(partenaire_id: string, limit = 10): Promise<RetraitPartenaire[]> {
  const snap = await db.collection('retraits_partenaires')
    .where('partenaire_id', '==', partenaire_id)
    .orderBy('created_at', 'desc')
    .limit(limit)
    .get()

  return snap.docs.map((doc) => {
    const d = serializeFirestoreDoc(doc.data())
    return {
      id: doc.id,
      partenaire_id: d.partenaire_id as string,
      montant: (d.montant as number) ?? 0,
      operateur: (d.operateur as OperateurMobileMoney) ?? 'MTN',
      numero_mobile_money: (d.numero_mobile_money as string) ?? '',
      statut: (d.statut as RetraitPartenaire['statut']) ?? 'demande',
      note_admin: d.note_admin as string | undefined,
      created_at: (d.created_at as string) ?? new Date().toISOString(),
      traitee_at: d.traitee_at as string | undefined,
    }
  })
}

// ─── 7. getAllWalletsAdmin ────────────────────────────────────────────────────

export async function getAllWalletsAdmin(): Promise<WalletAvecPartenaire[]> {
  const [walletsSnap, partenairesSnap, retraitsSnap] = await Promise.all([
    db.collection('wallets_partenaires').get(),
    db.collection('prescripteurs_partenaires').where('statut', '==', 'actif').get(),
    db.collection('retraits_partenaires').where('statut', '==', 'demande').get(),
  ])

  const partenairesMap: Record<string, { nom: string; type: string }> = {}
  for (const doc of partenairesSnap.docs) {
    partenairesMap[doc.id] = {
      nom: (doc.data().nom_etablissement as string) ?? doc.id,
      type: (doc.data().type as string) ?? '',
    }
  }

  const retraitsByPartenaire: Record<string, number> = {}
  for (const doc of retraitsSnap.docs) {
    const pid = doc.data().partenaire_id as string
    retraitsByPartenaire[pid] = (retraitsByPartenaire[pid] ?? 0) + 1
  }

  return walletsSnap.docs.map((doc) => {
    const d = serializeFirestoreDoc(doc.data())
    const partenaire = partenairesMap[doc.id] ?? { nom: doc.id, type: '' }
    return {
      partenaire_id: doc.id,
      cash: (d.cash as number) ?? 0,
      credits: (d.credits as number) ?? 0,
      cash_en_attente: (d.cash_en_attente as number) ?? 0,
      credits_en_attente: (d.credits_en_attente as number) ?? 0,
      rev_total: (d.rev_total as number) ?? 0,
      grade_actuel: (d.grade_actuel as string) ?? 'START',
      updated_at: (d.updated_at as string) ?? '',
      partenaire_nom: partenaire.nom,
      partenaire_type: partenaire.type,
      retraits_en_attente: retraitsByPartenaire[doc.id] ?? 0,
    }
  }).sort((a, b) => (b.cash + b.credits) - (a.cash + a.credits))
}

// ─── 8. traiterRetraitPartenaire ──────────────────────────────────────────────

export async function traiterRetraitPartenaire(
  retrait_id: string,
  statut: 'validee' | 'refusee',
  note_admin?: string,
): Promise<void> {
  const retraitRef = db.collection('retraits_partenaires').doc(retrait_id)
  const snap = await retraitRef.get()
  if (!snap.exists) throw new Error('Retrait introuvable')

  const d = snap.data()!
  if (d.statut !== 'demande') throw new Error('Retrait déjà traité')

  const { partenaire_id, montant } = d
  const now = new Date().toISOString()
  const walletRef = db.collection('wallets_partenaires').doc(partenaire_id as string)

  await db.runTransaction(async (tx) => {
    if (statut === 'validee') {
      tx.update(walletRef, {
        cash_en_attente: FieldValue.increment(-(montant as number)),
        updated_at: now,
      })
    } else {
      // Refusée : remettre le cash en attente dans le solde cash
      tx.update(walletRef, {
        cash: FieldValue.increment(montant as number),
        cash_en_attente: FieldValue.increment(-(montant as number)),
        updated_at: now,
      })
    }
    tx.update(retraitRef, {
      statut,
      note_admin: note_admin ?? null,
      traitee_at: now,
    })
  })
}

// ─── 9. getAllRetraitsAdmin ───────────────────────────────────────────────────
// Bonus : liste tous les retraits pour admin (tous statuts)

export async function getAllRetraitsAdmin(limitVal = 50): Promise<RetraitPartenaire[]> {
  const snap = await db.collection('retraits_partenaires')
    .orderBy('created_at', 'desc')
    .limit(limitVal)
    .get()

  return snap.docs.map((doc) => {
    const d = serializeFirestoreDoc(doc.data())
    return {
      id: doc.id,
      partenaire_id: (d.partenaire_id as string) ?? '',
      partenaire_nom: d.partenaire_nom as string | undefined,
      montant: (d.montant as number) ?? 0,
      operateur: (d.operateur as OperateurMobileMoney) ?? 'MTN',
      numero_mobile_money: (d.numero_mobile_money as string) ?? '',
      statut: (d.statut as RetraitPartenaire['statut']) ?? 'demande',
      note_admin: d.note_admin as string | undefined,
      created_at: (d.created_at as string) ?? '',
      traitee_at: d.traitee_at as string | undefined,
    }
  })
}
