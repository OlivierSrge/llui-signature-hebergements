// app/api/test-popup/route.ts
// Vérifie les événements actifs dans evenements_kribi Firestore
// Usage : GET /api/test-popup

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { getEvenementsActifs } = await import('@/actions/evenements')
    const evenements = await getEvenementsActifs()
    return Response.json({
      count: evenements.length,
      evenements,
    })
  } catch (error) {
    return Response.json({
      error: (error as Error).message,
    })
  }
}
