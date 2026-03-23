// lib/whatsappNotif.ts — Twilio WhatsApp : lib + messages prédéfinis

import twilio from 'twilio'

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

export async function sendWhatsApp(
  telephone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM
  if (!accountSid || !authToken || !fromNumber) {
    console.warn('Twilio non configuré - skip WhatsApp')
    return { success: false, error: 'Config manquante' }
  }
  try {
    // Normalisation E.164 : +237XXXXXXXXX
    let tel = telephone.replace(/[\s\-().]/g, '')
    if (tel.startsWith('00')) tel = '+' + tel.slice(2)             // 00237... → +237...
    if (/^237\d{8,9}$/.test(tel)) tel = '+' + tel                 // 237XXXXXXXX → +237XXXXXXXX
    if (!tel.startsWith('+')) tel = '+237' + tel                   // 6XXXXXXXX → +2376XXXXXXXX

    // Garantir le préfixe whatsapp: des deux côtés
    const fromWa = fromNumber.startsWith('whatsapp:') ? fromNumber : 'whatsapp:' + fromNumber
    const toWa   = 'whatsapp:' + tel

    console.log(`[sendWhatsApp] from=${fromWa} to=${toWa}`)

    const client = twilio(accountSid, authToken)
    const msg = await client.messages.create({ from: fromWa, to: toWa, body: message })

    console.log(`[sendWhatsApp] OK sid=${msg.sid} status=${msg.status}`)
    return { success: true }
  } catch (error: unknown) {
    // Twilio errors expose .code et .moreInfo en plus de .message
    const e = error as Record<string, unknown>
    const detail = [
      `message=${e.message ?? String(error)}`,
      e.code    ? `code=${e.code}`         : null,
      e.status  ? `httpStatus=${e.status}` : null,
      e.moreInfo ? `info=${e.moreInfo}`    : null,
    ].filter(Boolean).join(' | ')
    console.error(`[sendWhatsApp] Twilio erreur: ${detail}`)
    return { success: false, error: detail }
  }
}

/** Compat : ancienne signature CallMeBot — redirige vers sendWhatsApp (apikey ignoré) */
export async function sendCallMeBot(phone: string, message: string, _apikey?: string): Promise<void> {
  await sendWhatsApp(phone, message)
}

// ── Messages prédéfinis ────────────────────────────────────────

export function msgBienvenue(nom: string): string {
  return `🌟 Bienvenue ${nom} !\n\nVous rejoignez L&Lui Signature, le programme partenaires premium.\n\nAccédez à votre espace : ${process.env.NEXT_PUBLIC_APP_URL ?? ''}/portail\n\nBienvenue dans la famille L&Lui 💛`
}

export function msgNouveauGrade(nom: string, grade: string): string {
  return `🏆 Félicitations ${nom} !\n\nVous venez d'atteindre le grade *${grade}*.\n\nContinuez à accumuler des REV pour progresser encore !\n\nL&Lui Signature 💛`
}

export function msgCommissionRecue(nom: string, montant: number, type: string): string {
  return `💰 Bonne nouvelle ${nom} !\n\nVous avez reçu une commission de *${formatFCFA(montant)}*\nType : ${type}\n\nConsultez vos gains : ${process.env.NEXT_PUBLIC_APP_URL ?? ''}/portail/avantages\n\nL&Lui Signature 💛`
}

export function msgFastStartDebloque(nom: string, palier: number, montant: number): string {
  return `🎯 ${nom}, vous avez débloqué le palier Fast Start J${palier} !\n\nPrime disponible : *${formatFCFA(montant)}*\n\nRéclamez-la maintenant : ${process.env.NEXT_PUBLIC_APP_URL ?? ''}/portail/avantages\n\nL&Lui Signature 💛`
}

export function msgRappelTodo(nom: string, revGagnes: number): string {
  return `✅ Bravo ${nom} !\n\nVous venez de gagner *${revGagnes} REV* supplémentaires en complétant vos tâches mariage.\n\nConsultez votre tableau de bord : ${process.env.NEXT_PUBLIC_APP_URL ?? ''}/portail\n\nL&Lui Signature 💛`
}

export function msgRelanceInvite(nomMaries: string, nomInvite: string, magicLink: string): string {
  return `💌 Rappel pour ${nomInvite} !\n\nVotre lien privilégié pour le mariage de *${nomMaries}* :\n${magicLink}\n\nDes hébergements et offres exclusives vous attendent 🏠\n\nL&Lui Signature 💛`
}

export interface ResumeSemaine {
  dateDebut: string; dateFin: string
  caSemaine: number; txBoutique: number; txMariage: number
  nouveauxInscrits: number; upgradesGrades: number
  commissionsVersees: number; primesFspayees: number; primesFsenAttente: number
  retraitsTraites: number; retraitsEnAttente: number
  topTransaction: { nom: string; montant: number }
}

export function msgResumeSemaine(data: ResumeSemaine): string {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? ''
  return `📊 *Résumé L&Lui Signature*\n` +
    `Semaine du ${data.dateDebut} au ${data.dateFin}\n\n` +
    `💰 CA semaine : *${formatFCFA(data.caSemaine)}*\n` +
    `📈 Transactions : ${data.txBoutique} (boutique) + ${data.txMariage} (mariages)\n` +
    `👥 Nouveaux inscrits : ${data.nouveauxInscrits}\n` +
    `⭐ Upgrades grades : ${data.upgradesGrades} personne(s)\n` +
    `💸 Commissions versées : ${formatFCFA(data.commissionsVersees)}\n` +
    `🎯 Primes Fast Start : ${data.primesFspayees} payée(s) / ${data.primesFsenAttente} en attente\n` +
    `📤 Retraits : ${data.retraitsTraites} traité(s) / ${data.retraitsEnAttente} en attente\n` +
    (data.topTransaction.montant > 0 ? `🏆 Top transaction : ${data.topTransaction.nom} — ${formatFCFA(data.topTransaction.montant)}\n` : '') +
    `\nVoir le dashboard : ${url}/admin/dashboard`
}

/** #46 Carte cadeau post-mariage J+3 */
export function msgCarteCadeau(prenom: string, nomsMaries: string, code: string, boutiqueUrl: string): string {
  return `Bonjour ${prenom} ! 🎁\n\n*${nomsMaries}* vous remercient d'avoir partagé ce moment magique avec eux ! 🥂\n\nPour prolonger la magie de ce beau jour, profitez de votre code exclusif :\n🎀 Code : *${code}*\n👉 ${boutiqueUrl}\n\n💛 Merci d'être dans leur vie !\nL&Lui Signature`
}
