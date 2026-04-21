// lib/sheetsCanal2.ts
// Google Sheets Canal 2 — mapping colonnes vérifié sur Sheet réel
//
// Env vars requises :
//   GOOGLE_SHEETS_CANAL2_ID   — ID du Sheet dans l'URL /d/[ID]/edit
//   GOOGLE_CLIENT_EMAIL       — email service account (éditeur du Sheet)
//   GOOGLE_PRIVATE_KEY        — clé privée service account
//
// Onglet "Commandes" — colonnes A(0) à O(14) :
//   A(0)  Date          B(1)  Client_Nom       C(2)  Client_Tel
//   D(3)  Client_Email  E(4)  Produit          F(5)  Prix_Original
//   G(6)  Code_U_Affilié ← identifiant unique affilié
//   H(7)  NomAffilié    I(8)  Réduction_%      J(9)  Montant_Final
//   K(10) (vide)        L(11) Statut ← "En attente"/"Payé"/"Confirmé"
//   M(12) Notes         N(13) Source           O(14) Sync_Firebase
//
// Onglet "Affiliés_Codes" — colonnes A(0) à I(8) :
//   A Code_Promo  B Nom_Affilié  C Email_Affilié  D Réduction_%
//   E Commission_%  F Actif  G Nb_Commandes  H Montant_Généré  I Commission_À_Payer

import { google } from 'googleapis'

const SHEET_COMMANDES = 'Commandes'
const SHEET_AFFILIES = 'Affiliés_Codes'

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

function sheetId(): string {
  const id = process.env.GOOGLE_SHEETS_CANAL2_ID
  if (!id) throw new Error('GOOGLE_SHEETS_CANAL2_ID non configuré')
  return id
}

// ─── Affiliés_Codes ──────────────────────────────────────────────

/** Génère un code promo à partir du nom d'établissement.
 *  Ex: "Hôtel Beauséjour" → "BEAUSEJOUR-2026"
 *      "Bar Le Cocotier"   → "LECOCOTIER-2026"
 */
function genererCodePromo(nom_etablissement: string): string {
  const annee = new Date().getFullYear()
  const nomNettoye = nom_etablissement
    .toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')       // retirer espaces
    .replace(/[^A-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 20)
  return `${nomNettoye}-${annee}`
}

/** Insère une ligne dans Affiliés_Codes à la création d'un partenaire */
export async function creerAffilie({
  nom_etablissement,
  email,
  reduction_pct,
  commission_pct,
}: {
  nom_etablissement: string
  email: string
  reduction_pct: number
  commission_pct: number
}): Promise<{ success: boolean; code_promo: string; error_message?: string; error_stack?: string }> {
  const SHEET_ID = process.env.GOOGLE_SHEETS_CANAL2_ID

  // Logs diagnostic — visibles dans Vercel Function Logs
  console.log('[creerAffilie] called:', {
    nom_etablissement,
    SHEET_ID: SHEET_ID ?? '⚠️ MANQUANT',
    HAS_EMAIL: !!process.env.GOOGLE_CLIENT_EMAIL,
    HAS_KEY: !!process.env.GOOGLE_PRIVATE_KEY,
  })

  if (!SHEET_ID) {
    console.warn('[creerAffilie] GOOGLE_SHEETS_CANAL2_ID non configuré — skip')
    return { success: false, code_promo: '' }
  }

  const code_promo = genererCodePromo(nom_etablissement)

  try {
    const sheets = await getSheetsClient()
    console.log('[creerAffilie] sheets client OK, appending to:', SHEET_AFFILIES)

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_AFFILIES}!A:I`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          code_promo,        // A: Code_Promo
          nom_etablissement, // B: Nom_Affilié
          email,             // C: Email_Affilié
          reduction_pct,     // D: Réduction_%
          commission_pct,    // E: Commission_%
          'OUI',             // F: Actif
          0,                 // G: Nb_Commandes
          0,                 // H: Montant_Généré
          0,                 // I: Commission_À_Payer
        ]],
      },
    })

    console.log('[creerAffilie] ✅ success — code_promo:', code_promo)
    return { success: true, code_promo }
  } catch (error) {
    console.error('[creerAffilie] ERREUR COMPLETE:', error)
    return {
      success: false,
      code_promo: '',
      error_message: (error as Error).message,
      error_stack: (error as Error).stack?.slice(0, 500),
    }
  }
}

/** Cherche un code (6 chiffres ou promo) dans Affiliés_Codes col A
 *  Retourne { nom, email, reduction_pct } si trouvé, null sinon */
export async function getNomPartenairePourCode(
  code: string
): Promise<{ nom: string; email: string; reduction_pct: number } | null> {
  const SHEET_ID = process.env.GOOGLE_SHEETS_CANAL2_ID
  if (!SHEET_ID) return null
  try {
    const sheets = await getSheetsClient()
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_AFFILIES}!A:I`,
    })
    const rows = resp.data.values ?? []
    const row = rows.find((r) => r[0]?.toString().trim() === code.trim())
    if (!row) return null
    return {
      nom: row[1]?.toString() ?? '',
      email: row[2]?.toString() ?? '',
      reduction_pct: parseFloat(row[3] ?? '0') || 0,
    }
  } catch (error) {
    console.error('[sheetsCanal2] getNomPartenairePourCode error:', error instanceof Error ? error.message : error)
    return null
  }
}

