/**
 * Google Apps Script — Feuille "Commandes" / "Affiliés_Codes"
 * L&Lui Signature Hébergements
 *
 * INSTALLATION :
 * 1. Ouvre la feuille Google Sheets
 * 2. Extensions > Apps Script → colle ce code
 * 3. Dans le menu Apps Script : Projet > Propriétés du script > Propriétés de script
 *    Ajoute la propriété : SHEETS_WEBHOOK_SECRET = <ta clé secrète Vercel>
 * 4. Déclencheurs > Ajouter un déclencheur :
 *    - Fonction : onEditCommandes
 *    - Source d'événements : À partir du tableur
 *    - Type d'événement : Lors de la modification
 *    ⚠️ Utiliser le déclencheur INSTALLABLE (pas la fonction simple onEdit)
 *       car UrlFetchApp nécessite des autorisations
 *
 * LOGIQUE :
 *   Col K (Statut) change vers "En attente" → webhook statut="En attente"
 *   Col K (Statut) change vers "Payé" ou "Confirmé" → webhook statut="Payé"
 *                                                   + mise à jour Affiliés_Codes
 *
 * COLONNES "Commandes" (0-indexé) :
 *   A(0) Date  B(1) Client_Nom  C(2) Client_Tel  D(3) Client_Email
 *   E(4) Produit  F(5) Prix_Original  G(6) Code_U_Affilié  H(7) Réduction_%
 *   I(8) Montant_Final  J(9) Lien_Orange_Money  K(10) Statut
 *   L(11) Notes  M(12) —  N(13) Source  O(14) Sync_Firebase
 *
 * COLONNES "Affiliés_Codes" (0-indexé) :
 *   A(0) Code_Promo  B(1) Nom_Affilié  C(2) Email_Affilié  D(3) Réduction_%
 *   E(4) Commission_%  F(5) Actif  G(6) Nb_Commandes  H(7) Montant_Généré
 *   I(8) Commission_À_Payer
 */

// ─── Point d'entrée ────────────────────────────────────────────────────────────

/**
 * Déclencheur installable sur "Lors de la modification"
 * Surveille les changements de statut dans la colonne K de l'onglet Commandes
 */
function onEditCommandes(e) {
  try {
    const sheet = e.source.getActiveSheet()
    if (sheet.getName() !== 'Commandes') return

    const row = e.range.getRow()
    const col = e.range.getColumn()

    // Colonne K = colonne 11 (1-indexé)
    if (col !== 11 || row <= 1) return

    const newVal = (e.value || '').toString().trim()
    const statutsAcceptes = ['En attente', 'Payé', 'Confirmé']
    if (!statutsAcceptes.includes(newVal)) return

    // Lire toute la ligne (colonnes A à O = colonnes 1 à 15)
    const data = sheet.getRange(row, 1, 1, 15).getValues()[0]
    const code = (data[6] || '').toString().trim()        // col G (index 6) = Code_U_Affilié
    const montantRaw = (data[8] || '0').toString()        // col I (index 8) = Montant_Final
    const montant = parseMontant(montantRaw)

    if (!code) {
      Logger.log('[onEditCommandes] code vide à la ligne ' + row + ' — ignoré')
      return
    }

    Logger.log('[onEditCommandes] statut="' + newVal + '" code="' + code + '" montant=' + montant)

    const estConfirme = newVal === 'Payé' || newVal === 'Confirmé'

    // 1. Envoyer le webhook Vercel
    const webhookOk = envoyerWebhook({ action: 'update_statut', code: code, amount: montant, statut: newVal })

    // 2. Si "Payé" ou "Confirmé" : mettre à jour Affiliés_Codes
    if (estConfirme) {
      mettreAJourAffiliésCodes(code, montant)
    }

    // 3. Log dans col O (Sync_Firebase) si le webhook a réussi ou échoué
    const logMsg = webhookOk
      ? (estConfirme ? '✅ Synced ' + horaireLocal() : '⏳ Enregistré ' + horaireLocal())
      : '❌ Webhook error ' + horaireLocal()
    sheet.getRange(row, 15).setValue(logMsg) // col O = colonne 15

  } catch (err) {
    Logger.log('[onEditCommandes] ERREUR : ' + err.toString())
  }
}

// ─── Mise à jour Affiliés_Codes ────────────────────────────────────────────────

/**
 * Cherche le code dans l'onglet Affiliés_Codes (col A) et incrémente :
 *   G (Nb_Commandes) += 1
 *   H (Montant_Généré) += montant
 *   I (Commission_À_Payer) += montant * commission_pct / 100
 *
 * ⚠️ Ne cherche que par code exact (comparaison stricte trimée).
 * Si le code 6 chiffres n'existe pas, on cherche aussi le code promo stable
 * associé (non implémenté ici — Firestore fait ce mapping côté webhook).
 */
