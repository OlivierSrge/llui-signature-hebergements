// app/api/newsletter/admin/route.ts
// API admin pour la gestion newsletter — protégée par session admin
// GET  : statistiques + liste abonnés récents
// POST : déclenche l'envoi (appelle la logique newsletter)

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import {
  getWeekendRange,
  getActiveSubscribers,
  getWeekendEvents,
  getFeaturedHebergement,
  buildWhatsAppMessage,
  sendNewsletterBatch,
  maskPhone,
} from '@/lib/newsletter'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function checkAdminAuth(request: NextRequest): boolean {
  const session = request.cookies.get('admin_session')?.value
  return !!(session && session === process.env.ADMIN_SESSION_TOKEN)
}

export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getDb()

  try {
    // Stats abonnés
    const snap = await db.collection('abonnes_newsletter').orderBy('created_at', 'desc').get()
    const tous = snap.docs.map((d) => ({
      id: d.id,
      telephone_masque: maskPhone(d.data().telephone ?? ''),
      telephone: d.data().telephone ?? '',
      source: d.data().source ?? '',
      actif: d.data().actif ?? true,
      created_at: d.data().created_at ?? '',
    }))
    const nb_actifs = tous.filter((a) => a.actif).length

    // Dernier envoi
    const statsSnap = await db
      .collection('stats_newsletter')
      .orderBy('date_envoi', 'desc')
      .limit(1)
      .get()
    const dernier_envoi = statsSnap.empty ? null : statsSnap.docs[0].data()

    // Prévisualisation du prochain message
    const { labelSamedi, labelDimanche } = getWeekendRange()
    const [events, hebergement] = await Promise.all([
      getWeekendEvents(db),
      getFeaturedHebergement(db),
    ])
    const preview = buildWhatsAppMessage(events, hebergement, labelSamedi, labelDimanche)

    return NextResponse.json({
      nb_abonnes_total: tous.length,
      nb_abonnes_actifs: nb_actifs,
      abonnes_recents: tous.slice(0, 10),
      abonnes_tous: tous, // pour l'export CSV
      dernier_envoi,
      preview,
      labelSamedi,
      labelDimanche,
      nb_evenements: events.length,
      evenements: events.map((e) => e.titre),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) {
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

    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN

    if (!accountSid || !authToken) {
      isDryRun = true
      logs.push('DRY RUN — Variables TWILIO non configurées')
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

    // Sauvegarder dans stats_newsletter
    await db.collection('stats_newsletter').add({
      date_envoi: new Date().toISOString(),
      nb_abonnes: subscribers.length,
      nb_envoyes: sent,
      nb_erreurs: errors,
      evenements: events.map((e) => e.titre),
      hebergement: hebergement?.nom ?? null,
      dry_run: isDryRun,
      duree_ms: Date.now() - startTime,
      source: 'admin_manuel',
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
      logs,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 })
  }
}