/** Incrémente G (Nb_Commandes) H (Montant_Généré) I (Commission_À_Payer) dans Affiliés_Codes */
export async function updateStatsAffilie(
  code_promo: string,
  montant_fcfa: number,
  commission_fcfa: number
): Promise<void> {
  const SHEET_ID = process.env.GOOGLE_SHEETS_CANAL2_ID
  if (!SHEET_ID || !code_promo) return

  try {
    const sheets = await getSheetsClient()

    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_AFFILIES}!A:I`,
    })
    const rows = resp.data.values ?? []
    const rowIndex = rows.findIndex((r) => r[0]?.toString().trim() === code_promo.trim())
    if (rowIndex === -1) {
      console.warn(`[sheetsCanal2] updateStatsAffilie: ${code_promo} non trouvé`)
      return
    }

    const realRow = rowIndex + 1
    const current = rows[rowIndex]
    const nb         = parseInt(current[6] ?? '0') + 1
    const montant    = parseFloat(current[7] ?? '0') + montant_fcfa
    const commission = parseFloat(current[8] ?? '0') + commission_fcfa

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_AFFILIES}!G${realRow}:I${realRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[nb, montant, commission]] },
    })
  } catch (error) {
    console.error('[sheetsCanal2] updateStatsAffilie error:', error instanceof Error ? error.message : error)
  }
}

// ─── Commandes ───────────────────────────────────────────────────

/** Insère le code 6 chiffres dans Affiliés_Codes pour validation boutique Netlify */
export async function appendCodeSessionAffilie({
  code,
  nom_partenaire,
  email_partenaire,
  reduction_pct,
  commission_pct,
}: {
  code: string
  nom_partenaire: string
  email_partenaire: string
  reduction_pct: number
  commission_pct: number
}): Promise<{ success: boolean }> {
  const SHEET_ID = process.env.GOOGLE_SHEETS_CANAL2_ID
  if (!SHEET_ID) {
    console.warn('[sheetsCanal2] GOOGLE_SHEETS_CANAL2_ID non configuré — skip appendCodeSessionAffilie')
    return { success: false }
  }

  try {
    const sheets = await getSheetsClient()
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_AFFILIES}!A:I`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          code,             // A: Code_Promo = 954449
          nom_partenaire,   // B: Nom_Affilié
          email_partenaire, // C: Email_Affilié
          reduction_pct,    // D: Réduction_%
          commission_pct,   // E: Commission_%
          'OUI',            // F: Actif
          0,                // G: Nb_Commandes
          0,                // H: Montant_Généré
          0,                // I: Commission_À_Payer
        ]],
      },
    })
    console.log('[sheetsCanal2] appendCodeSessionAffilie ✅ code:', code)
    return { success: true }
  } catch (error) {
    console.error('[sheetsCanal2] appendCodeSessionAffilie error:', error instanceof Error ? error.message : error)
    return { success: false }
  }
}

