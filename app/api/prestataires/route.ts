import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const db = getDb()
    const { searchParams } = new URL(request.url)
    const categorie = searchParams.get('categorie')

    let query = db.collection('prestataires').where('statut', '==', 'actif') as any

    const snap = await query.get()
    let prestataires = snap.docs.map((d: any) => {
      const data = d.data()
      return {
        id: d.id,
        nom: data.nom ?? '',
        slogan: data.slogan ?? '',
        categorie: data.categorie ?? '',
        description: data.description ?? '',
        contact: data.contact ?? {},
        services: data.services ?? [],
        portfolio: data.portfolio ?? [],
        note_moyenne: data.note_moyenne ?? 0,
        nb_avis: data.nb_avis ?? 0,
        nb_bookings: data.nb_bookings ?? 0,
        certifie: data.certifie ?? false,
        mis_en_avant: data.mis_en_avant ?? false,
        ordre_affichage: data.ordre_affichage ?? 99,
      }
    })

    if (categorie && categorie !== 'tous') {
      prestataires = prestataires.filter((p: any) => p.categorie === categorie)
    }

    prestataires.sort((a: any, b: any) => {
      if (a.mis_en_avant && !b.mis_en_avant) return -1
      if (!a.mis_en_avant && b.mis_en_avant) return 1
      if (a.certifie && !b.certifie) return -1
      if (!a.certifie && b.certifie) return 1
      return a.ordre_affichage - b.ordre_affichage
    })

    return NextResponse.json({ prestataires, total: prestataires.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
