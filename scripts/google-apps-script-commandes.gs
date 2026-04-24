// ============================================================
// LETLUI BOUTIQUE — Google Apps Script (Backend)
// Version finale stabilisée — anti-429
// ============================================================
// À copier-coller dans Google Apps Script
// (Extensions > Apps Script depuis la Google Sheet)
// ============================================================

// --- CONFIGURATION ---
var EMAIL_VENDEUR = "olivierfinestone@gmail.com";
var ORANGE_MONEY_NUMERO = "6 93 40 79 64";
var ORANGE_MONEY_NOM = "Olivier SERGE";

// --- GitHub (pour publier produits.json) ---
var GITHUB_OWNER = "OlivierSrge";
var GITHUB_REPO = "letlui";
var GITHUB_FILE = "produits.json";
var GITHUB_BRANCH = "main";

// --- Noms des onglets ---
var ONGLET_PRODUITS = "Produits";
var ONGLET_AFFILIES = "Affiliés_Codes";
var ONGLET_COMMANDES = "Commandes";

// ============================================================
// MENU PERSONNALISÉ — Affiché dans Google Sheets
// ============================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("L et Lui")
    .addItem("Mettre à jour le site", "publierProduits")
    .addToUi();
}

// ============================================================
// PUBLIER PRODUITS — Pousse produits.json sur GitHub
// ============================================================
function publierProduits() {
  var ui = SpreadsheetApp.getUi();

  var token = PropertiesService.getScriptProperties().getProperty("GITHUB_TOKEN");
  if (!token) {
    ui.alert("Token GitHub manquant", "Va dans Extensions > Apps Script > Paramètres du projet > Propriétés de script\nAjoute : GITHUB_TOKEN = ton_token", ui.ButtonSet.OK);
    return;
  }

  CacheService.getScriptCache().remove("produits_v1");

  var resultat = getProduits();
  var contenu = JSON.stringify(resultat, null, 2);
  var contenuBase64 = Utilities.base64Encode(Utilities.newBlob(contenu).getBytes());

  var urlGet = "https://api.github.com/repos/" + GITHUB_OWNER + "/" + GITHUB_REPO + "/contents/" + GITHUB_FILE + "?ref=" + GITHUB_BRANCH;
  var respGet = UrlFetchApp.fetch(urlGet, {
    headers: { "Authorization": "token " + token, "Accept": "application/vnd.github.v3+json" },
    muteHttpExceptions: true,
  });

  var sha = "";
  if (respGet.getResponseCode() === 200) {
    sha = JSON.parse(respGet.getContentText()).sha;
  }

  var payload = {
    message: "MAJ produits depuis Google Sheets — " + Utilities.formatDate(new Date(), "Africa/Douala", "yyyy-MM-dd HH:mm"),
    content: contenuBase64,
    branch: GITHUB_BRANCH,
  };
  if (sha) payload.sha = sha;

  var respPut = UrlFetchApp.fetch("https://api.github.com/repos/" + GITHUB_OWNER + "/" + GITHUB_REPO + "/contents/" + GITHUB_FILE, {
    method: "put",
    headers: { "Authorization": "token " + token, "Accept": "application/vnd.github.v3+json", "Content-Type": "application/json" },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  if (respPut.getResponseCode() === 200 || respPut.getResponseCode() === 201) {
    ui.alert("Succès !", "Le site est en cours de mise à jour (30 secondes).\n\n" + resultat.produits.length + " produits publiés.", ui.ButtonSet.OK);
  } else {
    ui.alert("Erreur", "Code " + respPut.getResponseCode() + "\n" + respPut.getContentText(), ui.ButtonSet.OK);
  }
}

// ============================================================
// POINT D'ENTRÉE — Requêtes GET
// ============================================================
function doGet(e) {
  var action = e.parameter.action;
  var resultat;

  if (action === "produits") {
    resultat = getProduits();
  } else if (action === "valider_code") {
    resultat = validerCode(e.parameter.code);
  } else {
    resultat = { erreur: "Action inconnue" };
  }

  return ContentService
    .createTextOutput(JSON.stringify(resultat))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// POINT D'ENTRÉE — Requêtes POST
// ============================================================
function doPost(e) {
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ succes: false, message: "Données invalides" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var resultat;

  if (data.action === "commande") {
    resultat = creerCommande(data);
  } else {
    resultat = { succes: false, message: "Action inconnue" };
  }

  return ContentService
    .createTextOutput(JSON.stringify(resultat))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// GET PRODUITS — Retourne tous les produits actifs (cache 5 min)
// ============================================================
function getProduits() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get("produits_v1");
  if (cached) {
    return JSON.parse(cached);
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ONGLET_PRODUITS);
  var data = sheet.getDataRange().getValues();
  var produits = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var actif = String(row[6]).toUpperCase().trim();

    if (actif === "OUI") {
      produits.push({
        nom: row[0],
        description: row[1],
        prix: Number(row[2]),
        categorie: row[3],
        image: convertirLienDrive(String(row[4])),
        description_longue: row[5] || "",
      });
    }
  }

  var resultat = { produits: produits };
  try { cache.put("produits_v1", JSON.stringify(resultat), 300); } catch (e) {}
  return resultat;
}

// ============================================================
// VALIDER CODE PROMO
// ============================================================
function validerCode(code) {
  if (!code || code.trim() === "") {
    return { valide: false, message: "Aucun code fourni" };
  }

  code = code.trim().toUpperCase();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ONGLET_AFFILIES);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var codeSheet = String(row[0]).toUpperCase().trim();
    var actif = String(row[5]).toUpperCase().trim();

    if (codeSheet === code && actif === "OUI") {
      return {
        valide: true,
        reduction: Number(row[3]),
        affilié: row[1],
        message: "Code valide ! Réduction de " + row[3] + "% appliquée",
      };
    }
  }

  return { valide: false, message: "Code invalide ou expiré" };
}

