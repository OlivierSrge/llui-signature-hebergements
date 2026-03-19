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
    deadline_30j: Timestamp | null
    deadline_60j: Timestamp | null
    deadline_90j: Timestamp | null
    palier_30_unlocked: boolean
    palier_60_unlocked: boolean
    palier_90_unlocked: boolean
    palier_30_claimed: boolean
    palier_60_claimed: boolean
    palier_90_claimed: boolean
    palier_30_expire: boolean
    palier_60_expire: boolean
    palier_90_expire: boolean
    palier_30_valide_admin: boolean
    palier_60_valide_admin: boolean
    palier_90_valide_admin: boolean
    palier_30_paye: boolean
    palier_60_paye: boolean
    palier_90_paye: boolean
    total_primes_validees: number
    total_primes_payees: number
  }
  displayName: string
  phone: string
  invites_confirmes: number
  projet?: {
    nom: string
    date_evenement: Timestamp | null
    lieu: string
    budget_previsionnel: number
    nombre_invites_prevu: number
  }
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

// ─── FastStart Demande (collection fast_start_demandes) ──────
export interface FastStartDemande {
  id: string
  uid: string
  nom_complet: string
  telephone_om: string
  palier: 30 | 60 | 90
  rev_au_moment: number
  montant_prime: number
  atteint_at: Timestamp
  deadline_palier: Timestamp
  statut: 'EN_ATTENTE' | 'VALIDEE' | 'PAYEE' | 'REJETEE'
  valide_par?: string
  valide_at?: Timestamp
  paye_at?: Timestamp
  reference_om?: string
  note_admin?: string
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
