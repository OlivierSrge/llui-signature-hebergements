// app/api/cron/fast-start-check/route.ts
// Cron horaire — unlock auto + expiration des paliers Fast Start
// Déclenché par Vercel Crons : "0 * * * *"

import { NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'

const PALIERS = [
  { key: 30, champ: 'palier_30', deadline_champ: 'deadline_30j', rev: 80,  prime: 30_000  },
  { key: 60, champ: 'palier_60', deadline_champ: 'deadline_60j', rev: 200, prime: 80_000  },
  { key: 90, champ: 'palier_90', deadline_champ: 'deadline_90j', rev: 450, prime: 200_000 },
] as const

const WA_NUM = process.env.WHATSAPP_ADMIN_NUM ?? '+237693407964'
const PORTAIL_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://llui-signature-hebergements.vercel.app'

async function sendWhatsApp(to: string, message: string) {
  const apiKey = process.env.WHATSAPP_API_KEY
  const apiUrl = process.env.WHATSAPP_API_URL
  if (!apiKey || !apiUrl || !to) return
  await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ to, message }),
  }).catch(() => {}) // fire-and-forget
}

export async function GET(request: Request) {
  // Vérification cron secret pour éviter les appels non autorisés
  const auth = request.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getDb()
  const now = Date.now()
  let checked = 0, unlocked = 0, expired = 0

  // Lire uniquement les users avec fast_start actif
  const snap = await db.collection('portail_users')
    .where('fast_start.enrolled_at', '!=', null)
    .get()

  for (const doc of snap.docs) {
    const d = doc.data()
    const uid = doc.id
    const fs = d.fast_start ?? {}
    const displayName: string = d.displayName ?? 'Partenaire'
    const telephone: string = d.phone ?? ''
    const rev: number = d.rev_lifetime ?? 0
    checked++

    const updates: Record<string, unknown> = {}
    const newDemandes: Array<Record<string, unknown>> = []

    for (const p of PALIERS) {
      const deadlineTs = fs[p.deadline_champ]
      if (!deadlineTs?.toDate) continue
      const deadline = deadlineTs.toDate().getTime()

      const alreadyUnlocked: boolean = fs[`${p.champ}_unlocked`] ?? false
      const alreadyExpired: boolean  = fs[`${p.champ}_expire`] ?? false

      if (alreadyUnlocked || alreadyExpired) continue

      // Cas EXPIRATION : délai dépassé sans atteindre le seuil REV
      if (now > deadline && rev < p.rev) {
        updates[`fast_start.${p.champ}_expire`] = true
        expired++
        if (telephone) {
          await sendWhatsApp(telephone,
            `⏰ ${displayName}, votre palier Fast Start J${p.key} a expiré. ` +
            `Continuez à accumuler des REV pour décrocher les paliers suivants !`
          )
        }
        continue
      }

      // Cas ATTEINTE : REV suffisants ET dans le délai
      if (rev >= p.rev && now <= deadline) {
        updates[`fast_start.${p.champ}_unlocked`] = true
        unlocked++

        // Créer une demande EN_ATTENTE dans fast_start_demandes
        newDemandes.push({
          uid,
          nom_complet: displayName,
          telephone_om: '',         // sera complété par le user via le formulaire
          palier: p.key,
          rev_au_moment: rev,
          montant_prime: p.prime,
          atteint_at: FieldValue.serverTimestamp(),
          deadline_palier: deadlineTs,
          statut: 'EN_ATTENTE',
        })

        if (telephone) {
          const montantStr = new Intl.NumberFormat('fr-FR').format(p.prime) + ' FCFA'
          await sendWhatsApp(telephone,
            `🎯 Félicitations ${displayName} ! Vous avez débloqué le palier Fast Start J${p.key} !\n` +
            `Prime disponible : ${montantStr}\n` +
            `Réclamez-la dans votre espace : ${PORTAIL_URL}/portail/avantages`
          )
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      await doc.ref.update(updates)
    }
    for (const demande of newDemandes) {
      await db.collection('fast_start_demandes').add(demande)
    }
  }

  return NextResponse.json({ ok: true, checked, unlocked, expired })
}
