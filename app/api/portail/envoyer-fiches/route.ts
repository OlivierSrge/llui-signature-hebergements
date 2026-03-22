// app/api/portail/envoyer-fiches/route.ts
// POST — Envoi groupé des fiches invitation personnalisées via WhatsApp Twilio
// Body : { invites: [{id, tel, prenom}] }
// Auth : cookie portail_uid

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'
import { sendWhatsApp } from '@/lib/whatsappNotif'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

const MAX_ENVOIS = 50
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'

interface InvitePayload {
  id: string
  tel: string
  prenom: string
}

export async function POST(req: NextRequest) {
  try {
    const uid = (await cookies()).get('portail_uid')?.value
    if (!uid) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await req.json() as { invites: InvitePayload[] }
    const { invites } = body

    if (!Array.isArray(invites) || invites.length === 0) {
      return NextResponse.json({ error: 'Aucun invité sélectionné' }, { status: 400 })
    }

    const invitesLimites = invites.slice(0, MAX_ENVOIS)

    const db = getDb()
    const snap = await db.collection('portail_users').doc(uid).get()
    if (!snap.exists) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

    const userData = snap.data()!
    const code: string = userData.code_promo ?? ''
    const nomsMaries: string = userData.noms_maries ?? 'les Mariés'

    let envoyes = 0
    const echecs: string[] = []

    for (const invite of invitesLimites) {
      try {
        const prenomEnc = encodeURIComponent(invite.prenom || '')
        const codeEnc = encodeURIComponent(code)
        const ficheUrl = `${BASE_URL}/fiche/${uid}?prenom=${prenomEnc}&code=${codeEnc}`

        const msg = `Bonjour ${invite.prenom || 'vous'} ! 🎉\n${nomsMaries} vous ont préparé une invitation personnalisée pour leur mariage.\n\nDécouvrez votre fiche d'invitation :\n👉 ${ficheUrl}\n\nVotre code privilège : *${code}*\nChaque achat participe à leur cagnotte 💝`

        const result = await sendWhatsApp(invite.tel, msg)

        if (result.success) {
          await db
            .collection(`portail_users/${uid}/invites_guests`)
            .doc(invite.id)
            .update({
              fiche_envoyee: true,
              fiche_date: FieldValue.serverTimestamp(),
              lien_envoye: true,
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
    console.error('envoyer-fiches error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