// ============================================================
// CRÉER COMMANDE
// ============================================================
function creerCommande(data) {
  if (!data.nom_client || data.nom_client.trim().length < 2) {
    return { succes: false, message: "Nom invalide" };
  }
  if (!data.tel_client || data.tel_client.trim().length < 6) {
    return { succes: false, message: "Numéro de téléphone invalide" };
  }
  if (!data.email_client || data.email_client.indexOf("@") === -1) {
    return { succes: false, message: "Email invalide" };
  }
  if (!data.produit_nom) {
    return { succes: false, message: "Produit manquant" };
  }

  if (data.nom_client.length > 100 || data.tel_client.length > 30 || data.email_client.length > 100) {
    return { succes: false, message: "Données trop longues" };
  }

  var prixOriginal = Number(data.prix);
  var quantite = Math.max(1, parseInt(data.quantite) || 1);
  var prixTotal = prixOriginal * quantite;
  var codePromo = data.code_promo ? data.code_promo.trim().toUpperCase() : "";
  var nomAffilie = "";
  var emailAffilie = "";
  var reductionPourcent = 0;
  var commissionPourcent = 0;

  if (codePromo !== "") {
    var sheetAffil = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ONGLET_AFFILIES);
    var dataAffil = sheetAffil.getDataRange().getValues();

    for (var i = 1; i < dataAffil.length; i++) {
      var row = dataAffil[i];
      var codeSheet = String(row[0]).toUpperCase().trim();
      var actif = String(row[5]).toUpperCase().trim();

      if (codeSheet === codePromo && actif === "OUI") {
        nomAffilie = row[1];
        emailAffilie = row[2];
        reductionPourcent = Number(row[3]);
        commissionPourcent = Number(row[4]);
        break;
      }
    }
  }

  var reduction = Math.round(prixTotal * reductionPourcent / 100);
  var montantFinal = prixTotal - reduction;
  var commission = Math.round(montantFinal * commissionPourcent / 100);

  var maintenant = new Date();
  var dateFormatee = Utilities.formatDate(maintenant, "Africa/Douala", "yyyy-MM-dd HH:mm");

  var sheetCmd = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ONGLET_COMMANDES);
  sheetCmd.appendRow([
    dateFormatee,              // A(0)  Date
    data.nom_client.trim(),    // B(1)  Client_Nom
    data.tel_client.trim(),    // C(2)  Client_Tel
    data.email_client.trim(),  // D(3)  Client_Email
    data.produit_nom,          // E(4)  Produit
    prixTotal,                 // F(5)  Prix_Original
    codePromo || "",           // G(6)  Code_U_Affilié
    nomAffilie || "",          // H(7)  NomAffilié
    reductionPourcent || 0,    // I(8)  Réduction_%
    montantFinal,              // J(9)  Montant_Final  ← COL_MONTANT
    "",                        // K(10) vide
    "En attente",              // L(11) Statut         ← COL_STATUT
    quantite > 1 ? "Qté : " + quantite + " | Prix unitaire : " + formatFCFA(prixOriginal) + " FCFA" : "", // M(12) Notes
    "",                        // N(13) Source
    "⏳ En attente",           // O(14) Sync_Firebase  ← COL_LOG
  ]);

  // ── Pass VIP : webhook Vercel → email admin avec bouton de confirmation mobile
  var estPassVip = data.produit_nom.toUpperCase().indexOf('PASS VIP') !== -1;

  if (estPassVip) {
    // Le webhook Vercel gère : Firestore + email admin (bouton /admin/confirm/{token})
    var webhookOk = envoyerWebhookBoutiquePass({
      nom:        data.nom_client.trim(),
      type_pass:  data.produit_nom,
      montant:    montantFinal,
      code_promo: codePromo || null,
      nom_affilie: nomAffilie || null,
      tel:        data.tel_client.trim(),
      email:      data.email_client.trim(),
      date:       dateFormatee,
    });
    Logger.log('[creerCommande] Pass VIP — webhook Vercel ok=' + webhookOk);
    // Email client Orange Money envoyé quand même
    envoyerEmailClient({
      nom_client:   data.nom_client.trim(),
      email_client: data.email_client.trim(),
      produit:      data.produit_nom,
      montant_final: montantFinal,
    });
  } else {
    // Commande standard : email admin texte brut + email client
    envoyerEmailVendeur({
      produit: data.produit_nom,
      prix_original: prixOriginal,
      prix_total: prixTotal,
      quantite: quantite,
      montant_final: montantFinal,
      reduction_pourcent: reductionPourcent,
      nom_client: data.nom_client.trim(),
      tel_client: data.tel_client.trim(),
      email_client: data.email_client.trim(),
      code_promo: codePromo,
      nom_affilie: nomAffilie,
      email_affilie: emailAffilie,
      commission: commission,
      commission_pourcent: commissionPourcent,
      date: dateFormatee,
    });
    envoyerEmailClient({
      nom_client:   data.nom_client.trim(),
      email_client: data.email_client.trim(),
      produit:      data.produit_nom,
      montant_final: montantFinal,
    });
  }

  return {
    succes: true,
    message: "Commande enregistrée avec succès",
    client: data.nom_client.trim(),
    montant_final: montantFinal,
    quantite: quantite,
    code_promo: codePromo || null,
    reduction: reductionPourcent,
  };
}

