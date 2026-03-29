import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

async function sendWhatsApp(to: string, body: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM ?? 'whatsapp:+14155238886'
  if (!accountSid || !authToken) return
  try {
    const Twilio = (await import('twilio')).default as any
    const client = new Twilio(accountSid, authToken)
    const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:+${to.replace(/\D/g, '')}`
    await client.messages.create({ from, to: toFormatted, body })
  } catch (e: any) {
    console.error('[booking whatsapp]', e.message)
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb()
    const body = await request.json()
    const {
      prestataire_id, prestataire_nom, prestataire_whatsapp,
      service_id, service_titre, service_prix,
      client_prenom, client_telephone,
      date_prestation, notes, source, marie_uid,
      commission_taux,
    } = body

    if (!prestataire_id || !client_prenom || !client_telephone || !service_id) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    const commission_llui = Math.round((service_prix ?? 0) * (commission_taux ?? 10) / 100)
    const montant_prestataire = (service_prix ?? 0) - commission_llui

    const ref = db.collection('bookings_prestataires').doc()
    await ref.set({
      prestataire_id,
      prestataire_nom,
      service_id,
      service_titre,
      client_prenom,
      client_telephone,
      date_prestation: date_prestation ? new Date(date_prestation) : null,
      montant_total: service_prix ?? 0,
      commission_llui,
      montant_prestataire,
      statut: 'en_attente',
      notes: notes ?? '',
      marie_uid: marie_uid ?? null,
      source: source ?? 'site',
      created_at: new Date(),
    })

    // Incrémenter nb_bookings
    await db.collection('prestataires').doc(prestataire_id).update({
      nb_bookings: require('firebase-admin/firestore').FieldValue.increment(1),
    }).catch(() => {})

    // WhatsApp au prestataire
    if (prestataire_whatsapp) {
      const dateStr = date_prestation
        ? new Date(date_prestation).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : 'À définir'
      await sendWhatsApp(prestataire_whatsapp,
        `🔔 *Nouvelle demande de réservation*\n\n` +
        `📋 Service : ${service_titre}\n` +
        `📅 Date souhaitée : ${dateStr}\n` +
        `👤 Client : ${client_prenom} · ${client_telephone}\n` +
        `💬 Note : ${notes || 'Aucune'}\n\n` +
        `_Via L&Lui Signature — Répondez rapidement au client_`
      )
    }

    // WhatsApp à Olivier
    const adminPhone = process.env.ADMIN_PHONE_NUMBER
    if (adminPhone) {
      await sendWhatsApp(adminPhone,
        `💼 *Booking prestataire*\n\n` +
        `🏢 ${prestataire_nom}\n` +
        `📋 ${service_titre}\n` +
        `👤 ${client_prenom} · ${client_telephone}\n` +
        `💰 Commission L&Lui : ${commission_llui.toLocaleString('fr-FR')} FCFA`
      )
    }

    return NextResponse.json({ success: true, id: ref.id })
  } catch (err: any) {
    console.error('[booking prestataire]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
