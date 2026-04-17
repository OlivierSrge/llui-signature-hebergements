// app/api/admin/debug-session/route.ts
// Diagnostic : retourne les données brutes Firestore pour un code session + son partenaire.
// Usage : GET /api/admin/debug-session?code=XXXXX&key=ADMIN_API_KEY

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')
  if (!process.env.ADMIN_API_KEY || key !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const code = req.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.json({ error: 'Paramètre ?code= requis' }, { status: 400 })

  // 1. Lire le code session
  const sessionSnap = await db.collection('codes_sessions').doc(code).get()
  if (!sessionSnap.exists) {
    return NextResponse.json({ error: `Code "${code}" introuvable dans codes_sessions` }, { status: 404 })
  }

  const sessionData = sessionSnap.data()!
  const pid = sessionData.prescripteur_partenaire_id as string | undefined

  // 2. Lire le partenaire lié
  let partenaireData: Record<string, unknown> | null = null
  let partenaireExists = false

  if (pid) {
    const partSnap = await db.collection('prescripteurs_partenaires').doc(pid).get()
    partenaireExists = partSnap.exists
    if (partSnap.exists) {
      const p = partSnap.data()!
      // On renvoie uniquement les champs pertinents (pas les stats longues)
      partenaireData = {
        id: partSnap.id,
        nom_etablissement: p.nom_etablissement,
        statut: p.statut,
        subscriptionLevel: p.subscriptionLevel,
        carouselImages: p.carouselImages,
        defaultImage: p.defaultImage,
        photoUrl: p.photoUrl,
        forfait_statut: p.forfait_statut,
        forfait_expire_at: p.forfait_expire_at,
      }
    }
  }

  return NextResponse.json({
    code,
    env: {
      hasAdminApiKey: !!process.env.ADMIN_API_KEY,
      hasTwilioSid: !!process.env.TWILIO_ACCOUNT_SID,
      hasTwilioToken: !!process.env.TWILIO_AUTH_TOKEN,
      hasTwilioNumber: !!process.env.TWILIO_WHATSAPP_NUMBER,
      hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
      nodeEnv: process.env.NODE_ENV,
    },
    session: {
      prescripteur_partenaire_id: sessionData.prescripteur_partenaire_id,
      nom_partenaire: sessionData.nom_partenaire,
      statut: sessionData.statut,
      expire_at: sessionData.expire_at,
      nb_utilisations: sessionData.nb_utilisations,
      max_utilisations: sessionData.max_utilisations,
    },
    partenaire: {
      pid_dans_session: pid ?? '⚠️ ABSENT',
      doc_existe: partenaireExists,
      ...partenaireData,
    },
    diagnostic: {
      has_pid: !!pid,
      partenaire_trouve: partenaireExists,
      subscription_premium: partenaireData?.subscriptionLevel === 'premium',
      carousel_count: Array.isArray(partenaireData?.carouselImages)
        ? (partenaireData.carouselImages as string[]).filter(Boolean).length
        : 0,
      affichage_prevu: (() => {
        const isPremium = partenaireData?.subscriptionLevel === 'premium'
        const nbSlides = Array.isArray(partenaireData?.carouselImages)
          ? (partenaireData.carouselImages as string[]).filter(Boolean).length
          : 0
        if (isPremium && nbSlides > 0) return '✅ CARROUSEL affiché'
        if (partenaireData?.defaultImage) return '🖼️ IMAGE UNIQUE affichée'
        if (partenaireData?.photoUrl) return '👤 LOGO seul affiché'
        return '❌ RIEN — aucune image configurée ou subscriptionLevel != premium'
      })(),
    },
  })
}
