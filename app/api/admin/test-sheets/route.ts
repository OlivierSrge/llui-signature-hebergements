// app/api/admin/test-sheets/route.ts
// GET — Teste la connexion Google Sheets et affiche le résultat de la sync
// Accessible depuis /admin (protégé par middleware admin)

import { NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'

    // Déclencher la sync Google Sheets
    const syncRes = await fetch(`${baseUrl}/api/cron/sync-boutique`, {
      headers: process.env.CRON_SECRET
        ? { Authorization: `Bearer ${process.env.CRON_SECRET}` }
        : {},
    })
    const syncData = await syncRes.json() as {
      synced?: number; categories?: string[]; errors?: string[]
    }

    // Récupérer 3 produits exemple depuis Firestore
    const db = getDb()
    const snap = await db.collection('catalogue_boutique')
      .where('actif', '==', true)
      .limit(3)
      .get()

    const sample_products = snap.docs.map(d => {
      const data = d.data()
      return { id: d.id, nom: data.nom, prix: data.prix, categorie: data.categorie }
    })

    const vars = {
      GOOGLE_SHEETS_CLIENT_EMAIL: process.env.GOOGLE_SHEETS_CLIENT_EMAIL ? '✅ défini' : '❌ manquant',
      GOOGLE_SHEETS_PRIVATE_KEY: process.env.GOOGLE_SHEETS_PRIVATE_KEY ? '✅ défini' : '❌ manquant',
      GOOGLE_SHEETS_BOUTIQUE_ID: process.env.GOOGLE_SHEETS_BOUTIQUE_ID ?? '❌ manquant',
    }

    return NextResponse.json({
      synced: syncData.synced ?? 0,
      categories: syncData.categories ?? [],
      errors: syncData.errors ?? [],
      sample_products,
      variables_vercel: vars,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
