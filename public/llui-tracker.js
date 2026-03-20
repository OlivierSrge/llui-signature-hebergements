(function() {
  const params = new URLSearchParams(window.location.search);
  const guestId = params.get('ref');
  const mariageUid = params.get('mariage');
  if (guestId) localStorage.setItem('llui_guest_id', guestId);
  if (mariageUid) localStorage.setItem('llui_mariage_uid', mariageUid);
  const path = window.location.pathname;
  if (path.includes('/confirmation') || path.includes('/merci')) {
    const g = localStorage.getItem('llui_guest_id');
    const m = localStorage.getItem('llui_mariage_uid');
    if (g && m) {
      const el = document.querySelector('[data-order-total]');
      const montant = el ? parseInt(el.textContent.replace(/\D/g,'')) : 0;
      if (montant > 0) {
        fetch('https://llui-signature-hebergements.vercel.app/api/portail/track-conversion', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            guest_id: g, mariage_uid: m,
            amount_ht: montant, type: 'BOUTIQUE',
            source: 'boutique_netlify'
          })
        }).catch(() => {});
        localStorage.removeItem('llui_guest_id');
        localStorage.removeItem('llui_mariage_uid');
      }
    }
  }
})();
