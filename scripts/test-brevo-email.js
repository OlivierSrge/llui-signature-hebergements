/**
 * Test d'envoi email via Brevo (API v3)
 *
 * Usage depuis la racine du projet :
 *   node scripts/test-brevo-email.js
 *
 * Variables requises dans .env.local :
 *   BREVO_API_KEY=xkeysib-...
 *   BREVO_SENDER_EMAIL=votre@domaine.com   (optionnel — défaut: olivierfinestone@gmail.com)
 */

const fs = require('fs')
const path = require('path')

// ─── Chargement .env.local ────────────────────────────────────────────────────

const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)="(.*)"$/)
    if (m) process.env[m[1]] = m[2]
  })
}

// ─── Validation ───────────────────────────────────────────────────────────────

const BREVO_API_KEY    = process.env.BREVO_API_KEY
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL ?? 'olivierfinestone@gmail.com'
const TO_EMAIL         = 'olivier.serge2001@gmail.com'

if (!BREVO_API_KEY) {
  console.error('\n❌  BREVO_API_KEY manquante dans .env.local')
  console.error('   Ajoutez : BREVO_API_KEY="xkeysib-votre-clé-ici"\n')
  process.exit(1)
}

// ─── Envoi ────────────────────────────────────────────────────────────────────

const payload = {
  sender: {
    name: 'Alliance Privée Test',
    email: BREVO_SENDER_EMAIL,
  },
  to: [{ email: TO_EMAIL, name: 'Olivier Serge' }],
  subject: '🧪 Test Brevo Alliance Privée',
  htmlContent: `
    <!DOCTYPE html>
    <html lang="fr">
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:40px;background:#0a0a0a;font-family:Arial,sans-serif;">
      <div style="max-width:480px;margin:0 auto;background:#111;border:1px solid #C9A84C33;border-radius:16px;padding:32px;text-align:center;">
        <p style="color:#C9A84C;font-size:11px;letter-spacing:4px;text-transform:uppercase;margin:0 0 16px;">✦ Alliance Privée ✦</p>
        <h1 style="color:#ffffff;font-size:22px;font-weight:300;margin:0 0 12px;">Test réussi !</h1>
        <p style="color:#ffffff66;font-size:14px;line-height:1.6;margin:0 0 24px;">
          L&apos;intégration Brevo fonctionne correctement.<br>
          Les emails Alliance Privée seront bien délivrés.
        </p>
        <div style="background:#C9A84C;color:#000;font-size:13px;font-weight:600;padding:12px 24px;border-radius:10px;display:inline-block;">
          ✓ Configuration validée
        </div>
        <p style="color:#ffffff22;font-size:11px;margin:24px 0 0;">
          Expéditeur : ${BREVO_SENDER_EMAIL}<br>
          Envoyé le : ${new Date().toLocaleString('fr-FR')}
        </p>
      </div>
    </body>
    </html>
  `,
}

async function main() {
  console.log('\n📧  Test Brevo en cours...')
  console.log(`    Expéditeur : ${BREVO_SENDER_EMAIL}`)
  console.log(`    Destinataire : ${TO_EMAIL}`)
  console.log(`    Sujet : ${payload.subject}\n`)

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'api-key': BREVO_API_KEY,
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json()

  if (response.ok) {
    console.log(`✅  Email envoyé avec succès !`)
    console.log(`    Message ID Brevo : ${data.messageId ?? '(non retourné)'}`)
    console.log(`    Statut HTTP      : ${response.status}\n`)
  } else {
    console.error(`❌  Échec de l'envoi`)
    console.error(`    Statut HTTP : ${response.status}`)
    console.error(`    Code erreur : ${data.code ?? '—'}`)
    console.error(`    Message     : ${data.message ?? JSON.stringify(data)}\n`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('❌  Erreur réseau :', err.message)
  process.exit(1)
})
