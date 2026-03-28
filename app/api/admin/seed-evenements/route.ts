// app/api/admin/seed-evenements/route.ts
// Endpoint one-shot : insère les événements Kribi récurrents dans Firestore
// Protégé par session admin — à appeler une seule fois

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

function checkAdminAuth(request: NextRequest): boolean {
  const session = request.cookies.get('admin_session')?.value
  return !!(session && session === process.env.ADMIN_SESSION_TOKEN)
}

// Weekend de référence : samedi 28 mars 2026
const SAM = '2026-03-28'
const DIM = '2026-03-29'

const EVENEMENTS_KRIBI = [
  {
    titre: 'Excursion pirogue — Chutes de la Lobé',
    description: 'Les chutes de la Lobé se jettent directement dans l\'océan Atlantique, un spectacle unique en Afrique. Excursion en pirogue avec guide local.',
    categorie: 'nature',
    date_debut: `${SAM}T08:00:00.000Z`,
    date_fin: `${SAM}T12:00:00.000Z`,
    heure: '8h00',
    lieu: 'Chutes de la Lobé, 5 km sud de Kribi',
    prix: 5000,
    image_url: '',
    hebergements_associes: [],
    actif: true,
    recurrent: true,
    jour_recurrence: 'samedi',
    source: 'https://www.tripadvisor.com/Attraction_Review-g482840-d3405769',
  },
  {
    titre: 'Excursion village de pêcheurs de Londji',
    description: 'Découverte du village traditionnel de pêcheurs de Londji : pirogue en mangrove, marché aux poissons frais, rencontre avec les habitants.',
    categorie: 'nature',
    date_debut: `${DIM}T08:00:00.000Z`,
    date_fin: `${DIM}T12:00:00.000Z`,
    heure: '8h00',
    lieu: 'Village de Londji, 20 km nord de Kribi',
    prix: 0,
    image_url: '',
    hebergements_associes: [],
    actif: true,
    recurrent: true,
    jour_recurrence: 'dimanche',
    source: 'https://www.petitfute.co.uk/v46041-kribi',
  },
  {
    titre: 'Plage & poisson braisé à Grand Batanga',
    description: 'Baignade, grillades de poissons et fruits de mer frais sur la plage de Grand Batanga. Observation possible de tortues marines selon saison.',
    categorie: 'gastronomie',
    date_debut: `${DIM}T10:00:00.000Z`,
    date_fin: `${DIM}T17:00:00.000Z`,
    heure: '10h00',
    lieu: 'Plage de Grand Batanga, 8 km sud de Kribi',
    prix: 0,
    image_url: '',
    hebergements_associes: [],
    actif: true,
    recurrent: true,
    jour_recurrence: 'dimanche',
    source: 'https://grandbatangaecotourisme.wordpress.com/',
  },
  {
    titre: 'Soirée folklorique & grillades — Kribi Lodge',
    description: 'Soirée récurrente chaque samedi au Kribi Lodge : ambiance folklorique, grillades, musique live au bord de l\'Atlantique.',
    categorie: 'nightlife',
    date_debut: `${SAM}T19:00:00.000Z`,
    date_fin: `${SAM}T23:59:00.000Z`,
    heure: '19h00',
    lieu: 'Kribi Lodge, Kribi',
    prix: 0,
    image_url: '',
    hebergements_associes: [],
    actif: true,
    recurrent: true,
    jour_recurrence: 'samedi',
    source: 'https://www.kribi-lodge.com/',
  },
  {
    titre: 'Soirée afro — Java Night Club',
    description: 'Soirée afro-européenne chaque samedi au Java Night Club 5 Étoiles de Kribi. Musique afrobeat, ambiance festive.',
    categorie: 'nightlife',
    date_debut: `${SAM}T22:00:00.000Z`,
    date_fin: `${DIM}T04:00:00.000Z`,
    heure: '22h00',
    lieu: 'Java Night Club, Kribi',
    prix: 0,
    image_url: '',
    hebergements_associes: [],
    actif: true,
    recurrent: true,
    jour_recurrence: 'samedi',
    source: 'https://www.facebook.com/JavaNightClubKRIBI/',
  },
  {
    titre: 'Soirée à thème — Jem\'s Club',
    description: 'Soirées à thème chaque samedi au Jem\'s Club avec musiciens invités et ambiance festive au cœur de Kribi.',
    categorie: 'nightlife',
    date_debut: `${SAM}T21:00:00.000Z`,
    date_fin: `${DIM}T04:00:00.000Z`,
    heure: '21h00',
    lieu: "Jem's Club, Kribi",
    prix: 0,
    image_url: '',
    hebergements_associes: [],
    actif: true,
    recurrent: true,
    jour_recurrence: 'samedi',
    source: 'https://www.petitfute.co.uk/v46041-kribi',
  },
  {
    titre: 'Bar dansant — Bristol Palace',
    description: 'Bar dancing et snack chaque samedi soir au Bristol Palace, Quartier Petit Paris. Ambiance décontractée.',
    categorie: 'nightlife',
    date_debut: `${SAM}T21:30:00.000Z`,
    date_fin: `${DIM}T03:00:00.000Z`,
    heure: '21h30',
    lieu: 'Bristol Palace, Quartier Petit Paris, Kribi',
    prix: 0,
    image_url: '',
    hebergements_associes: [],
    actif: true,
    recurrent: true,
    jour_recurrence: 'samedi',
    source: 'https://www.petitfute.com/v46041-kribi',
  },
]

export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getDb()

  try {
    // Vérifier si des événements existent déjà (éviter les doublons)
    const existing = await db.collection('evenements_kribi').get()
    if (existing.size > 0) {
      return NextResponse.json({
        skipped: true,
        message: `${existing.size} événements existent déjà. Seed ignoré pour éviter les doublons.`,
        tip: 'Utilisez force=true pour forcer la réinsertion.',
      })
    }

    const body = await request.json().catch(() => ({}))
    const force = body.force === true

    if (existing.size > 0 && !force) {
      return NextResponse.json({
        skipped: true,
        message: `${existing.size} événements existent déjà. Envoyez { force: true } pour réinsérer.`,
      })
    }

    const batch = db.batch()
    const ids: string[] = []

    for (const ev of EVENEMENTS_KRIBI) {
      const ref = db.collection('evenements_kribi').doc()
      batch.set(ref, {
        ...ev,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      ids.push(ref.id)
    }

    await batch.commit()

    return NextResponse.json({
      success: true,
      inserted: EVENEMENTS_KRIBI.length,
      ids,
      evenements: EVENEMENTS_KRIBI.map((e) => ({ titre: e.titre, categorie: e.categorie, jour: e.date_debut.startsWith(SAM) ? 'samedi' : 'dimanche' })),
      message: `${EVENEMENTS_KRIBI.length} événements insérés dans Firestore.`,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Prévisualisation sans insertion
  return NextResponse.json({
    preview: true,
    evenements: EVENEMENTS_KRIBI.map((e) => ({
      titre: e.titre,
      categorie: e.categorie,
      jour: e.date_debut.startsWith(SAM) ? 'samedi' : 'dimanche',
      heure: e.heure,
      lieu: e.lieu,
      prix: e.prix,
      recurrent: e.recurrent,
      source: e.source,
    })),
    message: 'Prévisualisation — POST pour insérer dans Firestore',
  })
}
