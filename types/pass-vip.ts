export type PassVipGrade = 'ARGENT' | 'OR' | 'SAPHIR' | 'DIAMANT';

export interface PassVipConfig {
  grade: PassVipGrade;
  duree_jours: number;
  prix_fcfa: number;
  sku: string;
}

export const PASS_VIP_CONFIGS: Record<PassVipGrade, PassVipConfig> = {
  ARGENT:  { grade: 'ARGENT',  duree_jours: 7,  prix_fcfa: 3500,  sku: 'PASS-ARGENT-7J'  },
  OR:      { grade: 'OR',      duree_jours: 15, prix_fcfa: 7500,  sku: 'PASS-OR-15J'      },
  SAPHIR:  { grade: 'SAPHIR',  duree_jours: 30, prix_fcfa: 15000, sku: 'PASS-SAPHIR-30J'  },
  DIAMANT: { grade: 'DIAMANT', duree_jours: 30, prix_fcfa: 25000, sku: 'PASS-DIAMANT-30J' },
};

// SKU → grade lookup
export const SKU_TO_GRADE: Record<string, PassVipGrade> = {
  'PASS-ARGENT-7J':   'ARGENT',
  'PASS-OR-15J':      'OR',
  'PASS-SAPHIR-30J':  'SAPHIR',
  'PASS-DIAMANT-30J': 'DIAMANT',
};

// Commissions Pass VIP : 30% fixe réparti
export const TAUX_COMMISSION_PASS: Record<1 | 2 | 3, number> = {
  1: 0.17,
  2: 0.08,
  3: 0.05,
};

// Ordre des grades VIP pour comparaison
export const GRADE_VIP_ORDER: Record<string, number> = {
  START: 0, BRONZE: 1, ARGENT: 2, OR: 3, SAPHIR: 4, DIAMANT: 5,
};

export interface PassVipActif {
  id: string;
  client_uid: string;
  client_telephone: string;
  grade_pass: PassVipGrade;
  grade_naturel: string;
  prix_paye: number;
  sku: string;
  prescripteur_id?: string;
  actif: boolean;
  created_at: string;
  expires_at: string;
  expire_notifie_j3: boolean;
}

// Pass VIP anonyme — vendu via boutique Netlify, pas de client_uid
export interface PassVipAnonyme {
  id: string;             // = token Firestore doc ID
  nom_usage: string;      // nom affiché sur la carte (uppercase)
  grade_pass: PassVipGrade;
  actif: boolean;
  created_at: string;
  expires_at: string;
  nb_utilisations: number;
  prescripteur_id: string | null;
}
