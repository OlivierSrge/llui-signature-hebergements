// app/api/portail/relancer-invite/route.ts
// POST — Relance WhatsApp individuelle pour un invité silencieux
// Body : { invite_id, tel, prenom }
// Auth : cookie portail_uid

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'
import { sendWhatsApp } from '@/lib/whatsappNotif'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const uid = cookies().get('portail_uid')?.value
    if (!uid) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { invite_id, tel, prenom } = await req.json() as {
      invite_id: string
      tel: string
      prenom: string
    }

    if (!invite_id || !tel) {
      return NextResponse.json({ error: 'invite_id et tel requis' }, { status: 400 })
    }

    const db = getDb()

    // Récupérer le code_promo du marié
    const snap = await db.collection('portail_users').doc(uid).get()
    if (!snap.exists) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

    const userData = snap.data()!
    const code: string = userData.code_promo ?? ''
    const lien = `https://l-et-lui-signature.com?code=${encodeURIComponent(code)}`

    const message = `Bonjour ${prenom || 'cher(e) invité(e)'} ! 😊
Notre mariage approche et nous pensons à vous.
N'oubliez pas d'utiliser notre code *${code}* sur la boutique L&Lui Signature 🎁
👉 ${lien}
Merci de votre soutien !`

    const result = await sendWhatsApp(tel, message)

    if (result.success) {
      // Marquer relance_envoyee = true dans invites_guests
      await db
        .collection(`portail_users/${uid}/invites_guests`)
        .doc(invite_id)
        .update({
          relance_envoyee: true,
          relance_date: FieldValue.serverTimestamp(),
          lien_envoye: true,
        })
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: result.error ?? 'Échec envoi' }, { status: 500 })
    }
  } catch (e) {
    console.error('relancer-invite error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