function mettreAJourAffiliésCodes(code, montant) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const sheet = ss.getSheetByName('Affiliés_Codes')
  if (!sheet) {
    Logger.log('[mettreAJourAffiliésCodes] onglet Affiliés_Codes introuvable')
    return
  }

  const lastRow = sheet.getLastRow()
  if (lastRow < 2) {
    Logger.log('[mettreAJourAffiliésCodes] onglet vide')
    return
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 9).getValues() // lignes 2..N, cols A..I

  for (let i = 0; i < data.length; i++) {
    const codeSheet = (data[i][0] || '').toString().trim()
    if (codeSheet !== code) continue

    const realRow = i + 2 // +2 car on commence à la ligne 2

    // Lire les valeurs actuelles (colonnes G H I = colonnes 7 8 9, 1-indexé)
    const commissionPct = parseMontant((data[i][4] || '0').toString()) // col E (index 4) = Commission_%
    const nbActuel     = parseInt((data[i][6] || '0').toString()) || 0 // col G (index 6)
    const montantActuel = parseMontant((data[i][7] || '0').toString())  // col H (index 7)
    const commActuelle  = parseMontant((data[i][8] || '0').toString())  // col I (index 8)

    const nouvelleCommission = Math.round(montant * commissionPct / 100)
    const newNb        = nbActuel + 1
    const newMontant   = montantActuel + montant
    const newComm      = commActuelle + nouvelleCommission

    sheet.getRange(realRow, 7, 1, 3).setValues([[newNb, newMontant, newComm]])

    Logger.log(
      '[mettreAJourAffiliésCodes] ✅ ligne ' + realRow +
      ' code=' + code +
      ' nb=' + newNb +
      ' montant=' + newMontant +
      ' commission=' + newComm +
      ' (taux ' + commissionPct + '%)'
    )
    return
  }

  Logger.log('[mettreAJourAffiliésCodes] code "' + code + '" non trouvé dans Affiliés_Codes')
}

// ─── Envoi Webhook ─────────────────────────────────────────────────────────────

/**
 * Envoie le payload au webhook Vercel.
 * Retourne true si HTTP 2xx, false sinon.
 */
function envoyerWebhook(payload) {
  const secret = PropertiesService.getScriptProperties().getProperty('SHEETS_WEBHOOK_SECRET')
  if (!secret) {
    Logger.log('[envoyerWebhook] SHEETS_WEBHOOK_SECRET non configuré')
    return false
  }

  const url = 'https://llui-signature-hebergements.vercel.app/api/sheets-webhook'

  const options = {
    method: 'POST',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + secret },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  }

  try {
    const response = UrlFetchApp.fetch(url, options)
    const code = response.getResponseCode()
    const body = response.getContentText().slice(0, 300)
    Logger.log('[envoyerWebhook] HTTP ' + code + ' — ' + body)
    return code >= 200 && code < 300
  } catch (err) {
    Logger.log('[envoyerWebhook] ERREUR fetch : ' + err.toString())
    return false
  }
}

// ─── Utilitaires ───────────────────────────────────────────────────────────────

/**
 * Parse un montant depuis une chaîne Sheets qui peut contenir des espaces,
 * des virgules comme séparateur décimal, ou des symboles FCFA.
 * Ex: "7 500" → 7500, "12,50" → 12.5, "15 000 FCFA" → 15000
 */
function parseMontant(raw) {
  const cleaned = raw.toString()
    .replace(/\s/g, '')         // espaces (séparateurs de milliers)
    .replace(/FCFA/gi, '')      // symbole monétaire
    .replace(',', '.')          // virgule décimale → point
    .trim()
  const val = parseFloat(cleaned)
  return isNaN(val) ? 0 : val
}

/**
 * Retourne l'heure locale Cameroun (Africa/Douala) formatée HH:MM
 */
function horaireLocal() {
  return Utilities.formatDate(
    new Date(),
    'Africa/Douala',
    'HH:mm'
  )
}

// ─── Test manuel ───────────────────────────────────────────────────────────────

/**
 * Fonction de test à lancer manuellement depuis l'éditeur Apps Script.
 * Simule un "Payé" sur le code et le montant de ton choix.
 *
 * USAGE : modifier les valeurs TEST_CODE et TEST_MONTANT, puis
 * sélectionner la fonction testManuel dans le menu déroulant et cliquer ▶
 */
function testManuel() {
  const TEST_CODE    = '123456'  // ← remplace par ton code de test
  const TEST_MONTANT = 7500     // ← remplace par le montant de test (FCFA)
  const TEST_STATUT  = 'Payé'   // 'En attente' ou 'Payé'

  Logger.log('=== TEST MANUEL ===')
  Logger.log('Code: ' + TEST_CODE + ' | Montant: ' + TEST_MONTANT + ' | Statut: ' + TEST_STATUT)

  const webhookOk = envoyerWebhook({
    action: 'update_statut',
    code: TEST_CODE,
    amount: TEST_MONTANT,
    statut: TEST_STATUT,
  })

  if (TEST_STATUT === 'Payé' || TEST_STATUT === 'Confirmé') {
    mettreAJourAffiliésCodes(TEST_CODE, TEST_MONTANT)
  }

  Logger.log('=== FIN TEST (webhook ok: ' + webhookOk + ') ===')
}
