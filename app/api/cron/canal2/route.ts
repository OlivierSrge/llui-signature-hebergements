import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { sendWhatsApp } from '@/lib/whatsappNotif'

const ADMIN_PHONE = process.env.ADMIN_WHATSAPP_PHONE ?? '693407964'

function jours(d: string): number {
  return Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000))
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const now = new Date()
  const results = { codes_expires: 0, alertes_forfait: 0, forfaits_expires: 0, errors: [] as string[] }

  // ── TÂCHE 1 : Expirer les codes codes_sessions ─────────────────
  try {
    const codesSnap = await db.collection('codes_sessions')
      .where('statut', '==', 'actif')
      .where('expire_at', '<=', now.toISOString())
      .get()

    const batch1 = db.batch()
    codesSnap.docs.forEach((d) => batch1.update(d.ref, { statut: 'expire' }))
    if (!codesSnap.empty) await batch1.commit()
    results.codes_expires = codesSnap.size
  } catch (e: unknown) {
    results.errors.push(`codes: ${e instanceof Error ? e.message : String(e)}`)
  }

  // ── TÂCHE 2 : Alertes forfaits J-7 ───────────────────────────
  try {
    const sept = new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString()
    const alertSnap = await db.collection('prescripteurs_partenaires')
      .where('forfait_statut', '==', 'actif')
      .where('forfait_expire_at', '<=', sept)
      .where('forfait_expire_at', '>', now.toISOString())
      .get()

    for (const d of alertSnap.docs) {
      const p = d.data()
      const joursRestants = jours(p.forfait_expire_at as string)
      const nom = p.nom_etablissement as string
      const tel = p.telephone as string

      try {
        await sendWhatsApp(ADMIN_PHONE,
          `⚠️ Forfait expirant !\n${nom} — dans ${joursRestants} jours\nVoir : ${process.env.NEXT_PUBLIC_APP_URL ?? ''}/admin/prescripteurs-partenaires`
        )
      } catch {}
      try {
        await sendWhatsApp(tel,
          `⚠️ Votre forfait L&Lui expire dans ${joursRestants} jours.\nContactez-nous : +237 693 407 964\n— L&Lui Signature`
        )
      } catch {}
      results.alertes_forfait++
    }
  } catch (e: unknown) {
    results.errors.push(`alertes: ${e instanceof Error ? e.message : String(e)}`)
  }

  // ── TÂCHE 3 : Désactiver forfaits expirés ────────────────────
  try {
    const expiredSnap = await db.collection('prescripteurs_partenaires')
      .where('forfait_statut', '==', 'actif')
      .where('forfait_expire_at', '<=', now.toISOString())
      .get()

    const batch3 = db.batch()
    for (const d of expiredSnap.docs) {
      batch3.update(d.ref, { forfait_statut: 'expire', statut: 'expire' })
    }
    if (!expiredSnap.empty) await batch3.commit()

    for (const d of expiredSnap.docs) {
      const p = d.data()
      try {
        await sendWhatsApp(p.telephone as string,
          `🔴 Votre forfait L&Lui a expiré. Votre QR code a été désactivé.\nContactez-nous pour renouveler : +237 693 407 964\n— L&Lui Signature`
        )
      } catch {}
    }
    results.forfaits_expires = expiredSnap.size
  } catch (e: unknown) {
    results.errors.push(`forfaits: ${e instanceof Error ? e.message : String(e)}`)
  }

  return NextResponse.json({
    ok: true,
    executé_le: now.toISOString(),
    ...results,
  })
}
