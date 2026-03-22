// app/api/portail/envoyer-invitations/route.ts
// POST — Envoi groupé WhatsApp aux invités du marié
// Body : { invites: [{id, tel, prenom}], message }
// Auth : cookie portail_uid

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'
import { sendWhatsApp } from '@/lib/whatsappNotif'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

const MAX_ENVOIS = 50

interface InvitePayload {
  id: string
  tel: string
  prenom: string
}

export async function POST(req: NextRequest) {
  try {
    const uid = cookies().get('portail_uid')?.value
    if (!uid) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await req.json() as { invites: InvitePayload[]; message: string }
    const { invites, message } = body

    if (!Array.isArray(invites) || invites.length === 0) {
      return NextResponse.json({ error: 'Aucun invité sélectionné' }, { status: 400 })
    }
    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message vide' }, { status: 400 })
    }

    // Limiter à MAX_ENVOIS
    const invitesLimites = invites.slice(0, MAX_ENVOIS)

    const db = getDb()

    // Récupérer code_promo et noms_maries du marié
    const snap = await db.collection('portail_users').doc(uid).get()
    if (!snap.exists) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

    const userData = snap.data()!
    const code: string = userData.code_promo ?? ''
    const nomsMaries: string = userData.noms_maries ?? ''

    let envoyes = 0
    const echecs: string[] = []

    for (const invite of invitesLimites) {
      try {
        // Personnaliser le message
        const msgPersonnalise = message
          .replace(/\[Prénom\]/g, invite.prenom || 'vous')
          .replace(/\[Noms mariés\]/g, nomsMaries)
          .replace(/\[CODE\]/g, code)

        const result = await sendWhatsApp(invite.tel, msgPersonnalise)

        if (result.success) {
          // Marquer invitation_envoyee = true dans invites_guests
          await db
            .collection(`portail_users/${uid}/invites_guests`)
            .doc(invite.id)
            .update({
              invitation_envoyee: true,
              lien_envoye: true,
              date_envoi: FieldValue.serverTimestamp(),
            })
          envoyes++
        } else {
          echecs.push(invite.id)
        }
      } catch {
        echecs.push(invite.id)
      }
    }

    return NextResponse.json({ envoyes, echecs, total: invitesLimites.length })
  } catch (e) {
    console.error('envoyer-invitations error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
