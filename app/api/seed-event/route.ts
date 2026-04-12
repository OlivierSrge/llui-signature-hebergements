// app/api/seed-event/route.ts
// Injecte un événement test dans evenements_kribi Firestore
// Usage : GET /api/seed-event

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { db } = await import('@/lib/firebase')

    const ref = db.collection('evenements_kribi').doc()
    await ref.set({
      uid: ref.id,
      titre: 'Festival Bord de Mer',
      description: 'Musique live et gastronomie locale',
      date_debut: new Date(Date.now() + 86400000 * 3).toISOString(),
      date_fin: null,
      lieu: 'Plage des Cocotiers, Kribi',
      type: 'festival',
      emoji: '🏖️',
      actif: true,
      created_at: new Date().toISOString(),
      created_by: 'system',
    })

    return Response.json({
      success: true,
      message: 'Événement test créé dans Firestore',
      id: ref.id,
    })
  } catch (error) {
    return Response.json({
      success: false,
      error: (error as Error).message,
    })
  }
}

