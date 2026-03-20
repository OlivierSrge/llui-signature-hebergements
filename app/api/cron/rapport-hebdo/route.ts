// app/api/cron/rapport-hebdo/route.ts
// Cron lundi 7h UTC (8h Cameroun) — Résumé hebdomadaire WhatsApp admin
// Schedule : "0 7 * * 1" dans vercel.json

import { NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { sendWhatsApp, msgResumeSemaine } from '@/lib/whatsappNotif'

export const dynamic = 'force-dynamic'

function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0,0,0,0); return d }
function dateFR(d: Date) { return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) }

export async function GET() {
  try {
    const db = getDb()
    const weekStart = daysAgo(7)
    const weekEnd = new Date()

    const [txSnap, usersSnap, comSnap, fsSnap, retrSnap] = await Promise.all([
      db.collectionGroup('transactions').get(),
      db.collection('portail_users').get(),
      db.collection('commissions').get(),
      db.collection('fast_start_demandes').get(),
      db.collection('retraits_demandes').get(),
    ])

    const txAll = txSnap.docs.map(d => d.data())
    const txSemaine = txAll.filter(t => t.created_at?.toDate?.() >= weekStart && t.status === 'COMPLETED')
    const caSemaine = txSemaine.reduce((s, t) => s + (t.amount_ht ?? 0), 0)
    const txBoutique = txSemaine.filter(t => t.type === 'BOUTIQUE').length
    const txMariage = txSemaine.filter(t => t.type === 'PACK_MARIAGE').length

    const nouveauxInscrits = usersSnap.docs.filter(d => d.data().created_at?.toDate?.() >= weekStart).length

    const comSemaine = comSnap.docs.filter(d => d.data().created_at?.toDate?.() >= weekStart)
    const commissionsVersees = comSemaine.reduce((s, d) => s + (d.data().cash ?? 0), 0)

    const fsList = fsSnap.docs.map(d => d.data())
    const primesFspayees = fsList.filter(f => f.paye_at?.toDate?.() >= weekStart).length
    const primesFsenAttente = fsList.filter(f => f.statut === 'EN_ATTENTE').length

    const retrList = retrSnap.docs.map(d => d.data())
    const retraitsTraites = retrList.filter(r => (r.paye_at ?? r.rejete_at)?.toDate?.() >= weekStart).length
    const retraitsEnAttente = retrList.filter(r => r.statut === 'EN_ATTENTE').length

    const topTx = txSemaine.sort((a, b) => (b.amount_ht ?? 0) - (a.amount_ht ?? 0))[0]

    const data = {
      dateDebut: dateFR(weekStart), dateFin: dateFR(weekEnd),
      caSemaine, txBoutique, txMariage, nouveauxInscrits,
      upgradesGrades: 0, commissionsVersees, primesFspayees, primesFsenAttente,
      retraitsTraites, retraitsEnAttente,
      topTransaction: { nom: topTx?.source ?? '—', montant: topTx?.amount_ht ?? 0 },
    }

    const phone = (process.env.ADMIN_PHONE_NUMBER ?? '').replace(/\D/g, '')
    const message = msgResumeSemaine(data)

    await sendWhatsApp(phone, message)

    await db.collection('cron_logs').add({
      type: 'RAPPORT_HEBDO', sent_at: FieldValue.serverTimestamp(),
      success: true, caSemaine, nouveauxInscrits,
    })

    return NextResponse.json({ success: true, caSemaine, message: message.slice(0, 50) + '…' })
  } catch (e) {
    console.error('rapport-hebdo error:', e)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}