// ============================================================
// ENVOI EMAIL AU VENDEUR
// ============================================================
function envoyerEmailVendeur(info) {
  var sujet = "Nouvelle commande — " + info.produit;

  var corps =
    "Nouvelle commande reçue !\n\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "PRODUIT : " + info.produit + "\n";

  if (info.quantite > 1) {
    corps += "QUANTITÉ : " + info.quantite + " × " + formatFCFA(info.prix_original) + " FCFA = " + formatFCFA(info.prix_total) + " FCFA\n";
  }

  corps += "MONTANT : " + formatFCFA(info.montant_final) + " FCFA";

  if (info.reduction_pourcent > 0) {
    corps += " (réduction " + info.reduction_pourcent + "% appliquée)";
  }

  corps += "\n━━━━━━━━━━━━━━━━━━━━\n\n";

  corps +=
    "CLIENT\n" +
    "Nom : " + info.nom_client + "\n" +
    "Téléphone : " + info.tel_client + "\n" +
    "Email : " + info.email_client + "\n\n";

  if (info.code_promo) {
    corps +=
      "CODE PROMO UTILISÉ : " + info.code_promo + "\n" +
      "AFFILIÉ : " + info.nom_affilie + " (" + info.email_affilie + ")\n" +
      "Commission due : " + formatFCFA(info.commission) + " FCFA (" + info.commission_pourcent + "%)\n\n";
  }

  corps +=
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "Action requise :\n" +
    "1. Envoyer le lien de paiement Orange Money de " + formatFCFA(info.montant_final) + " FCFA au client par email\n" +
    "2. Attendre la confirmation du paiement\n" +
    "3. Aller dans Google Sheets > Commandes\n" +
    "4. Changer le statut de cette commande à \"Confirmée\"\n" +
    "━━━━━━━━━━━━━━━━━━━━\n\n" +
    "Date commande : " + info.date;

  try {
    MailApp.sendEmail(EMAIL_VENDEUR, sujet, corps);
  } catch (err) {
    Logger.log("Erreur envoi email : " + err.message);
  }
}

