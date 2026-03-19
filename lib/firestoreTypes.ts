// lib/firestoreTypes.ts
// Interfaces Firestore — Portail L&Lui Signature
// Collections : portail_users / transactions / commissions

import type { Timestamp } from 'firebase-admin/firestore'
import type { PortailGrade } from '@/lib/portailGrades'

// ─── UserProfile ─────────────────────────────────────────────
export interface UserProfile {
  uid: string
  role: 'MARIÉ' | 'PARTENAIRE' | 'INVITÉ' | 'ADMIN'
  parent_id: string | null      // Parrain (niveau 1 au-dessus)
  grade: PortailGrade
  rev_lifetime: number
  wallets: {
    cash: number              // 70% des commissions — retirable
    credits_services: number  // 30% — utilisable en services L&Lui
  }
  fast_start: {
    enrolled_at: Timestamp | null
    palier_30_unlocked: boolean
    palier_60_unlocked: boolean
    palier_90_unlocked: boolean
    palier_30_claimed: boolean
    palier_60_claimed: boolean
    palier_90_claimed: boolean
  }
  displayName: string
  phone: string
  created_at: Timestamp
}

// ─── Transaction ─────────────────────────────────────────────
export interface Transaction {
  id: string
  buyer_id: string             // UID de l'acheteur
  amount_ht: number            // Montant HT en FCFA
  type: 'BOUTIQUE' | 'PACK_MARIAGE'
  ref_guest_id: string | null  // ID invité si parrainage
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED'
  created_at: Timestamp
}

// ─── Commission ───────────────────────────────────────────────
export interface Commission {
  id: string
  transaction_id: string
  beneficiary_id: string       // UID du bénéficiaire (parrain N1 ou N2)
  level: 1 | 2
  amount_cash: number          // 70% de la commission brute
  amount_credits: number       // 30% de la commission brute
  rev_attribues: number
  created_at: Timestamp
}

// ─── Wallet operation (sous-collection) ──────────────────────
export interface WalletOperation {
  id: string
  user_id: string
  type: 'CREDIT' | 'DEBIT'
  amount: number
  wallet: 'cash' | 'credits_services'
  description: string
  ref_commission_id: string | null
  created_at: Timestamp
}
