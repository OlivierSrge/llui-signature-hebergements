// lib/sheetsCanal2.ts
// Écriture Google Sheets — onglet "Commandes" du Canal 2
// Utilise le service account Firebase (FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY)
// Le compte de service doit être ajouté comme éditeur du Google Sheet Canal 2.
//
// Env vars requises :
//   GOOGLE_SHEETS_CANAL2_ID   — ID du Google Sheet (dans l'URL /d/XXXXXXX/edit)
//   FIREBASE_CLIENT_EMAIL     — email du service account (déjà utilisé par Firebase Admin)
//   FIREBASE_PRIVATE_KEY      — clé privée du service account (déjà utilisée par Firebase)

import { google } from 'googleapis'

const SHEET_TAB = 'Commandes'

// En-têtes attendues (ligne 1 du Google Sheet)
// Date | Code | Partenaire | Type | Remise% | Canal | Statut | Expire_at | Sync_Firebase
export const CANAL2_HEADERS = [
  'Date',
  'Code',
  'Partenaire',
  'Type',
  'Remise%',
  'Canal',
  'Statut',
  'Expire_at',
  'Sync_Firebase',
]

function getAuth() {
  const email = process.env.FIREBASE_CLIENT_EMAIL
  const key = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!email || !key) throw new Error('Service account manquant (FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY)')

  return new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: key },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

/** Ajoute une ligne dans l'onglet "Commandes" du Sheet Canal 2 */
export async function appendCodeToSheets(data: {
  code: string
  nom_partenaire: string
  type_partenaire: string
  remise_valeur_pct: number | null
  canal: string
  statut: string
  expire_at: string
}): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEETS_CANAL2_ID
  if (!sheetId) {
    console.warn('[sheetsCanal2] GOOGLE_SHEETS_CANAL2_ID non configuré — skip')
    return
  }

  try {
    const auth = getAuth()
    const sheets = google.sheets({ version: 'v4', auth })

    // S'assurer que l'en-tête existe (idempotent)
    await ensureHeader(sheets, sheetId)

    const row = [
      new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Douala' }),
      data.code,
      data.nom_partenaire,
      data.type_partenaire,
      data.remise_valeur_pct !== null ? `${data.remise_valeur_pct}%` : 'non_financier',
      data.canal || 'multi',
      data.statut,
      new Date(data.expire_at).toLocaleString('fr-FR', { timeZone: 'Africa/Douala' }),
      '✅ Sync auto',
    ]

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${SHEET_TAB}!A:I`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    })
  } catch (e) {
    // Fire-and-forget : on log mais on ne bloque pas le flux principal
    console.error('[sheetsCanal2] appendCodeToSheets error:', e instanceof Error ? e.message : e)
  }
}

/** Met à jour la colonne Sync_Firebase d'une ligne identifiée par le Code */
export async function updateSyncStatus(
  code: string,
  status: string
): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEETS_CANAL2_ID
  if (!sheetId) return

  try {
    const auth = getAuth()
    const sheets = google.sheets({ version: 'v4', auth })

    // Chercher la ligne du code
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${SHEET_TAB}!B:B`,
    })
    const rows = resp.data.values ?? []
    const rowIndex = rows.findIndex((r) => r[0] === code)
    if (rowIndex < 0) return // code non trouvé dans le sheet

    const sheetRow = rowIndex + 1 // 1-indexed
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${SHEET_TAB}!I${sheetRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[status]] },
    })
  } catch (e) {
    console.error('[sheetsCanal2] updateSyncStatus error:', e instanceof Error ? e.message : e)
  }
}

async function ensureHeader(
  sheets: ReturnType<typeof google.sheets>,
  sheetId: string
): Promise<void> {
  try {
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${SHEET_TAB}!A1:I1`,
    })
    const firstRow = resp.data.values?.[0] ?? []
    if (firstRow.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${SHEET_TAB}!A1:I1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [CANAL2_HEADERS] },
      })
    }
  } catch {
    // Onglet peut ne pas exister — on tente quand même l'append
  }
}
