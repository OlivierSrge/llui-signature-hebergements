// lib/whatsappNotif.ts — Green API WhatsApp : lib + messages prédéfinis

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

/**
 * Envoie un message WhatsApp via Green API.
 * NE BLOQUE JAMAIS l'application en cas d'échec.
 * phone : format international avec ou sans + (ex: +237693407964 ou 237693407964)
 */
export async function sendWhatsApp(
  telephone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const INSTANCE_ID = process.env.GREEN_API_INSTANCE_ID
  const API_TOKEN = process.env.GREEN_API_TOKEN
  if (!INSTANCE_ID || !API_TOKEN) {
    return { success: false, error: 'GREEN_API_INSTANCE_ID ou GREEN_API_TOKEN non défini' }
  }
  if (!telephone || !message) return { success: false, error: 'Téléphone ou message vide' }

  // Nettoyer le numéro : supprimer +, espaces, tirets
  const clean = telephone.replace(/[\s\-+]/g, '').replace(/^\+/, '')
  const chatId = `${clean}@c.us`
  const BASE_URL = `https://api.green-api.com/waInstance${INSTANCE_ID}`

  try {
    const ctrl = new AbortController()
    const tid = setTimeout(() => ctrl.abort(), 8000)
    const res = await fetch(`${BASE_URL}/sendMessage/${API_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, message }),
      signal: ctrl.signal,
    }).finally(() => clearTimeout(tid))
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` }
    return { success: true }
  } catch (e) {
    // Silencieux — ne jamais bloquer l'app
    return { success: false, error: String(e) }
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
