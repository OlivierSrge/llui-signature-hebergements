// lib/newsletter.ts
// Utilitaires partagés pour la newsletter WhatsApp Kribi

import { Firestore } from 'firebase-admin/firestore'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Abonne {
  id: string
  telephone: string
  source: string
  actif: boolean
  created_at: string
}

export interface EvenementNewsletter {
  id: string
  titre: string
  categorie: string
  date_debut: string
  heure?: string
  lieu?: string
  prix?: number | null
  recurrent?: boolean
}

export interface HebergementNewsletter {
  id: string
  nom: string
  prix_nuit: number
  slug: string
}

// ─── Weekend range ─────────────────────────────────────────────────────────────

export function getWeekendRange(): {
  start: Date; end: Date; labelSamedi: string; labelDimanche: string
} {
  const now = new Date()
  const day = now.getDay()
  const saturday = new Date(now)
  if (day === 6) { /* today */ }
  else if (day === 0) { saturday.setDate(now.getDate() + 6) } // next saturday
  else { saturday.setDate(now.getDate() + (6 - day)) }
  saturday.setHours(0, 0, 0, 0)

  const sunday = new Date(saturday)
  sunday.setDate(saturday.getDate() + 1)
  sunday.setHours(23, 59, 59, 999)

  const fmt = (d: Date) =>
    d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return { start: saturday, end: sunday, labelSamedi: fmt(saturday), labelDimanche: fmt(sunday) }
}

// ─── Phone formatting ─────────────────────────────────────────────────────────

export function formatPhoneForWhatsApp(tel: string): string | null {
  const cleaned = tel.trim().replace(/[\s\-().]/g, '')
  if (!cleaned) return null
  if (cleaned.startsWith('whatsapp:+')) return cleaned
  if (cleaned.startsWith('whatsapp:')) return cleaned.replace('whatsapp:', 'whatsapp:+')
  if (cleaned.startsWith('+')) return `whatsapp:${cleaned}`
  if (cleaned.startsWith('00')) return `whatsapp:+${cleaned.slice(2)}`
  if (cleaned.startsWith('237') && cleaned.length >= 11) return `whatsapp:+${cleaned}`
  // Cameroon local numbers (6xxxxxxxx or 2xxxxxxxx)
  if ((cleaned.startsWith('6') || cleaned.startsWith('2')) && cleaned.length === 9) {
    return `whatsapp:+237${cleaned}`
  }
  return null
}

export function maskPhone(tel: string): string {
  const t = tel.replace(/\s/g, '')
  if (t.length <= 5) return t
  const first = t.slice(0, 6)
  const last = t.slice(-1)
  const middle = 'X'.repeat(Math.max(0, t.length - 7))
  return `${first}${middle}${last}`
}

// ─── Firestore helpers ────────────────────────────────────────────────────────

export async function getActiveSubscribers(db: Firestore): Promise<Abonne[]> {
  const snap = await db.collection('abonnes_newsletter').where('actif', '==', true).get()
  return snap.docs.map((d) => ({
    id: d.id,
    telephone: d.data().telephone ?? '',
    source: d.data().source ?? '',
    actif: true,
    created_at: d.data().created_at ?? '',
  }))
}

export async function getWeekendEvents(db: Firestore): Promise<EvenementNewsletter[]> {
  const { start, end } = getWeekendRange()
  const snap = await db.collection('evenements_kribi').where('actif', '==', true).get()
  const all = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((ev: any) => {
      if (ev.recurrent && ['samedi', 'dimanche', 'weekend'].includes(ev.jour_recurrence ?? '')) {
        return true
      }
      const date: Date = ev.date_debut?.toDate ? ev.date_debut.toDate() : new Date(ev.date_debut)
      return date >= start && date <= end
    })
    .map((ev: any) => ({
      id: ev.id,
      titre: ev.titre ?? '',
      categorie: ev.categorie ?? '',
      date_debut: ev.date_debut?.toDate ? ev.date_debut.toDate().toISOString() : ev.date_debut ?? '',
      heure: ev.heure ?? '',
      lieu: ev.lieu ?? '',
      prix: ev.prix ?? null,
      recurrent: ev.recurrent ?? false,
    }))
    .sort((a: any, b: any) => new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime())

  // Diversité de catégories : trier pour avoir des catégories variées
  const seen = new Set<string>()
  const varied: any[] = []
  const rest: any[] = []
  all.forEach((ev: any) => {
    if (!seen.has(ev.categorie)) { seen.add(ev.categorie); varied.push(ev) }
    else rest.push(ev)
  })
  return [...varied, ...rest].slice(0, 3)
}

