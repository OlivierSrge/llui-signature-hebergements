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

// ── Notification WhatsApp admin via Green API ──────────────────
// Variables d'env requises : GREEN_API_INSTANCE_ID + GREEN_API_TOKEN
// Si absentes, la notification est ignorée silencieusement.

const ADMIN_WA_PHONE = '237693407964'

export async function sendAdminWhatsAppNotification(message: string): Promise<void> {
  const INSTANCE_ID = process.env.GREEN_API_INSTANCE_ID
  const API_TOKEN = process.env.GREEN_API_TOKEN
  if (!INSTANCE_ID || !API_TOKEN) {
    console.warn('[green-api] GREEN_API_INSTANCE_ID ou GREEN_API_TOKEN non défini — notification admin ignorée')
    return
  }

  const chatId = `${ADMIN_WA_PHONE}@c.us`
  const url = `https://api.green-api.com/waInstance${INSTANCE_ID}/sendMessage/${API_TOKEN}`
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, message }),
  }).catch((err) => console.error('[green-api] WhatsApp admin notification failed:', err))
}

