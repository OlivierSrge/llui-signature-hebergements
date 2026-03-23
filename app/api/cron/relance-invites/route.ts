// app/api/cron/relance-invites/route.ts — #43 Relance auto invités J-60/30/14/7
// Cron Vercel : "0 7 * * *" (7h UTC = 8h Cameroun, quotidien)
// Logique : pour chaque marié actif, si date mariage est à J-60/30/14/7,
//           envoyer WhatsApp aux invités non-confirmés (sauf si déjà relancé ce palier)

import { NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import { sendWhatsApp } from '@/lib/whatsappNotif'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

const PALIERS = [60, 30, 14, 7]
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'

function joursAvant(dateISO: string): number {
  const wedding = new Date(dateISO)
  wedding.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((wedding.getTime() - today.getTime()) / 86_400_000)
}

function isPalierAujourdhui(jours: number): number | null {
  for (const p of PALIERS) {
    if (jours >= p - 1 && jours <= p + 1) return p
  }
  return null
}

export async function GET() {
  // Vercel cron passe l'Authorization header — en prod le middleware vérifie CRON_SECRET
  const db = getDb()
  const stats = { checked: 0, relances: 0, echecs: 0, skipped: 0 }

  try {
    const mariesSnap = await db.collection('portail_users')
      .where('role', '==', 'MARIÉ')
      .get()

    for (const marieDoc of mariesSnap.docs) {
      const d = marieDoc.data()
      const uid = marieDoc.id

      // Extraire date mariage
      const dateMariageRaw = d.date_mariage ?? d.projet?.date_evenement
      if (!dateMariageRaw) continue

      const dateISO: string = dateMariageRaw?.toDate
        ? dateMariageRaw.toDate().toISOString().slice(0, 10)
        : typeof dateMariageRaw === 'string' ? dateMariageRaw : ''

      if (!dateISO) continue

      const jours = joursAvant(dateISO)
      const palier = isPalierAujourdhui(jours)
      if (!palier) continue  // Pas un jour de relance

      const code: string = d.code_promo ?? ''
      const nomsMaries: string = d.noms_maries ?? 'les Mariés'
      const fieldRelance = `relance_j${palier}_done`

      // Charger invités non-confirmés
      const invitesSnap = await db
        .collection(`portail_users/${uid}/invites_guests`)
        .where('statut', '!=', 'confirme')
        .get()

      for (const inviteDoc of invitesSnap.docs) {
        const inv = inviteDoc.data()

        // Skip si relance déjà envoyée pour ce palier
        if (inv[fieldRelance]) { stats.skipped++; continue }

        // Skip si pas de téléphone
        if (!inv.tel) { stats.skipped++; continue }

        const prenom: string = inv.prenom || 'cher invité'
        const inviteId = inviteDoc.id

        // URL fiche personnalisée si code dispo
        const codeEnc = encodeURIComponent(code)
        const prenomEnc = encodeURIComponent(prenom)
        const lien = code
          ? `${BASE_URL}/invite/${uid}?prenom=${prenomEnc}&code=${codeEnc}`
          : `${BASE_URL}/invite/${uid}`

        const message = [
          `Bonjour ${prenom} ! 💌`,
          ``,
          `Le mariage de *${nomsMaries}* est dans *${palier} jours* — le ${new Date(dateISO).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.`,
          ``,
          code ? `Soutenez-les avec votre code *${code}* :` : `Retrouvez toutes les informations :`,
          `👉 ${lien}`,
          ``,
          `L&Lui Signature 💛`,
        ].join('\n')

        stats.checked++
        const result = await sendWhatsApp(inv.tel, message)

        if (result.success) {
          await db.collection(`portail_users/${uid}/invites_guests`).doc(inviteId).update({
            [fieldRelance]: true,
            derniere_relance: FieldValue.serverTimestamp(),
            relance_envoyee: true,
          })
          stats.relances++
        } else {
          console.error(`[relance-invites] Échec ${uid}/${inviteId}: ${result.error}`)
          stats.echecs++
        }
      }
    }

    console.log('[relance-invites] Stats:', stats)
    return NextResponse.json({ success: true, stats })
  } catch (e) {
    console.error('[relance-invites] Erreur:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