export async function getFeaturedHebergement(db: Firestore): Promise<HebergementNewsletter | null> {
  try {
    const snap = await db.collection('hebergements').where('status', '==', 'active').get()
    const docs = snap.docs
      .map((d) => {
        const data = d.data()
        return {
          id: d.id,
          nom: data.name ?? '',
          prix_nuit: data.price_per_night ?? 0,
          slug: data.slug ?? d.id,
          featured: data.featured ?? false,
          rating: data.ratings?.overall ?? 0,
        }
      })
      .sort((a, b) => {
        if (a.featured && !b.featured) return -1
        if (!a.featured && b.featured) return 1
        return b.rating - a.rating
      })
    return docs[0] ?? null
  } catch {
    return null
  }
}

// ─── Message builder ──────────────────────────────────────────────────────────

const CAT_EMOJI: Record<string, string> = {
  nature: '🌿', gastronomie: '🍽️', culture: '🎭',
  sport: '🏄', wellness: '🧘', nightlife: '🎵',
}

function fmtPrix(prix: number | null | undefined): string {
  if (prix === 0) return 'Gratuit'
  if (prix) return new Intl.NumberFormat('fr-FR').format(prix) + ' FCFA'
  return ''
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })
  } catch { return '' }
}

export function buildWhatsAppMessage(
  events: EvenementNewsletter[],
  hebergement: HebergementNewsletter | null,
  labelSamedi: string,
  labelDimanche: string
): string {
  const lines: string[] = []
  const samCap = labelSamedi.charAt(0).toUpperCase() + labelSamedi.slice(1)
  const dimCap = labelDimanche.charAt(0).toUpperCase() + labelDimanche.slice(1)

  lines.push('🌊 *Bons plans Kribi ce weekend*')
  lines.push(`${samCap} & ${dimCap}`)
  lines.push('')

  if (events.length === 0) {
    lines.push('Aucune activité programmée cette semaine.')
    lines.push('Revenez vendredi pour les mises à jour !')
  } else {
    events.forEach((ev) => {
      const emoji = CAT_EMOJI[ev.categorie] ?? '🗓'
      lines.push(`${emoji} *${ev.titre}*`)
      const datePart = ev.date_debut ? fmtDate(ev.date_debut) : ''
      const timePart = ev.heure || ''
      const lieuPart = ev.lieu || ''
      const infoParts = [datePart, timePart, lieuPart].filter(Boolean)
      if (infoParts.length) lines.push(`📅 ${infoParts.join(' · ')}`)
      const prix = fmtPrix(ev.prix)
      if (prix) lines.push(`💰 ${prix}`)
      lines.push('')
    })
  }

  if (hebergement) {
    lines.push('🏠 *Où séjourner ?*')
    lines.push(
      `${hebergement.nom} — à partir de ${new Intl.NumberFormat('fr-FR').format(hebergement.prix_nuit)} FCFA/nuit`
    )
    lines.push('')
  }

  lines.push('📱 Voir tout le calendrier :')
  lines.push('llui-signature-hebergements.vercel.app/kribi')
  lines.push('')
  lines.push('_Pour vous désabonner répondez STOP_')
  lines.push('_L&Lui Signature · Kribi, Cameroun_')

  return lines.join('\n')
}

// ─── Batch sender ─────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function sendNewsletterBatch(
  subscribers: Abonne[],
  message: string,
  twilioClient: any,
  fromNumber: string = 'whatsapp:+14155238886'
): Promise<{ sent: number; errors: number; logs: string[] }> {
  let sent = 0
  let errors = 0
  const logs: string[] = []
  const BATCH_SIZE = 50

  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.map(async (sub) => {
        const to = formatPhoneForWhatsApp(sub.telephone)
        if (!to) {
          errors++
          logs.push(`SKIP ${sub.telephone} — format invalide`)
          return
        }
        try {
          await twilioClient.messages.create({ from: fromNumber, to, body: message })
          sent++
          logs.push(`OK ${maskPhone(sub.telephone)}`)
        } catch (e: any) {
          errors++
          logs.push(`ERR ${maskPhone(sub.telephone)} — ${e.message ?? 'erreur Twilio'}`)
        }
      })
    )
    if (i + BATCH_SIZE < subscribers.length) {
      await sleep(1200) // Respecter rate limit Twilio (~50/min)
    }
  }

  return { sent, errors, logs }
}
