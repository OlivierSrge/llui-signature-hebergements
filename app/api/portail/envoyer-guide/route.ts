// app/api/portail/envoyer-guide/route.ts — #94 Envoi guide Kribi via WhatsApp à tous les invités confirmés
// POST — auth cookie portail_uid

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'
import { sendWhatsApp } from '@/lib/whatsappNotif'

export const dynamic = 'force-dynamic'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'

export async function POST() {
  try {
    const uid = (await cookies()).get('portail_uid')?.value
    if (!uid) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const db = getDb()
    const [marieSnap, invitesSnap] = await Promise.all([
      db.collection('portail_users').doc(uid).get(),
      db.collection(`portail_users/${uid}/invites_guests`)
        .where('statut', '==', 'confirme')
        .get(),
    ])

    if (!marieSnap.exists) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

    const marie = marieSnap.data()!
    const nomsMaries: string = marie.noms_maries ?? 'les Mariés'
    const dateRaw = marie.date_mariage ?? marie.projet?.date_evenement
    const dateStr = dateRaw?.toDate
      ? dateRaw.toDate().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      : typeof dateRaw === 'string' ? new Date(dateRaw).toLocaleDateString('fr-FR') : ''

    const guideUrl = `${BASE_URL}/guide-kribi`

    let envoyes = 0
    const echecs: string[] = []

    for (const doc of invitesSnap.docs) {
      const inv = doc.data()
      if (!inv.tel) continue

      const prenom = inv.prenom || 'cher invité'
      const msg = [
        `Bonjour ${prenom} ! 🌴`,
        ``,
        `À l'occasion du mariage de *${nomsMaries}*${dateStr ? ` le ${dateStr}` : ''} à Kribi,`,
        `voici votre guide pratique pour bien préparer votre séjour :`,
        ``,
        `📖 ${guideUrl}`,
        ``,
        `Hébergements, restaurants, activités, conseils pratiques…`,
        `Tout ce qu'il faut savoir pour profiter de Kribi 🌊`,
        ``,
        `L&Lui Signature 💛`,
      ].join('\n')

      const result = await sendWhatsApp(inv.tel, msg)
      if (result.success) envoyes++
      else { console.error(`[envoyer-guide] Échec ${doc.id}: ${result.error}`); echecs.push(doc.id) }
    }

    return NextResponse.json({ success: true, envoyes, echecs, total: invitesSnap.size })
  } catch (e) {
    console.error('[envoyer-guide]:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
