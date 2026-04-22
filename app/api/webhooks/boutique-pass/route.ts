// app/api/webhooks/boutique-pass/route.ts
// POST depuis Netlify à chaque vente Pass VIP.
// Auth : Authorization: Bearer WEBHOOK_SECRET

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { SKU_TO_GRADE, PASS_VIP_CONFIGS, TAUX_COMMISSION_PASS } from '@/types/pass-vip'
import type { PassVipGrade } from '@/types/pass-vip'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'

async function sendWhatsApp(to: string, message: string): Promise<void> {
  await fetch(`${APP_URL}/api/whatsapp/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.ADMIN_API_KEY}`,
    },
    body: JSON.stringify({ to, message }),
  }).catch((e) => console.warn('[boutique-pass webhook sendWhatsApp]', e))
}

interface WebhookBody {
  sku: string
  nom_usage: string
  contact: string          // numéro WhatsApp du client
  prescripteur_id?: string
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Auth
  const authHeader = req.headers.get('authorization') ?? ''
  const secret = process.env.WEBHOOK_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: WebhookBody
  try {
    body = (await req.json()) as WebhookBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { sku, nom_usage, contact, prescripteur_id } = body

  if (!sku || !nom_usage || !contact) {
    return NextResponse.json({ error: 'sku, nom_usage et contact sont requis' }, { status: 400 })
  }

  // Résolution du grade à partir du SKU
  const grade = SKU_TO_GRADE[sku] as PassVipGrade | undefined
  if (!grade) {
    return NextResponse.json({ error: `SKU inconnu : ${sku}` }, { status: 400 })
  }

  const config = PASS_VIP_CONFIGS[grade]

  // Génération token unique = doc ID Firestore
  const token = crypto.randomUUID()

  const now = new Date()
  const created_at = now.toISOString()
  const expiresDate = new Date(now.getTime() + config.duree_jours * 86400000)
  const expires_at = expiresDate.toISOString()

  try {
    // Création du Pass VIP
    await db.collection('pass_vip_actifs').doc(token).set({
      id: token,
      nom_usage: nom_usage.toUpperCase().trim(),
      grade_pass: grade,
      actif: true,
      created_at,
      expires_at,
      nb_utilisations: 0,
      prescripteur_id: prescripteur_id ?? null,
      contact,
      sku,
      ref_lisible: `L&Lui Signature-${grade}-${token.slice(0, 4).toUpperCase()}`,
    })

    const pass_url = `${APP_URL}/pass/${token}`

    // Commission prescripteur N1 — non-bloquante
    if (prescripteur_id) {
      const commissionN1 = Math.round(config.prix_fcfa * TAUX_COMMISSION_PASS[1])
      const rev = Math.floor(config.prix_fcfa / 10000)
      const walletRef = db.collection('wallets_partenaires').doc(prescripteur_id)
      const commRef = db.collection('commissions_partenaires').doc()
      db.runTransaction(async (tx) => {
        tx.set(walletRef, {
          cash: FieldValue.increment(Math.round(commissionN1 * 0.7)),
          credits: FieldValue.increment(Math.round(commissionN1 * 0.3)),
          rev_total: FieldValue.increment(rev),
          updated_at: created_at,
        }, { merge: true })
        tx.set(commRef, {
          partenaire_id: prescripteur_id,
          partenaire_source_id: null,
          partenaire_source_grade: 'ANONYME',
          type_vente: 'boutique',
          niveau: 1,
          montant_vente: config.prix_fcfa,
          taux_commission: TAUX_COMMISSION_PASS[1],
          montant_commission: commissionN1,
          montant_cash: Math.round(commissionN1 * 0.7),
          montant_credits: Math.round(commissionN1 * 0.3),
          rev_generes: rev,
          statut: 'validee',
          reference_vente: `PASS-${token}`,
          created_at, validee_at: created_at,
        })
      }).catch((e) => console.warn('[boutique-pass] commission error:', e))
    }

    // Notification WhatsApp au client — non-bloquante
    const expiresFormatted = expiresDate.toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
    })
    sendWhatsApp(
      contact,
      `✦ Votre Pass VIP ${grade} L&Lui Signature est prêt !\n` +
      `Accédez à votre carte : ${pass_url}\n` +
      `Valable ${config.duree_jours} jours — jusqu'au ${expiresFormatted}.\n` +
      `Montrez votre QR chez nos partenaires pour profiter de vos avantages. Bonne soirée !`,
    ).catch(() => {})

    return NextResponse.json({ success: true, pass_url, token, grade, expires_at })
  } catch (e: unknown) {
    console.error('[boutique-pass webhook]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur interne' },
      { status: 500 },
    )
  }
}
