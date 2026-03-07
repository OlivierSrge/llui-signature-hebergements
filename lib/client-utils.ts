// ── Helpers purs pour les profils clients L&Lui Stars ──────────
import type { LoyaltyClient } from '@/lib/types'

function formatPhone(phone: string): string {
  const cleaned = (phone || '').replace(/\D/g, '')
  return cleaned.startsWith('237') ? cleaned : `237${cleaned}`
}

// Construit l'URL WhatsApp anniversaire de naissance
export function buildBirthdayWhatsAppUrl(client: LoyaltyClient): string {
  const phone = formatPhone(client.phone || '')
  if (!phone || phone === '237') return ''
  const msg =
    `Joyeux anniversaire ${client.firstName} ! 🎉\n\nL'équipe L&Lui Signature vous souhaite une merveilleuse journée. ` +
    `Pour fêter ça, profitez d'une offre spéciale -20% sur votre prochaine réservation ce mois-ci ! ` +
    `Utilisez le code : BIRTHDAY-${client.memberCode}\n\nÀ très bientôt chez nous ! 🏡✨`
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
}

// Construit l'URL WhatsApp anniversaire du premier séjour
export function buildStayAnniversaryWhatsAppUrl(client: LoyaltyClient): string {
  const phone = formatPhone(client.phone || '')
  if (!phone || phone === '237') return ''
  const joinedDate = client.joinedAt
    ? new Date(client.joinedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'votre premier séjour'
  const year = client.joinedAt
    ? new Date().getFullYear() - new Date(client.joinedAt).getFullYear()
    : 1
  const msg =
    `Bonjour ${client.firstName} ! 🏡\n\nIl y a exactement ${year} an${year > 1 ? 's' : ''} (le ${joinedDate}), ` +
    `vous avez choisi L&Lui Signature pour votre premier séjour. Merci pour votre fidélité !\n\n` +
    `Pour célébrer cet anniversaire, profitez de -20% sur votre prochaine réservation ce mois-ci. ` +
    `Contactez-nous pour en profiter ! 🌟`
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
}
