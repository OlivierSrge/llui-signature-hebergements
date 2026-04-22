// app/api/webhooks/boutique-pass/route.ts
// POST depuis Netlify à chaque commande Pass VIP.
// Auth : Authorization: Bearer WEBHOOK_SECRET
//
// Flux :
//   1. Créer le Pass en statut PENDING (actif: false)
//   2. Envoyer mail admin (Olivier) avec lien + template
//   3. Envoyer mail client (confirmation + instructions paiement)
//   La commission prescripteur est créditée à l'activation (premier clic).

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { SKU_TO_GRADE, PASS_VIP_CONFIGS } from '@/types/pass-vip'
import { GRADE_CONFIGS } from '@/types/stars-grade'
import type { PassVipGrade } from '@/types/pass-vip'
import { sendPassVipEmails } from '@/lib/email'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'

interface WebhookBody {
  sku: string
  nom_usage: string
  contact?: string           // numéro WhatsApp client
  email?: string             // email client pour notifications
  prescripteur_id?: string
  prescripteur_nom?: string  // nom affiché dans le mail admin
  sheets_row?: number        // numéro ligne Commandes Google Sheets (1-indexed)
  sheets_id?: string         // ID Google Sheet (fallback : GOOGLE_SHEETS_CANAL2_ID)
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

  const { sku, nom_usage, contact, email, prescripteur_id, prescripteur_nom, sheets_row, sheets_id } = body

  if (!sku || !nom_usage) {
    return NextResponse.json({ error: 'sku et nom_usage sont requis' }, { status: 400 })
  }

  const grade = SKU_TO_GRADE[sku] as PassVipGrade | undefined
  if (!grade) {
    return NextResponse.json({ error: `SKU inconnu : ${sku}` }, { status: 400 })
  }

  const config = PASS_VIP_CONFIGS[grade]
  const gradeConfig = GRADE_CONFIGS[grade]

  const token = crypto.randomUUID()
  const now = new Date()
  const created_at = now.toISOString()
  const ref_lisible = `L&Lui Signature-${grade}-${token.slice(0, 4).toUpperCase()}`

  // expires_at provisoire — sera recalculé à l'activation depuis now
  const expires_at = new Date(now.getTime() + config.duree_jours * 86400000).toISOString()

  try {
    // Création du Pass VIP en statut PENDING
    await db.collection('pass_vip_actifs').doc(token).set({
      id: token,
      nom_usage: nom_usage.toUpperCase().trim(),
      grade_pass: grade,
      actif: false,
      statut: 'pending',
      prix_paye: config.prix_fcfa,
      sku,
      created_at,
      expires_at,
      nb_utilisations: 0,
      prescripteur_id: prescripteur_id ?? null,
      ref_lisible,
      email: email ?? null,
      contact: contact ?? null,
      sheets_row: sheets_row ?? null,
      sheets_id: sheets_id ?? null,
    })

    const pass_url = `${APP_URL}/pass/${token}`
    const activation_url = `${APP_URL}/api/pass/activer/${token}?secret=${process.env.WEBHOOK_SECRET ?? ''}`

    // Emails Resend — non-bloquants
    sendPassVipEmails({
      nom_usage,
      grade,
      duree: config.duree_jours,
      prix: config.prix_fcfa,
      remise_min: gradeConfig.remise_min,
      ref_lisible,
      pass_url,
      activation_url,
      created_at,
      contact: contact ?? null,
      email: email ?? null,
      prescripteur_nom: prescripteur_nom ?? null,
    }).catch((e) => console.warn('[boutique-pass] email error:', e))

    return NextResponse.json({
      success: true,
      pass_url,
      token,
      grade,
      ref_lisible,
      statut: 'pending',
    })
  } catch (e: unknown) {
    console.error('[boutique-pass webhook]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur interne' },
      { status: 500 },
    )
  }
}