// ============================================================
// ENVOI EMAIL AU CLIENT — Instructions de paiement
// ============================================================
function envoyerEmailClient(info) {
  var sujet = "L et Lui Signature — Votre commande pour " + info.produit;

  var corps =
    "Bonjour " + info.nom_client + ",\n\n" +
    "Merci pour votre commande !\n\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "RÉCAPITULATIF\n" +
    "Produit : " + info.produit + "\n" +
    "Montant à payer : " + formatFCFA(info.montant_final) + " FCFA\n" +
    "━━━━━━━━━━━━━━━━━━━━\n\n" +
    "Pour finaliser votre commande, envoyez " + formatFCFA(info.montant_final) + " FCFA par Orange Money au :\n\n" +
    "Numéro : " + ORANGE_MONEY_NUMERO + "\n" +
    "Nom du titulaire : " + ORANGE_MONEY_NOM + "\n\n" +
    "━━━━━━━━━━━━━━━━━━━━\n\n" +
    "Votre commande sera confirmée dès réception du paiement.\n\n" +
    "Merci pour votre confiance !\n" +
    "L'équipe L et Lui Signature";

  try {
    MailApp.sendEmail(info.email_client, sujet, corps);
  } catch (err) {
    Logger.log("Erreur envoi email client : " + err.message);
  }
}

// ============================================================
// UTILITAIRES SITE
// ============================================================

function convertirLienDrive(url) {
  if (!url) return "";

  var fileId = "";
  var match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) fileId = match[1];

  if (!fileId) {
    match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match) fileId = match[1];
  }

  if (fileId) {
    return "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w800";
  }

  return url;
}

function formatFCFA(n) {
  return Number(n).toLocaleString("fr-FR");
}

