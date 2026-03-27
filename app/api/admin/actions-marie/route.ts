// app/api/admin/actions-marie/route.ts
// Actions admin sur un dossier marié : faire-part, guide, relance, carte cadeau
// Utilise admin_session (pas portail_uid)
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'
import { sendWhatsApp } from '@/lib/whatsappNotif'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'

function isAdmin(): boolean {
  const session = cookies().get('admin_session')?.value
  if (!session) return false
  const token = process.env.ADMIN_SESSION_TOKEN
  return !token || session === token
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'

async function logAction(db: any, marie_uid: string, action: string, description: string, type = 'whatsapp') {
  await db.collection('admin_logs').add({
    marie_uid, action, description, type,
    created_at: Timestamp.now(),
    source: 'admin',
  }).catch(() => {})
}

// POST /api/admin/actions-marie
// body: { action, marie_uid, invites?, message? }
// action: faire-part | guide | relance | carte-cadeau | message-custom
export async function POST(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const { action, marie_uid, invites: targetInvites, message: customMessage } = body

  if (!action || !marie_uid) {
    return NextResponse.json({ error: 'action et marie_uid requis' }, { status: 400 })
  }

  const db = getDb()
  const userDoc = await db.collection('portail_users').doc(marie_uid).get()
  if (!userDoc.exists) return NextResponse.json({ error: 'Marié introuvable' }, { status: 404 })

  const marie = userDoc.data()!
  const nomsMaries: string = marie.noms_maries || 'les Mariés'
  const dateRaw = marie.date_mariage ?? marie.projet?.date_evenement
  const dateMariage = dateRaw?.toDate?.()
    ? dateRaw.toDate().toLocaleDateString('fr-FR')
    : (typeof dateRaw === 'string' ? new Date(dateRaw).toLocaleDateString('fr-FR') : '')
  const lieu = marie.lieu || 'Kribi'
  const codePromo = marie.code_promo || ''

  // Charger tous les invités ou ceux ciblés
  let invitesSnap
  if (Array.isArray(targetInvites) && targetInvites.length > 0) {
    // Cibler des invités spécifiques par ID
    const batch: any[] = []
    for (const id of targetInvites.slice(0, 50)) {
      const doc = await db.collection(`portail_users/${marie_uid}/invites_guests`).doc(id).get()
      if (doc.exists) batch.push({ id: doc.id, ...doc.data() })
    }
    invitesSnap = { docs: batch.map(g => ({ id: g.id, data: () => g })) }
  } else {
    // Tous selon le filtre de l'action
    let q = db.collection(`portail_users/${marie_uid}/invites_guests`) as any
    if (action === 'guide') q = q.where('statut', '==', 'confirme')
    if (action === 'relance') q = q.where('statut', '==', 'invite')
    invitesSnap = await q.limit(50).get()
  }

  const results: { nom: string; tel: string; success: boolean; error?: string }[] = []

  for (const doc of invitesSnap.docs) {
    const g = typeof doc.data === 'function' ? doc.data() : doc
    const nom: string = g.nom || 'Invité'
    const tel: string = g.telephone || g.tel || ''
    if (!tel) { results.push({ nom, tel: '', success: false, error: 'Pas de téléphone' }); continue }

    let message = ''

    switch (action) {
      case 'faire-part': {
        const slug: string = g.magic_link_slug || ''
        const lien = slug ? `${BASE_URL}/invite/${slug}` : BASE_URL
        message = customMessage
          ? customMessage.replace('{prenom}', nom.split(' ')[0]).replace('{lien}', lien)
          : `Bonjour ${nom.split(' ')[0]} !

*${nomsMaries}* vous invitent à leur mariage 💍

📅 Date : ${dateMariage}
📍 Lieu : ${lieu}

Confirmez votre présence et découvrez le programme :
${lien}

Avec toute notre affection,
${nomsMaries}`
        break
      }

      case 'guide': {
        const lienGuide = `${BASE_URL}/guide-kribi`
        message = `Bonjour ${nom.split(' ')[0]} 👋

Vous avez confirmé votre présence au mariage de *${nomsMaries}* — merci !

Voici le guide pratique pour votre venue à Kribi :
📖 ${lienGuide}

Infos utiles : hébergements, transport, activités, météo, contacts urgences.

À très bientôt !
L'équipe L&Lui Signature`
        break
      }

      case 'relance': {
        const slug: string = g.magic_link_slug || ''
        const lien = slug ? `${BASE_URL}/invite/${slug}` : BASE_URL
        message = customMessage
          ? customMessage.replace('{prenom}', nom.split(' ')[0]).replace('{lien}', lien)
          : `Bonjour ${nom.split(' ')[0]} !

*${nomsMaries}* attendent encore votre réponse pour leur mariage 💍

📅 Le ${dateMariage} à ${lieu}

Merci de confirmer ou décliner votre présence :
${lien}

(Cette invitation vous est réservée personnellement)`
        break
      }

      case 'carte-cadeau': {
        const lienBoutique = `${BASE_URL}/mariage/${encodeURIComponent(nomsMaries.replace(/\s+/g, '-').toLowerCase())}?code=${codePromo}`
        message = `Bonjour ${nom.split(' ')[0]} 🎁

*${nomsMaries}* vous remercient chaleureusement pour votre présence à leur mariage.

Vous pouvez encore leur faire plaisir avec une carte cadeau numérique :
🛍️ ${lienBoutique}

Avec leur profonde gratitude,
${nomsMaries}`
        break
      }

      case 'message-custom': {
        if (!customMessage) { results.push({ nom, tel, success: false, error: 'Message vide' }); continue }
        message = customMessage
          .replace('{prenom}', nom.split(' ')[0])
          .replace('{nom}', nom)
          .replace('{noms_maries}', nomsMaries)
          .replace('{date}', dateMariage)
          .replace('{lieu}', lieu)
        break
      }

      default:
        results.push({ nom, tel, success: false, error: `Action inconnue: ${action}` })
        continue
    }

    const { success, error } = await sendWhatsApp(tel, message)
    results.push({ nom, tel, success, error })

    // MAJ flags sur l'invité
    if (success) {
      const updateData: Record<string, unknown> = {}
      if (action === 'faire-part') updateData.lien_envoye = true
      if (action === 'relance') { updateData.relance_envoyee = true; updateData.relance_at = Timestamp.now() }
      if (Object.keys(updateData).length > 0) {
        await db.collection(`portail_users/${marie_uid}/invites_guests`).doc(doc.id).update(updateData).catch(() => {})
      }
    }
  }

  const successCount = results.filter(r => r.success).length
  await logAction(db, marie_uid,
    `admin_${action}`,
    `Action "${action}" — ${successCount}/${results.length} messages envoyés`,
    'whatsapp'
  )

  return NextResponse.json({ results, success_count: successCount, total: results.length })
}
