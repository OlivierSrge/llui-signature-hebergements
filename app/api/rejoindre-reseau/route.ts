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
    console.error('[rejoindre whatsapp]', e.message)
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb()
    const body = await request.json()
    const {
      nom, categorie, description, localisation,
      telephone, whatsapp, services_proposes,
      experience, portfolio_urls, message,
    } = body

    if (!nom || !categorie || !telephone) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    const ref = db.collection('demandes_prestataires').doc()
    await ref.set({
      nom, categorie, description: description ?? '',
      localisation: localisation ?? 'Kribi',
      telephone, whatsapp: whatsapp ?? telephone,
      services_proposes: services_proposes ?? '',
      experience: experience ?? '',
      portfolio_urls: portfolio_urls ?? [],
      message: message ?? '',
      statut: 'en_attente',
      created_at: new Date(),
    })

    // WhatsApp à Olivier
    const adminPhone = process.env.ADMIN_PHONE_NUMBER
    if (adminPhone) {
      await sendWhatsApp(adminPhone,
        `🆕 *Nouvelle candidature prestataire*\n\n` +
        `🏢 ${nom}\n` +
        `📂 Catégorie : ${categorie}\n` +
        `📞 ${telephone}\n\n` +
        `_À valider dans l'admin /admin/prestataires-services_`
      )
    }

    return NextResponse.json({ success: true, id: ref.id })
  } catch (err: any) {
    console.error('[rejoindre-reseau]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
