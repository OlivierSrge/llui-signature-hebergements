// ── Valeurs par défaut (fallback si Firestore inaccessible) ────────────────
export const SEUIL_ESCALADE_ADMIN = 100000   // FCFA
export const FENETRE_ADMIN_MINUTES = 120     // 2 heures
export const ACOMPTE_LLUI_PERCENT  = 0.30   // 30 %

// ── Types ────────────────────────────────────────────────────────────────
export interface ReservationRules {
  seuilEscaladeAdmin: number
  fenetreAdminMinutes: number
  acompteLluiPercent: number
}