/** Appende une ligne dans l'onglet "Commandes" lors de la génération d'un code 6 chiffres */
export async function appendCommandeCanal2({
  code,
  nom_partenaire,
  reduction_pct,
}: {
  code: string
  nom_partenaire: string
  reduction_pct: number
}): Promise<{ success: boolean }> {
  const SHEET_ID = process.env.GOOGLE_SHEETS_CANAL2_ID
  if (!SHEET_ID) {
    console.warn('[sheetsCanal2] GOOGLE_SHEETS_CANAL2_ID non configuré — skip appendCommandeCanal2')
    return { success: false }
  }

  try {
    const sheets = await getSheetsClient()
    const date = new Date().toLocaleString('fr-FR', {
      timeZone: 'Africa/Douala',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_COMMANDES}!A:O`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          date,                 // A (0)  Date
          '',                   // B (1)  Client_Nom
          '',                   // C (2)  Client_Tel
          '',                   // D (3)  Client_Email
          '',                   // E (4)  Produit
          '',                   // F (5)  Prix_Original
          code,                 // G (6)  Code_U_Affilié ←
          `${reduction_pct}%`,  // H (7)  Réduction_%
          '',                   // I (8)  Montant_Final
          '',                   // J (9)  Lien_Orange_Money
          'En attente',         // K (10) Statut ←
          '',                   // L (11) Notes
          '',                   // M (12) (vide)
          nom_partenaire,       // N (13) Source ←
          '⏳ En attente',     // O (14) Sync_Firebase ←
        ]],
      },
    })
    return { success: true }
  } catch (error) {
    console.error('[sheetsCanal2] appendCommandeCanal2 error:', error instanceof Error ? error.message : error)
    return { success: false }
  }
}

/** Met à jour la colonne O (Sync_Firebase) de la ligne identifiée par col G (Code_U_Affilié) */
export async function updateSyncStatus(
  code: string,
  status: 'success' | 'error',
  message?: string
): Promise<void> {
  const SHEET_ID = process.env.GOOGLE_SHEETS_CANAL2_ID
  if (!SHEET_ID) return

  try {
    const sheets = await getSheetsClient()
    const time = new Date().toLocaleTimeString('fr-FR', { timeZone: 'Africa/Douala' })

    // Chercher la ligne dans la colonne G (Code_U_Affilié)
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_COMMANDES}!G:G`,
    })
    const rows = resp.data.values ?? []
    const rowIndex = rows.findIndex((r) => r[0]?.toString().trim() === code.toString().trim())
    if (rowIndex === -1) {
      console.warn(`[sheetsCanal2] updateSyncStatus: code ${code} non trouvé dans col G`)
      return
    }

    const realRow = rowIndex + 1  // 1-indexed
    const logValue = status === 'success'
      ? `✅ Synced ${time}`
      : `❌ Erreur: ${message ?? 'inconnue'} ${time}`

    // Colonne O = 15ème colonne
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_COMMANDES}!O${realRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[logValue]] },
    })
  } catch (error) {
    console.error('[sheetsCanal2] updateSyncStatus error:', error instanceof Error ? error.message : error)
  }
}

// ─── Lecture Montant_Final depuis Commandes ──────────────────────

/**
 * Lit le Montant_Final (col I, index 8) dans l'onglet Commandes
 * en cherchant la ligne où col G (index 6) == code.
 *
 * Utilisé en fallback quand le Apps Script envoie data[9] (Lien_Orange_Money)
 * au lieu de data[8] (Montant_Final) — erreur d'index dans le Apps Script.
 */
export async function getMontantFinalParCode(code: string): Promise<number> {
  const SHEET_ID = process.env.GOOGLE_SHEETS_CANAL2_ID
  if (!SHEET_ID || !code) return 0
  try {
    const sheets = await getSheetsClient()
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_COMMANDES}!A:O`,
    })
    const rows = resp.data.values ?? []
    // Chercher la dernière ligne avec ce code (cas de code réutilisé)
    const row = [...rows].reverse().find((r) => r[6]?.toString().trim() === code.trim())
    if (!row) return 0
    // Montant_Final est en col J (index 9) depuis la mise à jour du mapping Apps Script
    const raw = row[9]?.toString().replace(/\s/g, '').replace(',', '.') ?? '0'
    const montant = parseFloat(raw)
    return isNaN(montant) ? 0 : montant
  } catch (error) {
    console.error('[sheetsCanal2] getMontantFinalParCode error:', error instanceof Error ? error.message : error)
    return 0
  }
}

// ─── Lecture Affiliés_Codes (bootstrap sync) ─────────────────────

export interface LigneAffilie {
  code_promo: string       // A(0)
  nom_affilie: string      // B(1)
  email_affilie: string    // C(2)
  reduction_pct: number    // D(3)
  commission_pct: number   // E(4)
  actif: boolean           // F(5) = "OUI"
}

/**
 * Lit toutes les lignes actives de l'onglet Affiliés_Codes.
 * Utilisé par le route /api/admin/sync-affiliates pour bootstrapper Firestore.
 */
export async function lireAffiliésCodes(): Promise<LigneAffilie[]> {
  const SHEET_ID = process.env.GOOGLE_SHEETS_CANAL2_ID
  if (!SHEET_ID) throw new Error('GOOGLE_SHEETS_CANAL2_ID non configuré')

  const sheets = await getSheetsClient()
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_AFFILIES}!A:F`,
  })

  const rows = resp.data.values ?? []
  const result: LigneAffilie[] = []

  for (const row of rows) {
    const code = row[0]?.toString().trim() ?? ''
    if (!code) continue
    const actif = row[5]?.toString().trim().toUpperCase() === 'OUI'
    if (!actif) continue

    result.push({
      code_promo:     code,
      nom_affilie:    row[1]?.toString().trim() ?? '',
      email_affilie:  row[2]?.toString().trim() ?? '',
      reduction_pct:  parseFloat(row[3] ?? '0') || 0,
      commission_pct: parseFloat(row[4] ?? '0') || 0,
      actif:          true,
    })
  }

  return result
}

// ─── Export utilitaire ───────────────────────────────────────────

export { genererCodePromo }
