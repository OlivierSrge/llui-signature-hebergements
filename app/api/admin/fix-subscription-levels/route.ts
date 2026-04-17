// app/api/admin/fix-subscription-levels/route.ts
// Met subscriptionLevel='premium' sur tous les partenaires qui ont carouselImages non vides.
// Auth : GET /api/admin/fix-subscription-levels?key=ADMIN_API_KEY

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')
  if (!process.env.ADMIN_API_KEY || key !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const snap = await db.collection('prescripteurs_partenaires').get()
  const results: { id: string; nom: string; action: string; carouselCount: number }[] = []

  for (const doc of snap.docs) {
    const d = doc.data()
    const images = (d.carouselImages as string[] | undefined)?.filter(Boolean) ?? []
    const currentLevel = d.subscriptionLevel as string | undefined

    if (images.length > 0 && currentLevel !== 'premium') {
      await doc.ref.update({ subscriptionLevel: 'premium' })
      results.push({ id: doc.id, nom: d.nom_etablissement as string, action: 'premium', carouselCount: images.length })
    } else if (images.length === 0 && currentLevel === 'premium') {
      await doc.ref.update({ subscriptionLevel: 'free' })
      results.push({ id: doc.id, nom: d.nom_etablissement as string, action: 'free (carrousel vide)', carouselCount: 0 })
    } else {
      results.push({ id: doc.id, nom: d.nom_etablissement as string, action: 'ok (pas changé)', carouselCount: images.length })
    }
  }

  return NextResponse.json({ success: true, total: snap.size, corrections: results })
}
