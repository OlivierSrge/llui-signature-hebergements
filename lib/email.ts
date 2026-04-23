import { Resend } from 'resend'

let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

// Resend plan gratuit : FROM doit être onboarding@resend.dev (domaine non vérifié)
const FROM = process.env.FROM_EMAIL ?? 'onboarding@resend.dev'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'contact@l-et-lui.com'

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
    getResend().emails.send({
      from: FROM,
      to: ADMIN_EMAIL,
      subject: `[L&Lui] Nouvelle réservation – ${accommodation.name} (#${id.slice(-8).toUpperCase()})`,
      html: adminHtml,
    }),
    getResend().emails.send({
      from: FROM,
      to: guest_email,
      subject: `Votre demande de réservation – ${accommodation.name}`,
      html: clientHtml,
    }),
  ])
}

// ─── Partner notification emails ───────────────────────────────────────────

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://llui-signature-hebergements.vercel.app'

function emailBase(content: string) {
  return `<!DOCTYPE html>
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
}

export async function sendPartnerNewDemandEmail(
  partner: { name: string; email: string },
  demand: {
    product_type?: string
    product_id?: string
    product_name: string
    guest_first_name: string
    guest_last_name: string
    guest_phone: string
    guest_email: string
    check_in: string
    check_out: string
    guests: number
    message?: string
  }
) {
  const html = emailBase(`
    <h2 style="margin:0 0 4px;font-family:Georgia,serif;font-size:22px;color:#1a1a1a">
      Nouvelle demande de disponibilité
    </h2>
    <p style="margin:0 0 20px;color:#888;font-size:14px">
      Bonjour <strong>${partner.name}</strong>, un client souhaite réserver votre logement.
    </p>
    <div style="background:#f5f0eb;border-radius:10px;padding:16px 20px;margin-bottom:20px">
      <p style="margin:0 0 4px;font-size:13px;color:#888">Client</p>
      <p style="margin:0;font-size:16px;font-weight:600;color:#1a1a1a">${demand.guest_first_name} ${demand.guest_last_name}</p>
      <p style="margin:4px 0 0;font-size:14px;color:#555">${demand.guest_email} · ${demand.guest_phone}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 24px">
      <tr style="border-bottom:1px solid #e8e0d5">
        <td style="padding:10px 0;color:#666;width:40%">Logement</td>
        <td style="padding:10px 0;font-weight:600;color:#1a1a1a">${demand.product_name}</td>
      </tr>
      <tr style="border-bottom:1px solid #e8e0d5">
        <td style="padding:10px 0;color:#666">Arrivée</td>
        <td style="padding:10px 0;color:#1a1a1a">${formatDate(demand.check_in)}</td>
      </tr>
      <tr style="border-bottom:1px solid #e8e0d5">
        <td style="padding:10px 0;color:#666">Départ</td>
        <td style="padding:10px 0;color:#1a1a1a">${formatDate(demand.check_out)}</td>
      </tr>
      <tr style="border-bottom:1px solid #e8e0d5">
        <td style="padding:10px 0;color:#666">Voyageurs</td>
        <td style="padding:10px 0;color:#1a1a1a">${demand.guests} personne${demand.guests > 1 ? 's' : ''}</td>
      </tr>
      ${demand.message ? `<tr>
        <td style="padding:10px 0;color:#666;vertical-align:top">Message</td>
        <td style="padding:10px 0;color:#1a1a1a">${demand.message}</td>
      </tr>` : ''}
    </table>
    <div style="text-align:center">
      <a href="${SITE_URL}/partenaire/dashboard" style="display:inline-block;background:#c9a227;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:14px">
        Voir la demande →
      </a>
    </div>
    <p style="margin:20px 0 0;font-size:12px;color:#aaa;text-align:center">
      Connectez-vous à votre espace partenaire pour prendre en charge cette demande.
    </p>
  `)

  await getResend().emails.send({
    from: FROM,
    to: partner.email,
    subject: `[L&Lui] Nouvelle demande – ${demand.product_name}`,
    html,
  })
}

export async function sendPartnerNewMessageEmail(
  partner: { name: string; email: string },
  message: { text: string; adminName: string }
) {
  const html = emailBase(`
    <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:22px;color:#1a1a1a">
      Nouveau message de L&Lui
    </h2>
    <p style="margin:0 0 24px;color:#555;line-height:1.6">
      Bonjour <strong>${partner.name}</strong>, vous avez reçu un nouveau message de la part de <strong>${message.adminName}</strong>.
    </p>
    <div style="background:#f5f0eb;border-left:4px solid #c9a227;border-radius:6px;padding:16px 20px;margin-bottom:24px">
      <p style="margin:0;font-size:15px;color:#1a1a1a;line-height:1.6;font-style:italic">"${message.text}"</p>
    </div>
    <div style="text-align:center">
      <a href="${SITE_URL}/partenaire/messages" style="display:inline-block;background:#c9a227;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:14px">
        Répondre →
      </a>
    </div>
  `)

  await getResend().emails.send({
    from: FROM,
    to: partner.email,
    subject: `[L&Lui] Message de ${message.adminName}`,
    html,
  })
}

export async function sendPartnerReservationConfirmedEmail(
  partner: { name: string; email: string },
  reservation: {
    reservationId: string
    guestName: string
    accommodationName: string
    checkIn: string
    checkOut: string
    nights: number
    totalPrice: number
  }
) {
  const html = emailBase(`
    <h2 style="margin:0 0 4px;font-family:Georgia,serif;font-size:22px;color:#1a1a1a">
      Réservation confirmée
    </h2>
    <p style="margin:0 0 20px;color:#888;font-size:14px">
      Bonjour <strong>${partner.name}</strong>, une réservation sur votre logement vient d'être confirmée.
    </p>
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:14px 18px;margin-bottom:20px">
      <p style="margin:0;font-size:14px;font-weight:600;color:#166534">✅ Réservation confirmée</p>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 24px">
      <tr style="border-bottom:1px solid #e8e0d5">
        <td style="padding:10px 0;color:#666;width:40%">Client</td>
        <td style="padding:10px 0;font-weight:600;color:#1a1a1a">${reservation.guestName}</td>
      </tr>
      <tr style="border-bottom:1px solid #e8e0d5">
        <td style="padding:10px 0;color:#666">Logement</td>
        <td style="padding:10px 0;color:#1a1a1a">${reservation.accommodationName}</td>
      </tr>
      <tr style="border-bottom:1px solid #e8e0d5">
        <td style="padding:10px 0;color:#666">Arrivée</td>
        <td style="padding:10px 0;color:#1a1a1a">${formatDate(reservation.checkIn)}</td>
      </tr>
      <tr style="border-bottom:1px solid #e8e0d5">
        <td style="padding:10px 0;color:#666">Départ</td>
        <td style="padding:10px 0;color:#1a1a1a">${formatDate(reservation.checkOut)}</td>
      </tr>
      <tr style="border-bottom:1px solid #e8e0d5">
        <td style="padding:10px 0;color:#666">Durée</td>
        <td style="padding:10px 0;color:#1a1a1a">${reservation.nights} nuit${reservation.nights > 1 ? 's' : ''}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#666">Montant</td>
        <td style="padding:10px 0;font-weight:700;color:#c9a227;font-size:16px">${formatPrice(reservation.totalPrice)}</td>
      </tr>
    </table>
    <div style="text-align:center">
      <a href="${SITE_URL}/partenaire/reservations/liste" style="display:inline-block;background:#c9a227;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:14px">
        Voir mes réservations →
      </a>
    </div>
  `)

  await getResend().emails.send({
    from: FROM,
    to: partner.email,
    subject: `[L&Lui] Réservation confirmée – ${reservation.accommodationName}`,
    html,
  })
}

// ─── Pack request email ────────────────────────────────────────────────────

export async function sendPackRequestEmail(data: {
  pack_name: string
  first_name: string
  last_name: string
  email: string
  phone: string
  event_date?: string | null
  guests?: number | null
  message?: string | null
  promo_code?: string | null
}) {
  const { pack_name, first_name, last_name, email, phone, event_date, guests, message, promo_code } = data

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
      ${message ? `<tr style="border-bottom:1px solid #e8e0d5">
        <td style="padding:10px 0;color:#666;vertical-align:top">Message</td>
        <td style="padding:10px 0;color:#1a1a1a">${message}</td>
      </tr>` : ''}
      ${promo_code ? `<tr>
        <td style="padding:10px 0;color:#666">Code promo</td>
        <td style="padding:10px 0;font-weight:700;color:#c9a227;font-family:monospace;letter-spacing:.05em">${promo_code}</td>
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
    getResend().emails.send({
      from: FROM,
      to: ADMIN_EMAIL,
      subject: `[L&Lui] Demande pack – ${pack_name}`,
      html: adminHtml,
    }),
    getResend().emails.send({
      from: FROM,
      to: email,
      subject: `Votre demande de pack – ${pack_name}`,
      html: clientHtml,
    }),
  ])
}

