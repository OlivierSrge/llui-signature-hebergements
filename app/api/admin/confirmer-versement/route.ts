// app/api/admin/confirmer-versement/route.ts
// PATCH — Admin confirme un versement déclaré par un marié
// Body: { uid, versement_id }
// → met statut = 'confirme' + confirme_par='admin' + envoie WhatsApp avec total/reste

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { FieldValue } from 'firebase-admin/firestore'
import { getDb } from '@/lib/firebase'
import { sendWhatsApp } from '@/lib/whatsappNotif'

export const dynamic = 'force-dynamic'

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

export async function PATCH(req: Request) {
  try {
    const jar = await cookies()
    const adminSession = jar.get('admin_session')?.value
    if (!adminSession) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { uid, versement_id } = await req.json()
    if (!uid || !versement_id) {
      return NextResponse.json({ error: 'uid et versement_id requis' }, { status: 400 })
    }

    const db = getDb()
    const docRef = db.collection('portail_users').doc(uid)
    const snap = await docRef.get()
    if (!snap.exists) return NextResponse.json({ error: 'Marié introuvable' }, { status: 404 })

    const data = snap.data()!
    const versements: Array<Record<string, unknown>> = Array.isArray(data.versements) ? data.versements : []

    const versement = versements.find(v => v.id === versement_id)
    if (!versement) return NextResponse.json({ error: 'Versement introuvable' }, { status: 404 })

    const now = new Date().toISOString()

    // Mettre à jour le versement dans le tableau
    const updated = versements.map(v =>
      v.id === versement_id
        ? { ...v, statut: 'confirme', confirme_at: now, confirme_par: 'admin' }
        : v
    )

    await docRef.update({ versements: updated })

    // Calculer total confirmé et reste
    const totalVerse = updated
      .filter(v => v.statut === 'confirme')
      .reduce((s, v) => s + (Number(v.montant) || 0), 0)
    const budgetTotal = Number(data.budget_total) || 0
    const reste = budgetTotal > 0 ? Math.max(0, budgetTotal - totalVerse) : null

    // Logger dans admin_logs
    await db.collection('admin_logs').add({
      action: 'confirmer_versement',
      marie_uid: uid,
      versement_id,
      montant: Number(versement.montant) || 0,
      total_verse: totalVerse,
      reste,
      confirme_at: now,
      created_at: FieldValue.serverTimestamp(),
    }).catch(() => {})

    // Envoyer WhatsApp au marié
    const whatsapp = data.whatsapp ?? data.telephone ?? ''
    const noms = data.noms_maries ?? 'chers mariés'
    const montant = Number(versement.montant) ?? 0
    const modeLabels: Record<string, string> = {
      orange_money: 'Orange Money',
      virement: 'Virement bancaire',
      especes: 'Espèces',
      carte: 'Carte bancaire',
      autre: 'autre mode',
    }
    const mode = modeLabels[String(versement.mode ?? 'autre')] ?? String(versement.mode ?? 'autre')

    if (whatsapp) {
      let msg = `✅ Bonne nouvelle, ${noms} !\n\nVotre versement de *${formatFCFA(montant)}* par ${mode} a bien été confirmé par L&Lui Signature.\n\n`
      msg += `💰 Total versé confirmé : *${formatFCFA(totalVerse)}*`
      if (reste !== null && budgetTotal > 0) {
        if (reste > 0) {
          msg += `\n📋 Reste à régler : *${formatFCFA(reste)}*`
        } else {
          msg += `\n🎉 Votre budget est intégralement réglé !`
        }
      }
      msg += `\n\nMerci pour votre confiance et votre organisation !\n\nL&Lui Signature 💛`
      await sendWhatsApp(whatsapp, msg).catch(() => {})
    }

    return NextResponse.json({ success: true, versement_id, statut: 'confirme', total_verse: totalVerse, reste })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
