// app/api/cron/newsletter-kribi/route.ts
// Endpoint appelé par Vercel cron chaque lundi à 6h UTC (= 7h Cameroun)
// POST : envoie la newsletter (requiert Bearer CRON_SECRET)
// GET  : prévisualisation du message (requiert Bearer CRON_SECRET)

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import {
  getWeekendRange,
  getActiveSubscribers,
  getWeekendEvents,
  getFeaturedHebergement,
  buildWhatsAppMessage,
  sendNewsletterBatch,
} from '@/lib/newsletter'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max pour l'envoi en masse

function checkAuth(request: NextRequest): boolean {
  const auth = request.headers.get('Authorization')
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return auth === `Bearer ${secret}`
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getDb()
  const { labelSamedi, labelDimanche } = getWeekendRange()

  try {
    const [subscribers, events, hebergement] = await Promise.all([
      getActiveSubscribers(db),
      getWeekendEvents(db),
      getFeaturedHebergement(db),
    ])

    const message = buildWhatsAppMessage(events, hebergement, labelSamedi, labelDimanche)

    return NextResponse.json({
      preview: true,
      nb_abonnes: subscribers.length,
      nb_evenements: events.length,
      evenements: events.map((e) => e.titre),
      hebergement: hebergement?.nom ?? null,
      labelSamedi,
      labelDimanche,
      message_preview: message,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getDb()
  const { labelSamedi, labelDimanche } = getWeekendRange()
  const startTime = Date.now()

  try {
    const [subscribers, events, hebergement] = await Promise.all([
      getActiveSubscribers(db),
      getWeekendEvents(db),
      getFeaturedHebergement(db),
    ])

    const message = buildWhatsAppMessage(events, hebergement, labelSamedi, labelDimanche)

    let sent = 0
    let errors = 0
    let logs: string[] = []
    let isDryRun = false

    // Si pas de Twilio configuré ou collection vide → dry run
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN

    if (!accountSid || !authToken) {
      isDryRun = true
      logs.push('DRY RUN — Variables TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN manquantes')
      sent = 0
      errors = 0
    } else if (subscribers.length === 0) {
      isDryRun = true
      logs.push('DRY RUN — Aucun abonné actif')
    } else {
      const Twilio = (await import('twilio')).default as any
      const client = new Twilio(accountSid, authToken)
      const result = await sendNewsletterBatch(subscribers, message, client)
      sent = result.sent
      errors = result.errors
      logs = result.logs
    }

    // Sauvegarder les stats dans Firestore
    await db.collection('stats_newsletter').add({
      date_envoi: new Date().toISOString(),
      nb_abonnes: subscribers.length,
      nb_envoyes: sent,
      nb_erreurs: errors,
      evenements: events.map((e) => e.titre),
      hebergement: hebergement?.nom ?? null,
      dry_run: isDryRun,
      duree_ms: Date.now() - startTime,
    })

    return NextResponse.json({
      success: true,
      dry_run: isDryRun,
      envoyes: sent,
      erreurs: errors,
      nb_abonnes: subscribers.length,
      evenements: events.map((e) => e.titre),
      message: isDryRun
        ? `DRY RUN — Message préparé pour ${subscribers.length} abonnés`
        : `Newsletter envoyée à ${sent} abonnés (${errors} erreurs)`,
      message_preview: message,
      logs: logs.slice(0, 20),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 })
  }
}
