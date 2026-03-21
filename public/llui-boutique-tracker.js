// llui-boutique-tracker.js — Tracking conversions invités L&Lui Signature
// Version 2 : compatible avec ?code=[code_promo]&ref=[mariage_uid]
// À inclure dans <head> de chaque page boutique Netlify
(function () {
  var APP_URL = 'https://llui-signature-hebergements.vercel.app';

  // 1. Capturer code_promo + mariage_uid depuis l'URL
  var params = new URLSearchParams(window.location.search);
  var code = params.get('code');    // code promo (ex: LLUI-GJ-2026)
  var ref  = params.get('ref');     // mariage_uid (ex: mariage_gabriel_julie_2026)
  // Compatibilité ancien format : ?ref=[guest_id]&mariage=[mariage_uid]
  var legacyGuest   = params.get('ref') && params.get('mariage') ? params.get('ref') : null;
  var legacyMariage = params.get('mariage');

  if (code && ref) {
    try {
      localStorage.setItem('llui_ref_v2', JSON.stringify({ code_promo: code, mariage_uid: ref }));
    } catch (e) {}
  } else if (legacyGuest && legacyMariage) {
    // Migration : conserver ancien format dans llui_ref pour compatibilité
    try {
      localStorage.setItem('llui_ref', JSON.stringify({ guest_id: legacyGuest, mariage_uid: legacyMariage }));
    } catch (e) {}
  }

  // 2. Pré-remplir les formulaires avec le code promo
  function fillForms() {
    var stored;
    try { stored = JSON.parse(localStorage.getItem('llui_ref_v2') || 'null'); } catch (e) {}
    if (!stored || !stored.code_promo) return;

    // Chercher input[name="Code_U"] ou data-llui-code ou champs similaires
    var codeInputs = document.querySelectorAll(
      'input[name="Code_U"], input[name="code_u"], input[name="code_promo"], ' +
      'input[data-llui-code], input[placeholder*="code"], input[placeholder*="Code"]'
    );
    for (var i = 0; i < codeInputs.length; i++) {
      var input = codeInputs[i];
      if (!input.value) {
        input.value = stored.code_promo;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    // Injecter hidden input dans tous les formulaires si pas encore présent
    var forms = document.querySelectorAll('form');
    for (var f = 0; f < forms.length; f++) {
      var form = forms[f];
      if (form.querySelector('input[name="Code_U"]')) continue;
      var hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = 'Code_U';
      hidden.value = stored.code_promo;
      form.appendChild(hidden);
    }
  }

  // Exécuter maintenant et après chargement complet
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fillForms);
  } else {
    fillForms();
  }

  // 3. Sur page de confirmation → envoyer la conversion
  var isConfirmation = /\/(confirmation|merci|success|thank)/i.test(window.location.pathname);
  if (!isConfirmation) return;

  var stored;
  try { stored = JSON.parse(localStorage.getItem('llui_ref_v2') || 'null'); } catch (e) {}
  if (!stored || !stored.code_promo || !stored.mariage_uid) {
    // Fallback ancien format
    try { stored = JSON.parse(localStorage.getItem('llui_ref') || 'null'); } catch (e) {}
    if (stored && stored.guest_id && stored.mariage_uid) {
      stored = { code_promo: null, mariage_uid: stored.mariage_uid, guest_id: stored.guest_id };
    } else {
      return;
    }
  }

  // 4. Lire le montant depuis data-order-total, input[name="total"] ou URL
  var amount = 0;
  var el = document.querySelector('[data-order-total]');
  if (el) amount = parseFloat(el.getAttribute('data-order-total') || '0') || 0;
  if (!amount) {
    var totalInput = document.querySelector('input[name="total"], input[name="montant"]');
    if (totalInput) amount = parseFloat(totalInput.value) || 0;
  }
  if (!amount) {
    var m = window.location.search.match(/[?&]total=([0-9.]+)/);
    if (m) amount = parseFloat(m[1]) || 0;
  }
  if (amount <= 0) return;

  // 5. Envoyer la conversion
  fetch(APP_URL + '/api/portail/track-conversion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      guest_id: stored.guest_id || stored.code_promo,
      mariage_uid: stored.mariage_uid,
      code_promo: stored.code_promo || null,
      amount_ht: Math.round(amount),
      type: 'BOUTIQUE',
      source: 'netlify_boutique'
    })
  }).then(function () {
    try {
      localStorage.removeItem('llui_ref_v2');
      localStorage.removeItem('llui_ref');
    } catch (e) {}
  }).catch(function () {});
})();
