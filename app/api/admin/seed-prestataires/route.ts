import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'

const PRESTATAIRES = [
  {
    nom: 'Studio Kamer Photo',
    slogan: 'Vos moments, immortalisés à Kribi',
    categorie: 'photo_video',
    description: 'Studio de photographie et vidéo basé à Kribi. Spécialiste des reportages mariage, des séances famille sur la plage et des prises de vue par drone au-dessus des chutes de la Lobé.',
    contact: { telephone: '+237691000001', whatsapp: '+237691000001', localisation: 'Centre Kribi' },
    services: [
      { id: 's1', titre: 'Reportage mariage complet', description: 'Photos + vidéo 4K + album numérique', prix: 150000, unite: 'forfait', disponible: true },
      { id: 's2', titre: 'Séance famille plage', description: 'Séance photo 1h sur la plage de Kribi', prix: 35000, unite: 'forfait', disponible: true },
      { id: 's3', titre: 'Drone Kribi', description: 'Prise de vue aérienne par drone', prix: 50000, unite: 'forfait', disponible: true },
    ],
    portfolio: [],
    note_moyenne: 4.8,
    nb_avis: 12,
    nb_bookings: 34,
    commission_taux: 10,
    statut: 'actif',
    certifie: true,
    mis_en_avant: true,
    ordre_affichage: 1,
  },
  {
    nom: 'Salon Beauty Kribi',
    slogan: 'Sublimez votre beauté pour le grand jour',
    categorie: 'beaute_bienetre',
    description: 'Salon de coiffure et maquillage professionnel à Kribi. Spécialiste du maquillage de mariée et des mises en beauté pour les cérémonies.',
    contact: { telephone: '+237691000002', whatsapp: '+237691000002', localisation: 'Quartier Jeanne d\'Arc, Kribi' },
    services: [
      { id: 's1', titre: 'Coiffure mariée', description: 'Coiffure de cérémonie avec accessoires', prix: 25000, unite: 'forfait', disponible: true },
      { id: 's2', titre: 'Maquillage professionnel', description: 'Maquillage longue tenue', prix: 20000, unite: 'forfait', disponible: true },
      { id: 's3', titre: 'Forfait Beauté Jour J', description: 'Coiffure + maquillage + soins', prix: 40000, unite: 'forfait', disponible: true },
    ],
    portfolio: [],
    note_moyenne: 4.9,
    nb_avis: 27,
    nb_bookings: 52,
    commission_taux: 8,
    statut: 'actif',
    certifie: true,
    mis_en_avant: false,
    ordre_affichage: 2,
  },
  {
    nom: 'DJ Master Kribi',
    slogan: 'L\'ambiance qui fait danser Kribi',
    categorie: 'son_animation',
    description: 'DJ et technicien son & lumière professionnel à Kribi. Plus de 10 ans d\'expérience dans les mariages, soirées privées et événements d\'entreprise.',
    contact: { telephone: '+237691000003', whatsapp: '+237691000003', localisation: 'Kribi' },
    services: [
      { id: 's1', titre: 'Soirée mariage complète', description: 'DJ + sono + lumières + animation 8h', prix: 120000, unite: 'journee', disponible: true },
      { id: 's2', titre: 'Sono cocktail', description: 'Fond sonore pour cocktail 3h', prix: 50000, unite: 'forfait', disponible: true },
    ],
    portfolio: [],
    note_moyenne: 4.7,
    nb_avis: 18,
    nb_bookings: 41,
    commission_taux: 10,
    statut: 'actif',
    certifie: true,
    mis_en_avant: false,
    ordre_affichage: 3,
  },
  {
    nom: 'Décor Prestige Cameroun',
    slogan: 'Transformons votre rêve en réalité',
    categorie: 'decoration',
    description: 'Décoration événementielle haut de gamme à Kribi et dans tout le Cameroun. Spécialiste des mariages, réceptions et cérémonies traditionnelles.',
    contact: { telephone: '+237691000004', whatsapp: '+237691000004', localisation: 'Kribi' },
    services: [
      { id: 's1', titre: 'Décoration salle mariage', description: 'Décoration complète salle + extérieur', prix: 200000, unite: 'forfait', disponible: true },
      { id: 's2', titre: 'Centre de table', description: 'Composition florale par table', prix: 15000, unite: 'piece', disponible: true },
      { id: 's3', titre: 'Arche florale', description: 'Arche cérémonielle décorée', prix: 85000, unite: 'forfait', disponible: true },
    ],
    portfolio: [],
    note_moyenne: 4.6,
    nb_avis: 9,
    nb_bookings: 22,
    commission_taux: 10,
    statut: 'actif',
    certifie: true,
    mis_en_avant: false,
    ordre_affichage: 4,
  },
  {
    nom: 'Excursions Lobé Tours',
    slogan: 'Découvrez le vrai Kribi avec nous',
    categorie: 'experiences',
    description: 'Guides locaux spécialistes des excursions autour de Kribi. Pirogue aux chutes de la Lobé, visite des villages Bagyeli, pêche traditionnelle et randonnées en forêt.',
    contact: { telephone: '+237691000005', whatsapp: '+237691000005', localisation: 'Chutes de la Lobé, Kribi' },
    services: [
      { id: 's1', titre: 'Pirogue Chutes de la Lobé', description: 'Excursion 2h en pirogue aux chutes', prix: 5000, unite: 'personne', disponible: true },
      { id: 's2', titre: 'Visite village Bagyeli', description: 'Rencontre avec les peuples de la forêt', prix: 8000, unite: 'personne', disponible: true },
      { id: 's3', titre: 'Journée complète Kribi nature', description: 'Chutes + village + pêche + déjeuner local', prix: 25000, unite: 'personne', disponible: true },
    ],
    portfolio: [],
    note_moyenne: 4.5,
    nb_avis: 31,
    nb_bookings: 67,
    commission_taux: 15,
    statut: 'actif',
    certifie: false,
    mis_en_avant: false,
    ordre_affichage: 5,
  },
]

function isAdmin(req: NextRequest): boolean {
  const cookieStore = cookies()
  const session = cookieStore.get('admin_session')?.value
  return !!(session && session === process.env.ADMIN_SESSION_TOKEN)
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  return NextResponse.json({ prestataires: PRESTATAIRES, count: PRESTATAIRES.length })
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  try {
    const db = getDb()
    const batch = db.batch()
    for (const p of PRESTATAIRES) {
      const ref = db.collection('prestataires').doc()
      batch.set(ref, { ...p, created_at: new Date(), updated_at: new Date() })
    }
    await batch.commit()
    return NextResponse.json({ success: true, inserted: PRESTATAIRES.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