// ============================================================
// MODULE COMMANDES & AFFILIÉS — v3 Intelligence CRM
// ============================================================
// Mapping colonnes "Commandes" (0-indexé depuis col A) :
//   A(0)=Date   B(1)=Nom    C(2)=Tel    D(3)=Email  E(4)=Produit  F(5)=Prix
//   G(6)=Code_U_Affilié     H(7)=NomAffilié         I(8)=Réduction_%
//   J(9)=Montant_Final       K(10)=vide              L(11)=Statut
//   M(12)=Notes              N(13)=Source            O(14)=Sync_Firebase
//
// Mapping colonnes "Affiliés_Codes" (0-indexé depuis col A) :
//   A(0)=Code_Promo  B(1)=Nom_Affilié  C(2)=Email  D(3)=Réduction_%
//   E(4)=Commission_%  F(5)=Actif
//   G(6)=Nb_Commandes  H(7)=Montant_Généré  I(8)=Commission_À_Payer
//
// DÉCLENCHEURS REQUIS :
//   Déclencheurs > + Ajouter > onEditCommandes > Lors de la modification
//   ⚠️ Déclencheur INSTALLABLE obligatoire (UrlFetchApp = autorisations requises)

var COL_CODE    = 6;   // G — Code_U_Affilié   (0-indexé)
var COL_MONTANT = 9;   // J — Montant_Final     (0-indexé)
var COL_STATUT  = 11;  // L — Statut            (0-indexé)
var COL_LOG     = 14;  // O — Sync_Firebase     (0-indexé)

// 1-indexé pour getColumn() / getRange()
var COL1_NOM    = 2;   // B
var COL1_TEL    = 3;   // C
var COL1_EMAIL  = 4;   // D
var COL1_CODE   = 7;   // G
var COL1_NOM_AF = 8;   // H
var COL1_STATUT = 12;  // L
var COL1_LOG    = 15;  // O

// ============================================================
// DÉCLENCHEUR PRINCIPAL — Surveille cols G, C, D, L
// ============================================================
function onEditCommandes(e) {
  try {
    if (!e || !e.source) return;
    var range = e.range;
    var sheet = range.getSheet();
    if (!sheet || sheet.getName() !== 'Commandes') return;

    var row = range.getRow();
    var col = range.getColumn(); // 1-indexé

    if (row <= 1) return;
    if (col === COL1_LOG) return; // ignorer col O (log)

    var newVal = String(range.getValue()).trim();

    // ── Auto-Liaison : col G modifiée → remplir col H ──────────
    if (col === COL1_CODE) {
      Logger.log('[Auto-Liaison] col G modifiée ligne ' + row + ' — code: ' + newVal);
      autoLiaisonAffilie(sheet, row, newVal);
      return;
    }

    // ── Mémoire Client : col C (Tel) ou col D (Email) modifiée ─
    if (col === COL1_TEL || col === COL1_EMAIL) {
      var type = col === COL1_TEL ? 'tel' : 'email';
      Logger.log('[Client Memory] col ' + (col === COL1_TEL ? 'C' : 'D') + ' modifiée ligne ' + row + ' — valeur: ' + newVal);
      memoireClient(sheet, row, newVal, type);
      return;
    }

    // ── Webhook Firebase : col L (Statut) modifiée ──────────────
    if (col !== COL1_STATUT) return;

    var oldVal = e.oldValue ? String(e.oldValue).trim() : '';
    if (oldVal === newVal) return;

    var statutsAcceptes = ['En attente', 'Payé', 'Confirmé'];
    if (statutsAcceptes.indexOf(newVal) === -1) return;

    var maxCols = Math.max(sheet.getLastColumn(), COL1_LOG);
    var data = sheet.getRange(row, 1, 1, maxCols).getValues()[0];
    var code = (data[COL_CODE] || '').toString().trim();

    if (!code) {
      Logger.log('[Webhook] code vide ligne ' + row + ' — ignoré');
      return;
    }

    var estConfirme = (newVal === 'Payé' || newVal === 'Confirmé');

    // Garde-fou anti-429 : pour "En attente" uniquement
    // Pour "Payé"/"Confirmé" on force le sync même si code absent (Auto-Correction ❌→✅)
    if (!estConfirme && !codeExisteDansAffilies(code)) {
      Logger.log('[Webhook] code ' + code + ' inconnu dans Affiliés_Codes + statut "En attente" — ignoré');
      logSync(sheet, row, '⏸ ' + code + ' — pas dans Affiliés ' + horaireLocal());
      return;
    }

    var montantRaw = data[COL_MONTANT];
    var montant = (montantRaw !== undefined && montantRaw !== '')
      ? parseMontantSecurise(String(montantRaw))
      : 0;
    if (isNaN(montant)) montant = 0;

    Logger.log('[Webhook] statut=' + newVal + ' | code=' + code + ' | montant=' + montant + ' FCFA');

    // Marquer "en cours" avant l'appel HTTP
    logSync(sheet, row, '🔄 Sync... ' + horaireLocal());

    // 1. Webhook Vercel → Firestore
    var webhookOk = envoyerWebhook({
      action: 'update_statut',
      code: code,
      amount: montant,
      statut: newVal,
    });
    Logger.log('[Webhook Success] ok=' + webhookOk + ' | code=' + code + ' | statut=' + newVal);

    // 2. Mettre à jour Affiliés_Codes UNIQUEMENT si Payé ou Confirmé
    if (estConfirme) {
      mettreAJourAffilie(code, montant);
    }

    // 3. Log final col O
    var logMsg = webhookOk
      ? (estConfirme
          ? '✅ ' + code + ' ' + montant + ' FCFA ' + horaireLocal()
          : '⏳ ' + code + ' ' + horaireLocal())
      : '❌ ' + code + ' erreur ' + horaireLocal();
    logSync(sheet, row, logMsg);

  } catch (err) {
    Logger.log('[onEditCommandes] ERREUR : ' + err.toString());
  }
}

