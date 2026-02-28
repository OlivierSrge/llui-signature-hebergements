import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.FROM_EMAIL ?? 'L&Lui Signature <onboarding@resend.dev>'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'contact@llui-signature.cm'

function paymentLabel(method: string) {
  const labels: Record<string, string> = {
    orange_money: 'Orange Money',
    virement: 'Virement bancaire',
    especes: 'Espèces',
  }
  return labels[method] ?? method
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA'
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

// ─── Reservation emails ────────────────────────────────────────────────────

export async function sendReservationEmails(reservation: {
  id: string
  accommodation: { name: string; slug: string; location?: string }
  guest_first_name: string
  guest_last_name: string
  guest_email: string
  guest_phone: string
  check_in: string
  check_out: string
  nights: number
  guests: number
  total_price: number
  payment_method: string
  notes?: string | null
}) {
  const {
    id, accommodation, guest_first_name, guest_last_name,
    guest_email, guest_phone, check_in, check_out,
    nights, guests, total_price, payment_method, notes,
  } = reservation

  const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://llui-signature.vercel.app'}/admin/reservations/${id}`

  const sharedTable = `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
      <tr style="border-bottom:1px solid #e8e0d5">
        <td style="padding:10px 0;color:#666;width:40%">Hébergement</td>
        <td style="padding:10px 0;font-weight:600;color:#1a1a1a">${accommodation.name}</td>
      </tr>
      ${accommodation.location ? `<tr style="border-bottom:1px solid #e8e0d5">
        <td style="padding:10px 0;color:#666">Localisation</td>
        <td style="padding:10px 0;color:#1a1a1a">${accommodation.location}</td>
      </tr>` : ''}
      <tr style="border-bottom:1px solid #e8e0d5">
        <td style="padding:10px 0;color:#666">Arrivée</td>
        <td style="padding:10px 0;color:#1a1a1a">${formatDate(check_in)}</td>
      </tr>
      <tr style="border-bottom:1px solid #e8e0d5">
        <td style="padding:10px 0;color:#666">Départ</td>
        <td style="padding:10px 0;color:#1a1a1a">${formatDate(check_out)}</td>
      </tr>
      <tr style="border-bottom:1px solid #e8e0d5">
        <td style="padding:10px 0;color:#666">Durée</td>
        <td style="padding:10px 0;color:#1a1a1a">${nights} nuit${nights > 1 ? 's' : ''}</td>
      </tr>
      <tr style="border-bottom:1px solid #e8e0d5">
        <td style="padding:10px 0;color:#666">Voyageurs</td>
        <td style="padding:10px 0;color:#1a1a1a">${guests} personne${guests > 1 ? 's' : ''}</td>
      </tr>
      <tr style="border-bottom:1px solid #e8e0d5">
        <td style="padding:10px 0;color:#666">Total</td>
        <td style="padding:10px 0;font-weight:700;color:#c9a227;font-size:16px">${formatPrice(total_price)}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#666">Mode de paiement</td>
        <td style="padding:10px 0;color:#1a1a1a">${paymentLabel(payment_method)}</td>
      </tr>
      ${notes ? `<tr>
        <td style="padding:10px 0;color:#666;vertical-align:top">Notes</td>
        <td style="padding:10px 0;color:#1a1a1a">${notes}</td>
      </tr>` : ''}
    </table>`

  const emailBase = (content: string) => `
    <!DOCTYPE html>
    <html lang="fr">
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f5f0eb;font-family:'Helvetica Neue',Arial,sans-serif">
      <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
        <div style="background:#1a1a1a;padding:28px 32px;text-align:center">
          <span style="font-family:Georgia,serif;font-size:24px;font-weight:600;color:#fff">
            L<span style="color:#c9a227">&</span>Lui Signature
          </span>
        </div>
        <div style="padding:32px">${content}</div>
        <div style="background:#f5f0eb;padding:20px 32px;text-align:center;font-size:12px;color:#999">
          © L&Lui Signature — Kribi, Cameroun
        </div>
      </div>
    </body>
    </html>`

  // Email to admin
  const adminHtml = emailBase(`
    <h2 style="margin:0 0 4px;font-family:Georgia,serif;font-size:22px;color:#1a1a1a">
      Nouvelle demande de réservation
    </h2>
    <p style="margin:0 0 20px;color:#888;font-size:14px">Référence : #${id.slice(-8).toUpperCase()}</p>
    <div style="background:#f5f0eb;border-radius:10px;padding:16px 20px;margin-bottom:20px">
      <p style="margin:0 0 4px;font-size:13px;color:#888">Client</p>
      <p style="margin:0;font-size:16px;font-weight:600;color:#1a1a1a">${guest_first_name} ${guest_last_name}</p>
      <p style="margin:4px 0 0;font-size:14px;color:#555">${guest_email} · ${guest_phone}</p>
    </div>
    ${sharedTable}
    <div style="text-align:center;margin-top:28px">
      <a href="${adminUrl}" style="display:inline-block;background:#c9a227;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:14px">
        Traiter la demande →
      </a>
    </div>
  `)

  // Email to client
  const clientHtml = emailBase(`
    <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:22px;color:#1a1a1a">
      Demande bien reçue !
    </h2>
    <p style="margin:0 0 24px;color:#555;line-height:1.6">
      Bonjour <strong>${guest_first_name}</strong>,<br>
      Votre demande de réservation a bien été enregistrée. Notre équipe vous contactera
      dans les <strong>24 heures</strong> pour confirmer votre séjour.
    </p>
    ${sharedTable}
    <div style="background:#fffbf0;border:1px solid #e8d88a;border-radius:10px;padding:16px 20px;margin-top:24px">
      <p style="margin:0;font-size:13px;color:#7a6010;line-height:1.6">
        <strong>Prochaine étape :</strong> notre équipe vous contactera par email ou téléphone
        pour valider votre réservation et vous communiquer les instructions de paiement.
      </p>
    </div>
    <p style="margin:24px 0 0;font-size:13px;color:#999;text-align:center">
      Une question ? Écrivez-nous à <a href="mailto:${ADMIN_EMAIL}" style="color:#c9a227">${ADMIN_EMAIL}</a>
    </p>
  `)

  await Promise.allSettled([
    resend.emails.send({
      from: FROM,
      to: ADMIN_EMAIL,
      subject: `[L&Lui] Nouvelle réservation – ${accommodation.name} (#${id.slice(-8).toUpperCase()})`,
      html: adminHtml,
    }),
    resend.emails.send({
      from: FROM,
      to: guest_email,
      subject: `Votre demande de réservation – ${accommodation.name}`,
      html: clientHtml,
    }),
  ])
}

// ─── Pack request email ────────────────────────────────────────────────────

export async function sendPackRequestEmail(data: {
  pack_name: string
  first_name: string
  last_name: string
  email: string
  phone: string
  event_date?: string
  guests?: number
  message?: string
}) {
  const { pack_name, first_name, last_name, email, phone, event_date, guests, message } = data

  const emailBase = (content: string) => `
    <!DOCTYPE html>
    <html lang="fr">
    <body style="margin:0;padding:0;background:#f5f0eb;font-family:'Helvetica Neue',Arial,sans-serif">
      <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
        <div style="background:#1a1a1a;padding:28px 32px;text-align:center">
          <span style="font-family:Georgia,serif;font-size:24px;font-weight:600;color:#fff">
            L<span style="color:#c9a227">&</span>Lui Signature
          </span>
        </div>
        <div style="padding:32px">${content}</div>
        <div style="background:#f5f0eb;padding:20px 32px;text-align:center;font-size:12px;color:#999">
          © L&Lui Signature — Kribi, Cameroun
        </div>
      </div>
    </body>
    </html>`

  const adminHtml = emailBase(`
    <h2 style="margin:0 0 4px;font-family:Georgia,serif;font-size:22px;color:#1a1a1a">
      Demande de pack logements
    </h2>
    <p style="margin:0 0 20px;color:#888;font-size:14px">Pack : <strong>${pack_name}</strong></p>
    <div style="background:#f5f0eb;border-radius:10px;padding:16px 20px;margin-bottom:20px">
      <p style="margin:0 0 4px;font-size:13px;color:#888">Contact</p>
      <p style="margin:0;font-size:16px;font-weight:600;color:#1a1a1a">${first_name} ${last_name}</p>
      <p style="margin:4px 0 0;font-size:14px;color:#555">${email} · ${phone}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${event_date ? `<tr style="border-bottom:1px solid #e8e0d5">
        <td style="padding:10px 0;color:#666;width:40%">Date de l'événement</td>
        <td style="padding:10px 0;font-weight:600;color:#1a1a1a">${formatDate(event_date)}</td>
      </tr>` : ''}
      ${guests ? `<tr style="border-bottom:1px solid #e8e0d5">
        <td style="padding:10px 0;color:#666">Nombre de personnes</td>
        <td style="padding:10px 0;color:#1a1a1a">${guests}</td>
      </tr>` : ''}
      ${message ? `<tr>
        <td style="padding:10px 0;color:#666;vertical-align:top">Message</td>
        <td style="padding:10px 0;color:#1a1a1a">${message}</td>
      </tr>` : ''}
    </table>
  `)

  const clientHtml = emailBase(`
    <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:22px;color:#1a1a1a">
      Demande bien reçue !
    </h2>
    <p style="margin:0 0 24px;color:#555;line-height:1.6">
      Bonjour <strong>${first_name}</strong>,<br>
      Nous avons bien reçu votre demande pour le <strong>${pack_name}</strong>.
      Notre équipe vous contactera dans les <strong>24 heures</strong> pour vous
      proposer un devis personnalisé.
    </p>
    <p style="margin:24px 0 0;font-size:13px;color:#999;text-align:center">
      Une question ? Écrivez-nous à <a href="mailto:${ADMIN_EMAIL}" style="color:#c9a227">${ADMIN_EMAIL}</a>
    </p>
  `)

  await Promise.allSettled([
    resend.emails.send({
      from: FROM,
      to: ADMIN_EMAIL,
      subject: `[L&Lui] Demande pack – ${pack_name}`,
      html: adminHtml,
    }),
    resend.emails.send({
      from: FROM,
      to: email,
      subject: `Votre demande de pack – ${pack_name}`,
      html: clientHtml,
    }),
  ])
}
