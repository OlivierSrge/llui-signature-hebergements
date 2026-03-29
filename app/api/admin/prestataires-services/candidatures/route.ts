import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

function isAdmin(): boolean {
  const cookieStore = cookies()
  const session = cookieStore.get('admin_session')?.value
  return !!(session && session === process.env.ADMIN_SESSION_TOKEN)
}

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  try {
    const db = getDb()
    const snap = await db.collection('demandes_prestataires').orderBy('created_at', 'desc').limit(50).get()
    const candidatures = snap.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        ...data,
        created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : data.created_at,
      }
    })
    return NextResponse.json({ candidatures })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH — changer statut (accepte/refuse) ou valider vers prestataires
export async function PATCH(request: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  try {
    const db = getDb()
    const { id, statut, creer_prestataire } = await request.json()

    await db.collection('demandes_prestataires').doc(id).update({ statut, updated_at: new Date() })

    // Si on valide → créer automatiquement le document prestataire
    if (creer_prestataire && statut === 'accepte') {
      const candDoc = await db.collection('demandes_prestataires').doc(id).get()
      const cand = candDoc.data()!
      const ref = db.collection('prestataires').doc()
      await ref.set({
        nom: cand.nom,
        slogan: '',
        categorie: cand.categorie,
        description: cand.description ?? '',
        contact: {
          telephone: cand.telephone,
          whatsapp: cand.whatsapp ?? cand.telephone,
          localisation: cand.localisation ?? 'Kribi',
        },
        services: [],
        portfolio: (cand.portfolio_urls ?? []).map((url: string) => ({ url, legende: '', type: 'image' })),
        note_moyenne: 0,
        nb_avis: 0,
        nb_bookings: 0,
        commission_taux: 10,
        statut: 'actif',
        certifie: false,
        mis_en_avant: false,
        ordre_affichage: 99,
        created_at: new Date(),
        updated_at: new Date(),
      })
      return NextResponse.json({ success: true, prestataire_id: ref.id })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