// ============================================================
// AUTO-LIAISON — Col G modifiée → cherche Nom Affilié → écrit col H
// ============================================================
function autoLiaisonAffilie(sheet, row, code) {
  if (!code || code.trim() === '') return;
  code = code.trim();

  var sheetAffil = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Affiliés_Codes');
  if (!sheetAffil) {
    Logger.log('[Auto-Liaison] onglet Affiliés_Codes introuvable');
    return;
  }

  var lastRow = sheetAffil.getLastRow();
  if (lastRow < 2) return;

  var data = sheetAffil.getRange(2, 1, lastRow - 1, 6).getValues();

  for (var i = 0; i < data.length; i++) {
    var codeSheet = (data[i][0] || '').toString().trim();
    if (codeSheet !== code) continue;

    var nomAffilie    = (data[i][1] || '').toString().trim(); // col B
    var reductionPct  = data[i][3] || 0;                      // col D

    // Écrire Nom Affilié en col H
    sheet.getRange(row, COL1_NOM_AF).setValue(nomAffilie);

    // Écrire Réduction_% en col I si elle est vide
    var cellI = sheet.getRange(row, 9); // col I
    if (!cellI.getValue()) {
      cellI.setValue(reductionPct);
    }

    Logger.log(
      '[Auto-Liaison] ✅ code=' + code +
      ' → H=' + nomAffilie +
      ' | réduction=' + reductionPct + '%' +
      ' (ligne ' + row + ')'
    );
    return;
  }

  Logger.log('[Auto-Liaison] code ' + code + ' non trouvé dans Affiliés_Codes — H non remplie');
}

