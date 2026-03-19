// ============================================================
// lib/loyaltyNotifications.ts
// Génération des notifications de fidélité L&Lui Stars
// Les notifications sont stockées dans Firestore et envoyées
// MANUELLEMENT via WhatsApp — aucun envoi automatique serveur.
// ============================================================

export type NotificationType =
  | 'level_up'
  | 'expiring_promo'
  | 'birthday'
  | 'stay_anniversary'

export interface LoyaltyNotification {
  id?: string
  clientId: string
  clientName: string
  clientPhone: string | null
  type: NotificationType
  status: 'pending' | 'sent' | 'dismissed'
  message: string
  waUrl: string
  triggeredAt: string
  sentAt?: string | null
  meta?: Record<string, any>
}

// ── Messages WhatsApp ──────────────────────────────────────

export function buildLevelUpMessage(
  firstName: string,
  level: string,
  promoCode: string,
  discountAccommodation: number,
  discountBoutique: number
): string {
  if (level === 'explorateur') {
    return `🎉 Félicitations ${firstName} !\n\nVous venez de passer au niveau ⭐⭐ Explorateur L&Lui Stars !\n\nVos nouveaux avantages :\n🏠 -${discountAccommodation}% sur vos hébergements\n🛍️ -${discountBoutique}% sur la boutique en ligne\n🕐 Late check-out offert jusqu'à 14h\n⚡ Réponse prioritaire sous 2h\n\n🎁 Votre code promo boutique : ${promoCode}\nValable 90 jours sur http://l-et-lui-signature.com\n\nMerci de votre fidélité ! L'équipe L&Lui Signature 🌺`
  }
  if (level === 'ambassadeur') {
    return `👑 Bravo ${firstName} !\n\nVous êtes maintenant ⭐⭐⭐ Ambassadeur L&Lui Stars !\n\nVos avantages exclusifs :\n🏠 -${discountAccommodation}% sur vos hébergements\n🛍️ -${discountBoutique}% sur la boutique en ligne\n🎁 1 nuit offerte tous les 10 séjours\n⬆️ Surclassement gratuit selon disponibilité\n📞 Contact direct WhatsApp avec notre équipe\n🎟️ Invitations aux événements exclusifs L&Lui\n\n🎁 Votre code promo : ${promoCode}\nValable 90 jours sur http://l-et-lui-signature.com\n\nL'équipe L&Lui Signature 🌺`
  }
  if (level === 'excellence') {
    return `💎 Exceptionnel ${firstName} !\n\nVous avez atteint le niveau suprême 👑 Excellence L&Lui Stars !\n\nVos privilèges absolus :\n🏠 -${discountAccommodation}% sur tous vos hébergements\n🛍️ -${discountBoutique}% sur la boutique en ligne\n🛎️ Conciergerie personnalisée 24h/24 - 7j/7\n🔑 Accès aux propriétés exclusives non publiées\n✈️ Transferts aéroport offerts\n💼 Programme ambassadeur rémunéré\n\n🎁 Votre code prestige : ${promoCode}\nValable 90 jours sur http://l-et-lui-signature.com\n\nVous faites partie de notre famille d'exception.\nL'équipe L&Lui Signature 🌺`
  }
  return `🌟 Félicitations ${firstName} ! Vous avez atteint le niveau ${level} L&Lui Stars.\n\n🎁 Code promo : ${promoCode}\nhttp://l-et-lui-signature.com\n\nL'équipe L&Lui Signature 🌺`
}

export function buildExpiringPromoMessage(
  firstName: string,
  promoCode: string,
  reduction: number,
  expiryDate: string
): string {
  return `⏰ ${firstName}, votre code promo expire bientôt !\n\nVotre code ${promoCode} (-${reduction}% boutique) expire le ${expiryDate}.\n\nNe laissez pas passer cet avantage !\n👉 http://l-et-lui-signature.com\n\nL'équipe L&Lui Signature 🌺`
}

