// app/api/portail/fast-start/claim/route.ts
// POST — Réclamation d'une prime Fast Start par un partenaire

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'

const MONTANTS: Record<30 | 60 | 90, number> = {
  30: 30_000,
  60: 80_000,
  90: 200_000,
}
const ADMIN_WA = process.env.WHATSAPP_ADMIN_NUM ?? '+237693407964'
const PORTAIL_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://llui-signature-hebergements.vercel.app'

async function sendWhatsApp(to: string, message: string) {
  const apiKey = process.env.WHATSAPP_API_KEY
  const apiUrl = process.env.WHATSAPP_API_URL
  if (!apiKey || !apiUrl || !to) return
  await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ to, message }),
  }).catch(() => {})
}

export async function POST(req: NextRequest) {
  try {
    const { uid, palier, nom_complet, telephone_om } = await req.json()

    // Validation des champs requis
    if (!uid || !palier || !nom_complet || !telephone_om) {
      return NextResponse.json({ success: false, error: 'Champs requis manquants' }, { status: 400 })
    }
    if (![30, 60, 90].includes(palier)) {
      return NextResponse.json({ success: false, error: 'Palier invalide' }, { status: 400 })
    }
    // Validation format téléphone Orange Money (+237XXXXXXXXX)
    if (!/^\+237[0-9]{9}$/.test(telephone_om)) {
      return NextResponse.json({ success: false, error: 'Format téléphone invalide. Attendu : +237XXXXXXXXX' }, { status: 400 })
    }

    const db = getDb()
    const userSnap = await db.collection('portail_users').doc(uid).get()
    if (!userSnap.exists) {
      return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 404 })
    }
    const d = userSnap.data()!
    const fs = d.fast_start ?? {}
    const p = `palier_${palier}` as 'palier_30' | 'palier_60' | 'palier_90'

    // Vérifications métier
    if (!fs[`${p}_unlocked`]) {
      return NextResponse.json({ success: false, error: 'Palier non débloqué' }, { status: 400 })
    }
    if (fs[`${p}_expire`]) {
      return NextResponse.json({ success: false, error: 'Palier expiré' }, { status: 400 })
    }
    if (fs[`${p}_claimed`]) {
      return NextResponse.json({ success: false, error: 'Demande déjà soumise pour ce palier' }, { status: 409 })
    }

    // Vérifier l'absence de demande EN_ATTENTE pour ce palier
    const existing = await db.collection('fast_start_demandes')
      .where('uid', '==', uid)
      .where('palier', '==', palier)
      .where('statut', '==', 'EN_ATTENTE')
      .limit(1).get()
    if (!existing.empty) {
      return NextResponse.json({ success: false, error: 'Une demande est déjà en cours pour ce palier' }, { status: 409 })
    }

    const montant = MONTANTS[palier as 30 | 60 | 90]
    const deadlineTs = fs[`deadline_${palier}j`] ?? null

    // Créer la demande
    const demandeRef = await db.collection('fast_start_demandes').add({
      uid,
      nom_complet,
      telephone_om,
      palier,
      rev_au_moment: d.rev_lifetime ?? 0,
      montant_prime: montant,
      atteint_at: FieldValue.serverTimestamp(),
      deadline_palier: deadlineTs,
      statut: 'EN_ATTENTE',
    })

    // Marquer claimed dans le profil user
    await userSnap.ref.update({ [`fast_start.${p}_claimed`]: true })

    // Notif admin WhatsApp
    const montantStr = new Intl.NumberFormat('fr-FR').format(montant) + ' FCFA'
    await sendWhatsApp(ADMIN_WA,
      `📋 Nouvelle demande Fast Start J${palier}\n` +
      `Nom : ${nom_complet}\n` +
      `N° OM : ${telephone_om}\n` +
      `Montant : ${montantStr}\n` +
      `REV au moment : ${d.rev_lifetime ?? 0}\n` +
      `Voir : ${PORTAIL_URL}/admin/fast-start`
    )

    return NextResponse.json({ success: true, demande_id: demandeRef.id })
  } catch (e) {
    console.error('fast-start/claim error:', e)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
