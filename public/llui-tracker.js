// llui-tracker.js — Tracking conversions invités L&Lui Signature
// À inclure dans <head> de chaque page boutique Netlify
(function () {
  var APP_URL = 'https://llui-signature-hebergements.vercel.app';

  // 1. Capturer ref + mariage depuis l'URL
  var params = new URLSearchParams(window.location.search);
  var ref = params.get('ref');
  var mariage = params.get('mariage');
  if (ref && mariage) {
    try { localStorage.setItem('llui_ref', JSON.stringify({ guest_id: ref, mariage_uid: mariage })); } catch (e) {}
  }

  // 2. Sur page de confirmation ou merci → envoyer la conversion
  var isConfirmation = /\/(confirmation|merci|success|thank)/i.test(window.location.pathname);
  if (!isConfirmation) return;

  var stored;
  try { stored = JSON.parse(localStorage.getItem('llui_ref') || 'null'); } catch (e) {}
  if (!stored || !stored.guest_id || !stored.mariage_uid) return;

  // 3. Lire le montant depuis data-order-total ou l'URL
  var amount = 0;
  var el = document.querySelector('[data-order-total]');
  if (el) amount = parseFloat(el.getAttribute('data-order-total') || '0') || 0;
  if (!amount) {
    var m = window.location.search.match(/[?&]total=([0-9.]+)/);
    if (m) amount = parseFloat(m[1]) || 0;
  }
  if (amount <= 0) return;

  // 4. Envoyer la conversion
  fetch(APP_URL + '/api/portail/track-conversion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      guest_id: stored.guest_id,
      mariage_uid: stored.mariage_uid,
      amount_ht: Math.round(amount),
      type: 'BOUTIQUE',
      source: 'netlify_boutique'
    })
  }).then(function () {
    try { localStorage.removeItem('llui_ref'); } catch (e) {}
  }).catch(function () {});
})();
