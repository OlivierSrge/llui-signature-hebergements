// app/api/rsvp/[marie_uid]/route.ts — #42 RSVP formulaire dynamique
// POST public — stocke dans portail_users/[uid]/rsvp_guests + notif WhatsApp mariés

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import { sendWhatsApp } from '@/lib/whatsappNotif'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

interface RSVPBody {
  prenom: string; nom: string; email?: string; tel?: string
  nb_adultes: string; nb_enfants: string; regimes: string[]
  besoin_hebergement: boolean; message?: string
  presence: 'oui' | 'non' | 'peut_etre'
}

export async function POST(req: NextRequest, { params }: { params: { marie_uid: string } }) {
  try {
    const { marie_uid } = params
    const body = await req.json() as RSVPBody

    if (!body.prenom || !body.nom) {
      return NextResponse.json({ error: 'prénom et nom requis' }, { status: 400 })
    }

    const db = getDb()
    const marieSnap = await db.collection('portail_users').doc(marie_uid).get()
    if (!marieSnap.exists) return NextResponse.json({ error: 'Mariage introuvable' }, { status: 404 })

    const marie = marieSnap.data()!
    const nomsMaries: string = marie.noms_maries ?? 'Les Mariés'
    const phone: string = marie.phone ?? ''

    // Stocker la réponse RSVP
    const rsvpRef = db.collection(`portail_users/${marie_uid}/rsvp_guests`).doc()
    await rsvpRef.set({
      prenom: body.prenom,
      nom: body.nom,
      email: body.email ?? '',
      tel: body.tel ?? '',
      nb_adultes: Number(body.nb_adultes) || 1,
      nb_enfants: Number(body.nb_enfants) || 0,
      regimes: body.regimes ?? ['normal'],
      besoin_hebergement: body.besoin_hebergement ?? false,
      message: body.message ?? '',
      presence: body.presence,
      created_at: FieldValue.serverTimestamp(),
      source: 'rsvp_web',
    })

    // Notification WhatsApp aux mariés (best-effort)
    if (phone) {
      const presenceEmoji = { oui: '✅', non: '❌', peut_etre: '🤔' }[body.presence] ?? ''
      const msg = [
        `📬 Nouvelle réponse RSVP pour votre mariage !`,
        ``,
        `👤 ${body.prenom} ${body.nom}`,
        `${presenceEmoji} Présence : ${body.presence === 'oui' ? 'Oui' : body.presence === 'non' ? 'Non' : 'Peut-être'}`,
        body.presence !== 'non' ? `👥 ${body.nb_adultes} adulte(s), ${body.nb_enfants} enfant(s)` : '',
        body.besoin_hebergement ? `🏠 Besoin d'hébergement` : '',
        body.message ? `💬 "${body.message}"` : '',
        ``,
        `L&Lui Signature 💛`,
      ].filter(Boolean).join('\n')

      sendWhatsApp(phone, msg).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[rsvp] Erreur:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