export function buildBirthdayMessage(firstName: string): string {
  return `🎂 Joyeux anniversaire ${firstName} !\n\nToute l'équipe L&Lui Signature vous souhaite une magnifique journée !\n\n🎁 Cadeau : +500 points L&Lui Stars viennent d'être crédités sur votre compte.\n\nConsultez votre solde : llui-signature-hebergements.vercel.app/mon-compte\n\nAvec toute notre affection,\nL'équipe L&Lui Signature 🌺`
}

export function buildStayAnniversaryMessage(firstName: string, accommodationName: string): string {
  return `🌊 Il y a un an, vous étiez à Kribi !\n\nBonjour ${firstName},\n\nIl y a exactement un an, vous séjourniez à ${accommodationName} avec L&Lui Signature. Nous espérons que ce séjour vous a laissé de merveilleux souvenirs 🌅\n\n🎁 +500 points offerts pour cet anniversaire !\n\nL'envie de revenir ? Nos logements vous attendent :\nllui-signature-hebergements.vercel.app\n\nL'équipe L&Lui Signature 🌺`
}

// ── Constructeur de liens WhatsApp ────────────────────────

export function buildWaUrl(phone: string | null, message: string): string {
  const msg = encodeURIComponent(message)
  if (phone) {
    const cleaned = phone.replace(/\D/g, '')
    const withCountry = cleaned.startsWith('237') ? cleaned : `237${cleaned}`
    return `https://wa.me/${withCountry}?text=${msg}`
  }
  return `https://wa.me/?text=${msg}`
}

// ── Payload de notification ───────────────────────────────

export function buildLevelUpNotification(
  clientId: string,
  clientName: string,
  clientPhone: string | null,
  level: string,
  promoCode: string,
  discountAccommodation: number,
  discountBoutique: number,
  firstName: string
): Omit<LoyaltyNotification, 'id'> {
  const message = buildLevelUpMessage(firstName, level, promoCode, discountAccommodation, discountBoutique)
  return {
    clientId,
    clientName,
    clientPhone,
    type: 'level_up',
    status: 'pending',
    message,
    waUrl: buildWaUrl(clientPhone, message),
    triggeredAt: new Date().toISOString(),
    meta: { level, promoCode },
  }
}

export function buildExpiringPromoNotification(
  clientId: string,
  clientName: string,
  clientPhone: string | null,
  promoCode: string,
  reduction: number,
  expiryDate: string,
  firstName: string
): Omit<LoyaltyNotification, 'id'> {
  const message = buildExpiringPromoMessage(firstName, promoCode, reduction, expiryDate)
  return {
    clientId,
    clientName,
    clientPhone,
    type: 'expiring_promo',
    status: 'pending',
    message,
    waUrl: buildWaUrl(clientPhone, message),
    triggeredAt: new Date().toISOString(),
    meta: { promoCode, reduction, expiryDate },
  }
}

export function buildBirthdayNotification(
  clientId: string,
  clientName: string,
  clientPhone: string | null,
  firstName: string
): Omit<LoyaltyNotification, 'id'> {
  const message = buildBirthdayMessage(firstName)
  return {
    clientId,
    clientName,
    clientPhone,
    type: 'birthday',
    status: 'pending',
    message,
    waUrl: buildWaUrl(clientPhone, message),
    triggeredAt: new Date().toISOString(),
  }
}

export function buildStayAnniversaryNotification(
  clientId: string,
  clientName: string,
  clientPhone: string | null,
  firstName: string,
  accommodationName: string,
  reservationId: string
): Omit<LoyaltyNotification, 'id'> {
  const message = buildStayAnniversaryMessage(firstName, accommodationName)
  return {
    clientId,
    clientName,
    clientPhone,
    type: 'stay_anniversary',
    status: 'pending',
    message,
    waUrl: buildWaUrl(clientPhone, message),
    triggeredAt: new Date().toISOString(),
    meta: { accommodationName, reservationId },
  }
}
