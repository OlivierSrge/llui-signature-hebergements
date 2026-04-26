// lib/sheets-pass-vip.ts
// Mise à jour Google Sheets lors de l'activation d'un Pass VIP.
// Utilise les mêmes credentials que sheetsCanal2.ts.

import { google } from 'googleapis'

const SHEET_COMMANDES = 'Commandes'

async function getSheetsClient() {
  const email = process.env.GOOGLE_CLIENT_EMAIL
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!email || !key) throw new Error('Credentials manquants (GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY)')
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: key },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

/**
 * Mise à jour d'une ligne Commandes à l'activation du Pass VIP.
 * - Colonne L (Statut) → "Payé"
 * - Colonne O (Sync_Firebase) → "✅ Activé DD/MM/YYYY HH:MM"
 *
 * @param sheetsRow  Numéro de ligne 1-indexed (fourni par la boutique Netlify)
 * @param sheetsId   ID du Google Sheet (fallback : GOOGLE_SHEETS_CANAL2_ID)
 */
export async function updatePassVipStatutSheets(
  sheetsRow: number,
  sheetsId?: string | null,
): Promise<void> {
  const spreadsheetId = sheetsId ?? process.env.GOOGLE_SHEETS_CANAL2_ID
  if (!spreadsheetId) {
    console.warn('[sheets-pass-vip] GOOGLE_SHEETS_CANAL2_ID non configuré — skip')
    return
  }
  if (!sheetsRow || sheetsRow < 2) {
    console.warn('[sheets-pass-vip] sheets_row invalide :', sheetsRow)
    return
  }

  const dateStr = new Date().toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  try {
    const sheets = await getSheetsClient()
    // Deux mises à jour en parallèle — colonne L (Statut) et O (Sync_Firebase)
    await Promise.all([
      sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_COMMANDES}!L${sheetsRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [['Payé']] },
      }),
      sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_COMMANDES}!O${sheetsRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[`✅ Activé ${dateStr}`]] },
      }),
    ])
    console.log(`[sheets-pass-vip] ✅ Ligne ${sheetsRow} mise à jour — Payé / Activé ${dateStr}`)
  } catch (error) {
    console.error('[sheets-pass-vip] Erreur mise à jour :', error instanceof Error ? error.message : error)
  }
}
