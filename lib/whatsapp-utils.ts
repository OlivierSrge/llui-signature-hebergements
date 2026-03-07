export function previewTemplate(template: string, vars: Record<string, string> = {}): string {
  const defaults: Record<string, string> = {
    nom_client: 'Jean Dupont',
    produit: 'Villa Bord de Mer — Kribi',
    dates: '15/03/2026 → 20/03/2026 (5 nuits)',
    personnes: '4',
    montant: '350 000',
    code_reservation: 'LLS-2026-AB12C',
    numero_paiement: '693407964',
    partenaire: 'L&Lui Signature',
    lien_suivi: 'https://llui-signature.cm/suivi/abc123',
  }
  const merged = { ...defaults, ...vars }
  return template
    .replace(/\{nom_client\}/g, merged.nom_client)
    .replace(/\{produit\}/g, merged.produit)
    .replace(/\{dates\}/g, merged.dates)
    .replace(/\{personnes\}/g, merged.personnes)
    .replace(/\{montant\}/g, merged.montant)
    .replace(/\{code_reservation\}/g, merged.code_reservation)
    .replace(/\{numero_paiement\}/g, merged.numero_paiement)
    .replace(/\{partenaire\}/g, merged.partenaire)
    .replace(/\{lien_suivi\}/g, merged.lien_suivi)
}

// ── Notification WhatsApp admin via CallMeBot ──────────────────
// Activation unique : envoyer "I allow callmebot to send me messages"
// au +34 644 35 87 48 depuis WhatsApp, puis ajouter la clé reçue
// dans la variable d'env CALLMEBOT_API_KEY.
// Si la clé n'est pas définie, la notification est ignorée silencieusement.

const ADMIN_WA_PHONE = '237693407964'

export async function sendAdminWhatsAppNotification(message: string): Promise<void> {
  const apiKey = process.env.CALLMEBOT_API_KEY
  if (!apiKey) return // pas configuré → skip

  const url = `https://api.callmebot.com/whatsapp.php?phone=${ADMIN_WA_PHONE}&text=${encodeURIComponent(message)}&apikey=${apiKey}`
  await fetch(url).catch((err) => console.error('[callmebot] WhatsApp notification failed:', err))
}

