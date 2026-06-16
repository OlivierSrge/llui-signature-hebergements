export type NiveauLoyalte = 'bronze' | 'argent' | 'or' | 'diamant'
export type StatutProgram = 'DRAFT' | 'ACTIVE' | 'PAUSED'
export type StatutCard = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'REJECTED'
export type TypeTransaction = 'ACHAT_CARTE' | 'POINTS_AJOUTES' | 'RENOUVELLEMENT' | 'PAIEMENT'

export interface Niveau {
  id: string
  nom: string
  couleur: string
  emoji: string
  seuil_points: number
  avantages: string[]
  /** Prix d'achat de la carte à ce niveau */
  prix_fcfa?: number
  prix_eur?: number
}

export interface LoyaltyProgram {
  program_id: string
  partenaire_id: string
  /** Type de partenaire propriétaire du programme. Défaut : 'prescripteur' (rétro-compatibilité) */
  partenaire_type?: 'hebergement' | 'prescripteur'
  /** Nom du partenaire — cache Firestore pour éviter une requête supplémentaire */
  partenaire_name?: string
  nom: string
  description: string
  logo_url?: string
  niveaux: Niveau[]
  prix_fcfa: number
  prix_eur?: number
  duree_validite_mois: number
  commission_lui_percent: number
  commission_partner_percent: number
  statut: StatutProgram
  created_at: Date
  created_by: string
  paused_at?: Date
  updated_at: Date
  /** FCFA nécessaires pour obtenir 1 point. Défaut : 10 000 */
  taux_fcfa_par_point?: number
}

export interface LoyaltyCard {
  card_id: string
  program_id: string
  programme_nom?: string
  partenaire_id: string
  client_id: string
  client_email: string
  client_nom: string
  client_prenom?: string
  client_phone?: string
  niveau_actuel: string
  points_cumules: number
  nombre_utilisations: number
  qr_code_data: string
  qr_code_url?: string
  commission_lui_percent: number
  commission_partner_percent: number
  created_at: Date
  expires_at: Date
  statut: StatutCard
  order_id?: string
  montant_achat: number
  updated_at: Date
  // Champs validation PENDING → ACTIVE
  confirmation_token?: string
  confirmation_token_expires_at?: Date
  confirmed_at?: Date | null
  confirmed_by_admin?: string | null
  /** Niveau choisi par le client à l'achat */
  niveau_initial?: string
  /** Prix payé pour ce niveau */
  prix_achat_fcfa?: number
  prix_achat_eur?: number
}

export interface LoyaltyTransaction {
  transaction_id: string
  card_id: string | null
  program_id: string | null
  partenaire_id: string
  type: TypeTransaction
  points_ajoutes: number
  montant_depense?: number
  commission_lui?: number
  commission_partner?: number
  description: string
  created_at: Date
  created_by?: string
}

export interface LoyaltyProgramStats {
  total_cartes: number
  cartes_actives: number
  ca_total: number
  commission_partenaire: number
  points_distribues: number
  clients_actifs: number
}
