// app/api/vitrine/route.ts
// API publique — retourne les images carrousel pour un partenaire
// Consommée par la boutique Netlify via ?code=XXXXXX ou ?uid=XXXXXX
//
// Réponse :
// {
//   subscriptionLevel: 'free' | 'premium'
//   images: string[]       // URLs à afficher dans le carrousel
//   nom_etablissement: string
//   defaultImage: string | null
// }

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

// CORS ouvert — la boutique Netlify est sur un domaine différent
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')?.trim()
  const uid  = searchParams.get('uid')?.trim()

  if (!code && !uid) {
    return NextResponse.json(
      { error: 'Paramètre code ou uid requis' },
      { status: 400, headers: CORS }
    )
  }

  try {
    let snap: FirebaseFirestore.DocumentSnapshot | null = null

    if (uid) {
      // Lookup direct par doc ID
      snap = await db.collection('prescripteurs_partenaires').doc(uid).get()
      if (!snap.exists) snap = null
    }

    if (!snap && code) {
      // Lookup par codes_sessions → prescripteur_partenaire_id
      const sessionSnap = await db.collection('codes_sessions').doc(code).get()
      if (sessionSnap.exists) {
        const prescId = sessionSnap.data()!.prescripteur_partenaire_id as string
        snap = await db.collection('prescripteurs_partenaires').doc(prescId).get()
        if (!snap.exists) snap = null
      }

      // Fallback : lookup par code_promo_affilie
      if (!snap) {
        const fbSnap = await db.collection('prescripteurs_partenaires')
          .where('code_promo_affilie', '==', code)
          .limit(1)
          .get()
        if (!fbSnap.empty) snap = fbSnap.docs[0]
      }
    }

    if (!snap) {
      return NextResponse.json(
        { error: 'Partenaire introuvable' },
        { status: 404, headers: CORS }
      )
    }

    const data = snap.data()!
    const level = (data.subscriptionLevel as string) ?? 'free'
    const defaultImage = (data.defaultImage as string) ?? null
    const carouselImages = (data.carouselImages as string[]) ?? []

    // Logique carrousel
    let images: string[]
    if (level === 'premium' && carouselImages.length > 0) {
      images = carouselImages.slice(0, 5)
    } else {
      images = defaultImage ? [defaultImage] : []
    }

    return NextResponse.json({
      subscriptionLevel: level,
      images,
      nom_etablissement: data.nom_etablissement as string,
      defaultImage,
      photoUrl: (data.photoUrl as string) ?? null,
    }, { headers: CORS })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[api/vitrine] erreur:', msg)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: CORS }
    )
  }
}
