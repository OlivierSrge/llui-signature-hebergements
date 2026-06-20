import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { serializeFirestoreDoc } from '@/lib/serialization'

export const dynamic = 'force-dynamic'

// GET /api/loyalty/marketplace?exclude=partenaireId
// Retourne tous les programmes ACTIVE avec les infos établissement
export async function GET(req: NextRequest) {
  try {
    const excludeId = req.nextUrl.searchParams.get('exclude') ?? ''

    const [progSnap, partSnap] = await Promise.all([
      // Inclure ACTIVE et DRAFT — seul PAUSED est masqué aux clients
      db.collection('loyalty_programs').get(),
      db.collection('prescripteurs_partenaires').where('statut', '==', 'actif').get(),
    ])

    // Index partenaires par uid
    const partMap = new Map<string, Record<string, unknown>>()
    for (const d of partSnap.docs) {
      partMap.set(d.id, d.data() as Record<string, unknown>)
    }

    const programs = progSnap.docs
      .filter((d) => d.data().statut !== 'PAUSED' && d.data().partenaire_id !== excludeId)
      .map((doc) => {
        const data = serializeFirestoreDoc(doc.data())
        const part = partMap.get(data.partenaire_id as string) ?? {}
        return {
          program_id: doc.id,
          ...data,
          etablissement_type: (part.type as string) ?? 'autre',
          partenaire_adresse: (part.adresse as string) ?? '',
          partenaire_photo: (part.photoUrl as string) ?? null,
        }
      })
      .filter((p) => (p.niveaux as unknown[])?.length > 0) // exclure programmes sans niveaux

    return NextResponse.json({ programs })
  } catch (err) {
    console.error('[loyalty/marketplace GET]', err)
    return NextResponse.json({ programs: [] })
  }
}
