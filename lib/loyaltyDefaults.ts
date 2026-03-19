// ============================================================
// Valeurs par défaut du programme de fidélité L&Lui Stars
// Source de vérité — toujours chargées depuis Firestore d'abord,
// ces valeurs servent uniquement de fallback. Jamais de champ vide.
// ============================================================

export const LOYALTY_DEFAULTS = {
  pointsFirstBooking: 500,
  pointsPerNight: 100,
  pointsEarlyPayment: 200,
  pointsReferral: 1000,
  pointsReview: 300,
  pointsAnniversary: 500,
  pointsStayAnniversary: 500,
  pointsPerBoutiqueSpend: 10,
  programActive: true,
}

export type LoyaltyConfig = typeof LOYALTY_DEFAULTS

export const LOYALTY_LEVELS = {
  novice: {
    minStays: 0, maxStays: 2,
    discountAccommodation: 0, discountBoutique: 5,
    color: '#A0A0A0', label: 'Novice', emoji: '⭐',
    promoValidityDays: 90,
    upgradeMessage: `Bienvenue dans le programme L&Lui Stars, {{NOM_CLIENT}} ! 🌟\n\nVous êtes désormais membre {{NIVEAU}}. Profitez de {{REDUCTION_BOUTIQUE}}% de réduction sur la boutique.\n\n🎁 Code promo : {{CODE_PROMO}}\n👉 http://l-et-lui-signature.com\n\nMerci de votre fidélité ! L'équipe L&Lui Signature 🌺`,
  },
  explorateur: {
    minStays: 3, maxStays: 6,
    discountAccommodation: 8, discountBoutique: 10,
    color: '#4A90D9', label: 'Explorateur', emoji: '⭐⭐',
    promoValidityDays: 90,
    upgradeMessage: `Félicitations {{NOM_CLIENT}} ! 🎉\n\nVous venez de passer au niveau {{NIVEAU}} ⭐⭐\n\n✨ Vos avantages :\n- {{REDUCTION_HEBERGEMENT}}% sur tous nos hébergements\n- {{REDUCTION_BOUTIQUE}}% sur la boutique\n\n🎁 Nouveau code promo : {{CODE_PROMO}}\n👉 http://l-et-lui-signature.com\n\nMerci ! L'équipe L&Lui Signature 🌺`,
  },
  ambassadeur: {
    minStays: 7, maxStays: 12,
    discountAccommodation: 12, discountBoutique: 15,
    color: '#C9A84C', label: 'Ambassadeur', emoji: '⭐⭐⭐',
    promoValidityDays: 90,
    upgradeMessage: `Bravo {{NOM_CLIENT}} ! 🏆\n\nVous êtes maintenant {{NIVEAU}} ⭐⭐⭐\n\n✨ Vos avantages exclusifs :\n- {{REDUCTION_HEBERGEMENT}}% sur tous nos hébergements\n- {{REDUCTION_BOUTIQUE}}% sur la boutique\n- Surclassement gratuit si disponible\n\n🎁 Code exclusif : {{CODE_PROMO}}\n👉 http://l-et-lui-signature.com\n\nMerci pour votre fidélité ! L'équipe L&Lui Signature 🌺`,
  },
  excellence: {
    minStays: 13, maxStays: null,
    discountAccommodation: 15, discountBoutique: 20,
    color: '#1A1A1A', label: 'Excellence', emoji: '👑',
    promoValidityDays: 120,
    upgradeMessage: `Très cher(e) {{NOM_CLIENT}} 👑\n\nC'est un honneur de vous accueillir au niveau {{NIVEAU}} du programme L&Lui Stars.\n\n✨ Vos privilèges VIP :\n- {{REDUCTION_HEBERGEMENT}}% sur tous nos hébergements\n- {{REDUCTION_BOUTIQUE}}% sur la boutique\n- Conciergerie personnalisée 24h/24\n\n🎁 Code premium : {{CODE_PROMO}}\n👉 http://l-et-lui-signature.com\n\nNous vous réservons le meilleur ! L'équipe L&Lui Signature 🌺`,
  },
}

export type LoyaltyLevelsConfig = typeof LOYALTY_LEVELS
export type LoyaltyLevelKey = keyof typeof LOYALTY_LEVELS

export const PROMO_CODE_DEFAULTS = {
  validityDays: 90,
  codeLength: 5,
  prefixes: {
    novice:      'STARS-NOV-',
    explorateur: 'STARS-EXP-',
    ambassadeur: 'STARS-AMB-',
    excellence:  'STARS-EXC-',
  },
}
