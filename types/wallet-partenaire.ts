export type TypeVente = 'boutique' | 'mariage' | 'hebergement';
export type NiveauCommission = 1 | 2 | 3;
export type StatutCommission = 'pending' | 'validee' | 'annulee';
export type StatutRetrait = 'demande' | 'validee' | 'refusee';
export type OperateurMobileMoney = 'MTN' | 'Orange';

// REV : 1 REV = 10 000 FCFA CA boutique/hébergement
//       1 REV = 100 000 FCFA CA mariage
// Commissions au paiement effectif (acomptes inclus)
// Différentiel grade strict obligatoire
// Déblocage : START=rien BRONZE=N1 ARGENT=N1+N2 OR+=N1+N2+N3

export const TAUX_COMMISSION: Record<TypeVente, Record<NiveauCommission, number>> = {
  boutique:    { 1: 0.10,  2: 0.05,  3: 0.02  },
  mariage:     { 1: 0.012, 2: 0.005, 3: 0.002 },
  hebergement: { 1: 0.02,  2: 0.01,  3: 0.005 },
};

export const REV_PAR_FCFA: Record<TypeVente, number> = {
  boutique:    10000,
  mariage:    100000,
  hebergement: 10000,
};

export const NIVEAUX_DEBLOQUES: Record<string, NiveauCommission[]> = {
  START:   [],
  BRONZE:  [1],
  ARGENT:  [1, 2],
  OR:      [1, 2, 3],
  SAPHIR:  [1, 2, 3],
  DIAMANT: [1, 2, 3],
};

export const GRADE_ORDER_WALLET: Record<string, number> = {
  START: 0, BRONZE: 1, ARGENT: 2,
  OR: 3, SAPHIR: 4, DIAMANT: 5,
};

export interface WalletPartenaire {
  partenaire_id: string;
  cash: number;
  credits: number;
  cash_en_attente: number;
  credits_en_attente: number;
  rev_total: number;
  grade_actuel: string;
  updated_at: string;
}

export interface CommissionPartenaire {
  id: string;
  partenaire_id: string;
  partenaire_source_id: string;
  partenaire_source_grade: string;
  type_vente: TypeVente;
  niveau: NiveauCommission;
  montant_vente: number;
  taux_commission: number;
  montant_commission: number;
  montant_cash: number;
  montant_credits: number;
  rev_generes: number;
  statut: StatutCommission;
  reference_vente: string;
  created_at: string;
  validee_at?: string;
}

export interface RetraitPartenaire {
  id: string;
  partenaire_id: string;
  partenaire_nom?: string;
  montant: number;
  operateur: OperateurMobileMoney;
  numero_mobile_money: string;
  statut: StatutRetrait;
  note_admin?: string;
  created_at: string;
  traitee_at?: string;
}

export interface WalletAvecPartenaire extends WalletPartenaire {
  partenaire_nom: string;
  partenaire_type: string;
  retraits_en_attente: number;
}