// ─── Pass VIP emails ───────────────────────────────────────────────────────

export async function sendPassVipEmails(params: {
  nom_usage: string
  grade: string
  duree: number
  prix: number
  remise_min: number
  ref_lisible: string
  pass_url: string
  activation_url: string
  created_at?: string
  contact?: string | null
  email?: string | null
  prescripteur_nom?: string | null
}): Promise<void> {
  const { nom_usage, grade, duree, prix, remise_min, ref_lisible, pass_url, activation_url, created_at, contact, email, prescripteur_nom } = params
  const adminEmail = process.env.ADMIN_EMAIL ?? 'olivierfinestone@gmail.com'
  const prixFormatted = new Intl.NumberFormat('fr-FR').format(prix)

  const dateHeure = created_at
    ? new Date(created_at).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : new Date().toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })

  const adminHtml = emailBase(`
    <div style="background:#1a1a1a;border-radius:10px;padding:14px 18px;margin-bottom:20px">
      <p style="margin:0;font-family:monospace;font-size:13px;color:#c9a227;letter-spacing:.03em">
        Commande ${ref_lisible} — ${nom_usage.toUpperCase()} — ${dateHeure}
      </p>
    </div>
    <h2 style="margin:0 0 4px;font-family:Georgia,serif;font-size:22px;color:#1a1a1a">
      Nouvelle commande Pass ${grade}
    </h2>
    <p style="margin:0 0 20px;color:#888;font-size:13px">
      Référence : <span style="font-family:monospace">${ref_lisible}</span>
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
      <tr style="border-bottom:1px solid #e8e0d5">
        <td style="padding:8px 0;color:#666;width:40%">Nom sur la carte</td>
        <td style="padding:8px 0;font-weight:700;color:#1a1a1a">${nom_usage.toUpperCase()}</td>
      </tr>
      <tr style="border-bottom:1px solid #e8e0d5">
        <td style="padding:8px 0;color:#666">Grade</td>
        <td style="padding:8px 0;font-weight:700;color:#c9a227">${grade} — ${duree} jours</td>
      </tr>
      <tr style="border-bottom:1px solid #e8e0d5">
        <td style="padding:8px 0;color:#666">Prix</td>
        <td style="padding:8px 0;font-weight:700;color:#1a1a1a">${prixFormatted} FCFA</td>
      </tr>
      <tr style="border-bottom:1px solid #e8e0d5">
        <td style="padding:8px 0;color:#666">Contact WhatsApp</td>
        <td style="padding:8px 0;color:#1a1a1a">${contact ?? 'Non renseigné'}</td>
      </tr>
      <tr style="border-bottom:1px solid #e8e0d5">
        <td style="padding:8px 0;color:#666">Email client</td>
        <td style="padding:8px 0;color:#1a1a1a">${email ?? 'Non renseigné'}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#666">Affilié</td>
        <td style="padding:8px 0;color:#1a1a1a">${prescripteur_nom ?? 'Aucun'}</td>
      </tr>
    </table>

    <!-- Lien carte client -->
    <div style="background:#fffbf0;border:2px solid #c9a227;border-radius:12px;padding:20px;margin-bottom:16px">
      <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#1a1a1a">
        🔗 Lien carte à envoyer au client :
      </p>
      <p style="font-family:monospace;font-size:12px;color:#7a6010;word-break:break-all;margin:0 0 14px;line-height:1.5">
        ${pass_url}
      </p>
      <a href="${pass_url}"
         style="display:block;background:#1a1a1a;color:#c9a227;text-align:center;
                padding:14px;border-radius:8px;font-weight:700;font-size:14px;
                text-decoration:none">
        Ouvrir la carte ${grade}
      </a>
    </div>

    <!-- Bouton activation -->
    <div style="border-radius:12px;overflow:hidden;margin-bottom:20px">
      <a href="${activation_url}"
         style="display:block;background:#22c55e;color:#fff;text-align:center;
                padding:18px 20px;font-weight:700;font-size:16px;
                text-decoration:none;letter-spacing:.02em">
        ✅ Confirmer le paiement et activer la carte
      </a>
    </div>
    <p style="margin:0 0 20px;font-size:12px;color:#aaa;text-align:center;line-height:1.5">
      Ce bouton active le Pass côté serveur et redirige vers la carte.<br>
      Cliquer une seule fois suffit — l'activation est instantanée.
    </p>

    <div style="background:#f5f0eb;border-radius:12px;padding:16px">
      <p style="margin:0 0 8px;color:#888;font-size:12px">
        📋 Template WhatsApp client (copier-coller) :
      </p>
      <div style="background:#fff;border-radius:8px;padding:14px;font-size:13px;color:#333;line-height:1.7">
        Bonjour,<br><br>
        Votre paiement a bien été reçu. Merci !<br><br>
        Accédez à votre carte ${grade} exclusive ici :<br>
        <strong>${pass_url}</strong><br><br>
        Votre carte est valable ${duree} jours.
        Présentez-la chez nos partenaires pour bénéficier de votre remise garantie.<br><br>
        L&amp;Lui Signature — Kribi<br>
        ✦ Votre bonheur est notre signature.
      </div>
    </div>
  `)

  const clientHtmlContent = emailBase(`
    <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:22px;color:#1a1a1a">
      Merci pour votre commande !
    </h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6">
      Votre Pass VIP ${grade} a bien été enregistré.
    </p>
    <div style="background:#f5f0eb;border-radius:12px;padding:20px;margin-bottom:20px">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr style="border-bottom:1px solid #e8d9b0">
          <td style="padding:8px 0;color:#666;width:45%">Produit</td>
          <td style="padding:8px 0;font-weight:700;color:#1a1a1a">Pass VIP ${grade} — ${duree} jours</td>
        </tr>
        <tr style="border-bottom:1px solid #e8d9b0">
          <td style="padding:8px 0;color:#666">Montant</td>
          <td style="padding:8px 0;font-weight:700;color:#c9a227">${prixFormatted} FCFA</td>
        </tr>
        <tr style="border-bottom:1px solid #e8d9b0">
          <td style="padding:8px 0;color:#666">Remise garantie</td>
          <td style="padding:8px 0;font-weight:700;color:#1a1a1a">${remise_min}% minimum</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#666">Référence</td>
          <td style="padding:8px 0;font-family:monospace;color:#1a1a1a">${ref_lisible}</td>
        </tr>
      </table>
    </div>
    <div style="background:#fffbf0;border:1px solid #c9a227;border-radius:12px;padding:18px;margin-bottom:20px">
      <p style="margin:0 0 8px;font-weight:700;color:#c9a227;font-size:14px">
        ⏳ En attente de confirmation de paiement
      </p>
      <p style="margin:0 0 14px;color:#555;font-size:14px;line-height:1.6">
        Votre carte est prête — elle s'activera dès que votre paiement sera confirmé.
      </p>
      <a href="${pass_url}"
         style="display:block;background:#c9a227;color:#1a1a1a;text-align:center;
                padding:14px;border-radius:8px;font-weight:700;font-size:14px;
                text-decoration:none">
        ✦ Voir ma carte ${grade}
      </a>
      <p style="margin:10px 0 0;font-family:monospace;font-size:11px;color:#999;word-break:break-all;text-align:center">
        ${pass_url}
      </p>
    </div>
    <p style="margin:0;font-size:12px;color:#aaa;text-align:center">
      Des questions ? Répondez directement à ce mail.<br>
      ✦ L&amp;Lui Signature — Kribi, Cameroun
    </p>
  `)

  console.log('[EMAIL PASS] sendPassVipEmails appelée')
  console.log('[EMAIL PASS] RESEND_API_KEY configurée:', !!process.env.RESEND_API_KEY)
  console.log('[EMAIL PASS] FROM:', FROM)
  console.log('[EMAIL PASS] admin →', adminEmail, '| client →', email ?? 'absent')

  // Email admin
  try {
    const adminResult = await getResend().emails.send({
      from: FROM,
      to: adminEmail,
      subject: `🆕 Commande Pass ${grade} — ${nom_usage}`,
      html: adminHtml,
    })
    console.log('[EMAIL PASS] Admin envoyé ✅:', JSON.stringify(adminResult))
  } catch (e) {
    console.error('[EMAIL PASS] Admin erreur ❌:', e)
  }

  // Email client (optionnel)
  if (email) {
    try {
      const clientResult = await getResend().emails.send({
        from: FROM,
        to: email,
        subject: `✦ Votre commande Pass ${grade} — L&Lui Signature`,
        html: clientHtmlContent,
      })
      console.log('[EMAIL PASS] Client envoyé ✅:', JSON.stringify(clientResult))
    } catch (e) {
      console.error('[EMAIL PASS] Client erreur ❌:', e)
    }
  }
}
