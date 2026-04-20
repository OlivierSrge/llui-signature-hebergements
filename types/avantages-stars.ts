export type StarsGradeMinimum =
  | 'START'
  | 'BRONZE'
  | 'ARGENT'
  | 'OR'
  | 'SAPHIR'
  | 'DIAMANT'

export interface AvantageStars {
  id: string
  emoji: string
  label: string
  categorie: string
  grade_minimum: StarsGradeMinimum
  actif: boolean
}

export interface ConfigAvantagesPartenaire {
  partenaire_id: string
  taux_remise: Record<StarsGradeMinimum, number>
  avantages: AvantageStars[]
  updated_at: string
}

export const PLANCHERS_REMISE: Record<StarsGradeMinimum, number> = {
  START: 2,
  BRONZE: 4,
  ARGENT: 6,
  OR: 8,
  SAPHIR: 10,
  DIAMANT: 15,
}

export const GRADE_ORDER: StarsGradeMinimum[] = [
  'START', 'BRONZE', 'ARGENT', 'OR', 'SAPHIR', 'DIAMANT',
]

export const AVANTAGES_DISPONIBLES: Omit<AvantageStars, 'grade_minimum' | 'actif'>[] = [
  // 🎁 Cadeaux & Surprises
  { id: 'cadeau_bienvenue', emoji: '🎁', label: 'Cadeau de bienvenue offert à chaque visite', categorie: 'Cadeaux & Surprises' },
  { id: 'emballage_premium', emoji: '🎀', label: 'Emballage cadeau premium offert', categorie: 'Cadeaux & Surprises' },
  { id: 'cadeau_anniversaire', emoji: '🎂', label: 'Cadeau spécial anniversaire offert le jour J', categorie: 'Cadeaux & Surprises' },
  { id: 'surprise_premiere', emoji: '🎊', label: "Surprise maison offerte à la première visite", categorie: 'Cadeaux & Surprises' },
  { id: 'article_offert', emoji: '🛍️', label: "Produit ou article offert dès un montant défini", categorie: 'Cadeaux & Surprises' },
  // 🍽️ Restauration & Boissons
  { id: 'boisson_bienvenue', emoji: '🥂', label: 'Boisson de bienvenue offerte', categorie: 'Restauration & Boissons' },
  { id: 'cafe_offert', emoji: '☕', label: 'Café ou thé offert', categorie: 'Restauration & Boissons' },
  { id: 'dessert_offert', emoji: '🍮', label: 'Dessert offert en fin de prestation', categorie: 'Restauration & Boissons' },
  { id: 'plat_offert', emoji: '🍽️', label: 'Plat ou spécialité maison offert', categorie: 'Restauration & Boissons' },
  { id: 'bouteille_offerte', emoji: '🍾', label: 'Bouteille offerte pour occasions spéciales', categorie: 'Restauration & Boissons' },
  // ⏰ Priorité & Confort
  { id: 'accueil_prioritaire', emoji: '🪑', label: 'Accueil prioritaire — zéro attente', categorie: 'Priorité & Confort' },
  { id: 'reservation_prioritaire', emoji: '📅', label: 'Réservation prioritaire garantie', categorie: 'Priorité & Confort' },
  { id: 'espace_calme', emoji: '🔇', label: 'Espace calme et confortable réservé', categorie: 'Priorité & Confort' },
  { id: 'service_personnalise', emoji: '🛎️', label: 'Service personnalisé et attentionné', categorie: 'Priorité & Confort' },
  { id: 'acces_vip', emoji: '👑', label: 'Accès espace VIP privatisé', categorie: 'Priorité & Confort' },
  // 💰 Remises & Avantages Financiers
  { id: 'remise_prochaine', emoji: '🏷️', label: 'Remise supplémentaire sur la prochaine visite', categorie: 'Remises & Avantages Financiers' },
  { id: 'bon_achat', emoji: '💳', label: "Bon d'achat offert dès un montant dépensé", categorie: 'Remises & Avantages Financiers' },
  { id: 'offres_exclusives', emoji: '🔐', label: 'Accès offres et promotions exclusives Stars', categorie: 'Remises & Avantages Financiers' },
  { id: 'prix_preferentiel', emoji: '💰', label: 'Prix préférentiel sur commandes spéciales', categorie: 'Remises & Avantages Financiers' },
  { id: 'reduction_suivante', emoji: '🎟️', label: 'Réduction sur prestation ou activité suivante', categorie: 'Remises & Avantages Financiers' },
  // 🚀 Services Premium
  { id: 'transport_offert', emoji: '🚗', label: 'Transport ou transfert offert', categorie: 'Services Premium' },
  { id: 'livraison_gratuite', emoji: '🚚', label: 'Livraison gratuite à domicile', categorie: 'Services Premium' },
  { id: 'photo_souvenir', emoji: '📸', label: 'Séance photo souvenir offerte', categorie: 'Services Premium' },
  { id: 'personnalisation', emoji: '🎨', label: 'Personnalisation gratuite sur demande', categorie: 'Services Premium' },
  { id: 'alerte_whatsapp', emoji: '🔔', label: 'Alertes WhatsApp pour offres exclusives', categorie: 'Services Premium' },
  // ✨ Expériences Exclusives
  { id: 'avant_premiere', emoji: '🌟', label: 'Accès avant-première nouveautés et collections', categorie: 'Expériences Exclusives' },
  { id: 'visite_privee', emoji: '🔭', label: 'Visite ou découverte privée hors groupes', categorie: 'Expériences Exclusives' },
  { id: 'experience_surmesure', emoji: '👑', label: "Expérience sur-mesure pour occasions spéciales", categorie: 'Expériences Exclusives' },
  { id: 'activite_decouverte', emoji: '🌿', label: 'Activité découverte offerte', categorie: 'Expériences Exclusives' },
  { id: 'animation_speciale', emoji: '🎵', label: 'Animation ou ambiance spéciale sur réservation', categorie: 'Expériences Exclusives' },
  // ⬆️ Upgrades & Bonus
  { id: 'surclassement', emoji: '⬆️', label: 'Surclassement automatique selon disponibilité', categorie: 'Upgrades & Bonus' },
  { id: 'prolongation', emoji: '⏳', label: 'Prolongation de service offerte', categorie: 'Upgrades & Bonus' },
  { id: 'produit_prestation', emoji: '🧴', label: 'Produit ou consommable offert pendant la prestation', categorie: 'Upgrades & Bonus' },
  { id: 'flexibilite_horaire', emoji: '🌅', label: 'Flexibilité horaire sur demande', categorie: 'Upgrades & Bonus' },
  { id: 'prestation_premium', emoji: '🎯', label: 'Prestation premium incluse sans supplément', categorie: 'Upgrades & Bonus' },
]