// ============================================================
// MÉMOIRE CLIENT — Tel/Email saisi → pré-remplir Nom si connu
// ============================================================
function memoireClient(sheet, row, valeur, type) {
  if (!valeur || valeur.trim() === '') return;
  valeur = valeur.trim();

  // Ne pas écraser un nom déjà présent
  var cellNom = sheet.getRange(row, COL1_NOM);
  if (cellNom.getValue() && cellNom.getValue().toString().trim() !== '') {
    Logger.log('[Client Memory] nom déjà présent en B' + row + ' — skip');
    return;
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  // Lire tout l'historique Commandes (col B, C, D uniquement — plus léger)
  var histData = sheet.getRange(2, 1, lastRow - 1, 4).getValues();

  var colRecherche = type === 'tel' ? 2 : 3; // C=2, D=3 (0-indexé dans histData)

  for (var i = 0; i < histData.length; i++) {
    var targetRow = i + 2;
    if (targetRow === row) continue; // ne pas comparer la ligne courante

    var valHist = (histData[i][colRecherche] || '').toString().trim();
    if (valHist !== valeur) continue;

    var nomConnu = (histData[i][1] || '').toString().trim(); // col B
    if (!nomConnu) continue;

    // Client trouvé — pré-remplir col B
    cellNom.setValue(nomConnu);

    Logger.log(
      '[Client Memory Found] ' + type + '=' + valeur +
      ' → Nom=' + nomConnu +
      ' (depuis ligne ' + targetRow + ', écrit en B' + row + ')'
    );
    return;
  }

  Logger.log('[Client Memory] ' + type + '=' + valeur + ' — client inconnu dans historique');
}

// ============================================================
// LOG SYNC — Écrit dans col O (COL1_LOG)
// ============================================================
function logSync(sheet, row, message) {
  try {
    var maxCols = sheet.getLastColumn();
    if (maxCols >= COL1_LOG) {
      sheet.getRange(row, COL1_LOG).setValue(message);
    }
  } catch (err) {
    Logger.log('[logSync] erreur : ' + err.toString());
  }
}

// ============================================================
// VÉRIFIER EXISTENCE DU CODE DANS AFFILIÉS_CODES
// ============================================================
function codeExisteDansAffilies(code) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Affiliés_Codes');
  if (!sheet) return false;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  var codes = sheet.getRange(2, 1, lastRow - 1, 1).getValues()
    .map(function(r) { return String(r[0]).trim(); });
  return codes.indexOf(code) !== -1;
}

// ============================================================
// MISE À JOUR AFFILIÉS_CODES — Incrémente G, H, I sur "Payé"
// ============================================================
function mettreAJourAffilie(code, montant) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Affiliés_Codes');
  if (!sheet) {
    Logger.log('[mettreAJourAffilie] onglet Affiliés_Codes introuvable');
    return;
  }
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var data = sheet.getRange(2, 1, lastRow - 1, 9).getValues();

  for (var i = 0; i < data.length; i++) {
    var codeSheet = (data[i][0] || '').toString().trim();
    if (codeSheet !== code) continue;

    var realRow = i + 2;
    var commissionPct  = parseFloat(data[i][4]) || 0;  // col E (index 4) = Commission_%
    var nbActuel       = parseInt(data[i][6], 10) || 0; // col G (index 6) = Nb_Commandes
    var montantActuel  = parseFloat(data[i][7]) || 0;  // col H (index 7) = Montant_Généré
    var commActuelle   = parseFloat(data[i][8]) || 0;  // col I (index 8) = Commission_À_Payer

    var nouvelleCommission = Math.round(montant * commissionPct / 100);
    var newNb      = nbActuel + 1;
    var newMontant = montantActuel + montant;
    var newComm    = commActuelle + nouvelleCommission;

    sheet.getRange(realRow, 7, 1, 3).setValues([[newNb, newMontant, newComm]]);

    Logger.log(
      '[mettreAJourAffilie] ✅ ligne ' + realRow +
      ' | code=' + code +
      ' | nb=' + newNb +
      ' | montant=' + newMontant +
      ' | commission=' + newComm +
      ' (taux ' + commissionPct + '%)'
    );
    return;
  }

  Logger.log('[mettreAJourAffilie] code "' + code + '" non trouvé dans Affiliés_Codes');
}

