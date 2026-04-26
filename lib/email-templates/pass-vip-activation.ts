// lib/email-templates/pass-vip-activation.ts — Email HTML activation Pass VIP client

export function getPassVipActivationEmailHtml(data: {
  nom: string
  type_pass: string
  date_fin: string
  email: string
  password: string
  login_url: string
}): string {
  const { nom, type_pass, date_fin, email, password, login_url } = data
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
    <div style="background:#1a1a1a;padding:28px 32px;text-align:center">
      <span style="font-family:Georgia,serif;font-size:24px;font-weight:600;color:#fff">L<span style="color:#c9a227">&</span>Lui Signature</span>
    </div>
    <div style="padding:32px">
      <div style="text-align:center;margin-bottom:24px">
        <div style="font-size:48px;margin-bottom:12px">✅</div>
        <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;color:#1a1a1a">Votre Pass VIP est activé !</h1>
        <p style="margin:0;color:#666;font-size:15px">Bienvenue dans le Club VIP L&amp;Lui, ${nom}</p>
      </div>

      <div style="background:linear-gradient(135deg,#C9A84C,#D4AF37);border-radius:12px;padding:20px;margin-bottom:24px;text-align:center">
        <p style="margin:0 0 4px;font-size:12px;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:.05em">Votre Pass</p>
        <p style="margin:0 0 4px;font-size:26px;font-weight:700;color:#fff">${type_pass}</p>
        <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.9)">Valide jusqu'au ${date_fin}</p>
      </div>

      <div style="background:#F5F0E8;border-radius:12px;padding:20px;margin-bottom:24px">
        <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#1a1a1a;text-transform:uppercase;letter-spacing:.05em">🔐 Vos identifiants</p>
        <table style="width:100%;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#666;width:45%">Email</td><td style="padding:6px 0;font-family:monospace;color:#1a1a1a">${email}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Mot de passe</td><td style="padding:6px 0;font-family:monospace;font-size:18px;font-weight:700;color:#C9A84C">${password}</td></tr>
        </table>
      </div>

      <div style="text-align:center;margin-bottom:24px">
        <a href="${login_url}" style="display:inline-block;background:#C9A84C;color:#1a1a1a;text-decoration:none;padding:16px 32px;border-radius:12px;font-weight:700;font-size:16px">
          ✦ Accéder à mon espace VIP
        </a>
        <p style="margin:10px 0 0;font-size:11px;color:#aaa">${login_url}</p>
      </div>

      <div style="background:#FFF8E7;border:1px solid #E8D5A3;border-radius:12px;padding:16px;margin-bottom:20px">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#C9A84C">🎯 Vos avantages</p>
        <ul style="margin:0;padding:0 0 0 16px;font-size:13px;color:#555;line-height:2">
          <li>Réductions garanties chez tous nos partenaires à Kribi</li>
          <li>Codes QR temporaires (valides 5 min, usage unique)</li>
          <li>Validation instantanée par scan partenaire</li>
        </ul>
      </div>

      <p style="margin:0;font-size:12px;color:#aaa;text-align:center;line-height:1.6">
        Changez votre mot de passe après la première connexion.<br>
        ✦ L&amp;Lui Signature — Kribi, Cameroun
      </p>
    </div>
    <div style="background:#F5F0E8;padding:20px 32px;text-align:center;font-size:12px;color:#999">
      © L&amp;Lui Signature — Kribi, Cameroun
    </div>
  </div>
</body>
</html>`
}
