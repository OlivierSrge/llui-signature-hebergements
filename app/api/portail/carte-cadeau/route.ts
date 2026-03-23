// app/api/portail/carte-cadeau/route.ts — #46 Carte cadeau numérique WhatsApp J+3
// POST — auth cookie portail_uid — envoie à tous les invités confirmés
// Body optionnel : { invites?: string[] } pour cibler des invités spécifiques

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'
import { sendWhatsApp } from '@/lib/whatsappNotif'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'

export async function POST(req: NextRequest) {
  try {
    const uid = (await cookies()).get('portail_uid')?.value
    if (!uid) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await req.json().catch(() => ({})) as { invites?: string[] }
    const db = getDb()

    const marieSnap = await db.collection('portail_users').doc(uid).get()
    if (!marieSnap.exists) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

    const marie = marieSnap.data()!
    const nomsMaries: string = marie.noms_maries ?? 'Les Mariés'
    const code: string = marie.code_promo ?? ''

    // Charger invités confirmés (ou sélection)
    let invitesQuery = db.collection(`portail_users/${uid}/invites_guests`)
      .where('statut', '==', 'confirme') as FirebaseFirestore.Query
    const invitesSnap = await invitesQuery.get()

    const boutiqueUrl = `${BASE_URL}/boutique?code=${encodeURIComponent(code)}`
    let envoyes = 0; const echecs: string[] = []

    for (const doc of invitesSnap.docs) {
      if (body.invites && !body.invites.includes(doc.id)) continue

      const inv = doc.data()
      if (!inv.tel) continue

      const prenom = inv.prenom || 'cher invité'
      const msg = [
        `Bonjour ${prenom} ! 🎁`,
        ``,
        `*${nomsMaries}* vous remercient chaleureusement d'avoir partagé ce moment magique avec eux ! 🥂`,
        ``,
        `Pour prolonger la magie de ce beau jour, ils vous offrent un cadeau exclusif :`,
        code ? `\n🎀 Utilisez le code *${code}* sur la boutique L&Lui Signature\net bénéficiez d'offres privilégiées :` : '',
        `👉 ${boutiqueUrl}`,
        ``,
        `💛 Merci d'être dans leur vie !`,
        `L&Lui Signature`,
      ].filter(s => s !== undefined).join('\n')

      const result = await sendWhatsApp(inv.tel, msg)
      if (result.success) {
        await db.collection(`portail_users/${uid}/invites_guests`).doc(doc.id).update({
          carte_cadeau_envoyee: true,
          carte_cadeau_date: FieldValue.serverTimestamp(),
        })
        envoyes++
      } else {
        console.error(`[carte-cadeau] Échec ${doc.id}: ${result.error}`)
        echecs.push(doc.id)
      }
    }

    return NextResponse.json({ success: true, envoyes, echecs, total: invitesSnap.size })
  } catch (e) {
    console.error('[carte-cadeau]:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