// ============================================================
// ENVOI WEBHOOK — POST vers Vercel /api/sheets-webhook
// ============================================================
function envoyerWebhook(payload) {
  var secret = PropertiesService.getScriptProperties().getProperty('SHEETS_WEBHOOK_SECRET');
  if (!secret) {
    Logger.log('[envoyerWebhook] SHEETS_WEBHOOK_SECRET manquant');
    return false;
  }

  var url = 'https://llui-signature-hebergements.vercel.app/api/sheets-webhook';

  var options = {
    method: 'POST',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + secret },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    var body = response.getContentText().slice(0, 300);
    Logger.log('[envoyerWebhook] HTTP ' + code + ' — ' + body);
    return code >= 200 && code < 300;
  } catch (err) {
    Logger.log('[envoyerWebhook] ERREUR fetch : ' + err.toString());
    return false;
  }
}

// ============================================================
// WEBHOOK BOUTIQUE PASS VIP → /api/webhooks/boutique-pass
// Crée le doc Firestore pending + envoie email admin avec bouton /admin/confirm/{token}
// ============================================================
function envoyerWebhookBoutiquePass(data) {
  var secret = PropertiesService.getScriptProperties().getProperty('SHEETS_WEBHOOK_SECRET');
  if (!secret) {
    Logger.log('[WebhookPassVip] SHEETS_WEBHOOK_SECRET manquant dans les propriétés du script');
    return false;
  }

  var url = 'https://llui-signature-hebergements.vercel.app/api/webhooks/boutique-pass';

  var options = {
    method: 'POST',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + secret,
      'X-Webhook-Secret': secret,
    },
    payload: JSON.stringify(data),
    muteHttpExceptions: true,
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    var body = response.getContentText().slice(0, 500);
    Logger.log('[WebhookPassVip] HTTP ' + code + ' — ' + body);
    return code >= 200 && code < 300;
  } catch (err) {
    Logger.log('[WebhookPassVip] ERREUR fetch : ' + err.toString());
    return false;
  }
}

// ============================================================
// UTILITAIRES CANAL 2
// ============================================================

/**
 * Parse un montant depuis une chaîne Sheets.
 * Gère : espaces milliers, point comme séparateur de milliers (7.500 → 7500),
 * virgule décimale (12,50 → 12.5), suffixe FCFA.
 * ⚠️ Supprime TOUS les points avant de traiter — adapté aux montants FCFA entiers.
 */
function parseMontantSecurise(raw) {
  if (raw === null || raw === undefined) return 0;
  var cleaned = raw.toString()
    .replace(/\s/g, '')      // espaces (séparateurs de milliers)
    .replace(/\./g, '')      // points (séparateurs de milliers style européen)
    .replace(/FCFA/gi, '')   // symbole monétaire
    .replace(',', '.');      // virgule décimale → point
  var val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

function horaireLocal() {
  return Utilities.formatDate(new Date(), 'Africa/Douala', 'HH:mm');
}

// ============================================================
// TEST MANUEL — À lancer depuis l'éditeur Apps Script
// ============================================================
/**
 * USAGE :
 * 1. Modifier TEST_CODE, TEST_MONTANT et TEST_STATUT ci-dessous
 * 2. Sélectionner "testManuel" dans le menu déroulant de l'éditeur
 * 3. Cliquer ▶ puis vérifier les logs (Ctrl+Entrée)
 */
function testManuel() {
  var TEST_CODE    = '123456'; // ← remplace par ton code de test
  var TEST_MONTANT = 7500;    // ← remplace par le montant (FCFA)
  var TEST_STATUT  = 'Payé';  // 'En attente' | 'Payé' | 'Confirmé'

  Logger.log('=== TEST MANUEL ===');
  Logger.log('Code: ' + TEST_CODE + ' | Montant: ' + TEST_MONTANT + ' | Statut: ' + TEST_STATUT);

  var webhookOk = envoyerWebhook({
    action: 'update_statut',
    code: TEST_CODE,
    amount: TEST_MONTANT,
    statut: TEST_STATUT,
  });

  if (TEST_STATUT === 'Payé' || TEST_STATUT === 'Confirmé') {
    mettreAJourAffilie(TEST_CODE, TEST_MONTANT);
  }

  Logger.log('=== FIN TEST | webhook ok: ' + webhookOk + ' ===');
}
