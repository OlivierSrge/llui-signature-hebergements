import type { LoyaltyCard, LoyaltyProgram } from '@/types/loyalty'

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'

export function generateQRData(card: LoyaltyCard, program: LoyaltyProgram): string {
  const currentNiveau =
    program.niveaux.find((n) => n.id === card.niveau_actuel) ?? program.niveaux[0]

  const expiresAt =
    card.expires_at instanceof Date
      ? card.expires_at.toISOString()
      : typeof (card.expires_at as any)?.seconds === 'number'
      ? new Date((card.expires_at as any).seconds * 1000).toISOString()
      : String(card.expires_at)

  const qrData = {
    card_id: card.card_id,
    card_number: card.card_id.slice(0, 8).toUpperCase(),
    client_nom: card.client_nom,
    client_email: card.client_email,
    program_id: program.program_id,
    program_nom: program.nom,
    niveau_id: card.niveau_actuel,
    niveau_nom: currentNiveau?.nom,
    niveau_emoji: currentNiveau?.emoji,
    points: card.points_cumules,
    expires_at: expiresAt,
    is_valid: card.statut === 'ACTIVE',
    card_url: `${APP_URL}/loyalty/card/${card.card_id}`,
  }

  return JSON.stringify(qrData)
}
