// app/api/portail/fast-start/admin/route.ts
// POST — actions admin : VALIDER / PAYER / REJETER une demande Fast Start

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { cookies } from 'next/headers'
const PORTAIL_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://llui-signature-hebergements.vercel.app'

async function sendWhatsApp(to: string, message: string) {
  const INSTANCE_ID = process.env.GREEN_API_INSTANCE_ID
  const API_TOKEN = process.env.GREEN_API_TOKEN
  if (!INSTANCE_ID || !API_TOKEN || !to) return
  const clean = to.replace(/[\s\-+]/g, '')
  await fetch(`https://api.green-api.com/waInstance${INSTANCE_ID}/sendMessage/${API_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId: `${clean}@c.us`, message }),
  }).catch(() => {})
}

async function verifyAdmin(): Promise<boolean> {
  const cookieStore = cookies()
  return !!cookieStore.get('admin_session')?.value
}

export async function POST(req: NextRequest) {
  if (!await verifyAdmin()) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { action, demande_id, reference_om, montant_paye, note } = body

    if (!demande_id || !action) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    const db = getDb()
    const demandeRef = db.collection('fast_start_demandes').doc(demande_id)
    const snap = await demandeRef.get()
    if (!snap.exists) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })

    const d = snap.data()!
    const { uid, palier, nom_complet, telephone_om, montant_prime } = d
    const montantStr = new Intl.NumberFormat('fr-FR').format(montant_prime ?? 0) + ' FCFA'
    const pKey = `palier_${palier}` as string
    const userRef = db.collection('portail_users').doc(uid)
    const userSnap = await userRef.get()
    const userPhone: string = userSnap.data()?.phone ?? ''

    // ── VALIDER ──────────────────────────────────────────────
    if (action === 'VALIDER') {
      await demandeRef.update({
        statut: 'VALIDEE',
        valide_at: FieldValue.serverTimestamp(),
      })
      await userRef.update({ [`fast_start.${pKey}_valide_admin`]: true })
      await sendWhatsApp(userPhone || telephone_om,
        `✅ Prime Fast Start J${palier} validée !\n` +
        `Virement OM de ${montantStr} sous 48h sur votre numéro ${telephone_om}.`
      )
      return NextResponse.json({ success: true })
    }

    // ── PAYER ─────────────────────────────────────────────────
    if (action === 'PAYER') {
      if (!reference_om) return NextResponse.json({ error: 'Référence OM requise' }, { status: 400 })
      await demandeRef.update({
        statut: 'PAYEE',
        reference_om,
        paye_at: FieldValue.serverTimestamp(),
      })
      await userRef.update({
        [`fast_start.${pKey}_paye`]: true,
        [`fast_start.reference_om_${palier}`]: reference_om,
        'fast_start.total_primes_payees': FieldValue.increment(montant_prime ?? 0),
      })
      await sendWhatsApp(userPhone || telephone_om,
        `💸 Virement Orange Money reçu !\n` +
        `Prime Fast Start J${palier} : ${montantStr}\n` +
        `Référence : ${reference_om}\n` +
        `Merci pour votre engagement L&Lui ! 🌟`
      )
      return NextResponse.json({ success: true })
    }

    // ── REJETER ───────────────────────────────────────────────
    if (action === 'REJETER') {
      await demandeRef.update({ statut: 'REJETEE', note_admin: note ?? '' })
      // Permettre une re-soumission
      await userRef.update({ [`fast_start.${pKey}_claimed`]: false })
      await sendWhatsApp(userPhone || telephone_om,
        `⚠️ Demande Fast Start J${palier} rejetée.\n` +
        `Motif : ${note ?? 'Non précisé'}\n` +
        `Contactez-nous : +237 693 407 964`
      )
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  } catch (e) {
    console.error('fast-start/admin error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
