// app/api/cron/sync-boutique/route.ts
// Sync catalogue depuis Google Sheets (CSV public) → Firestore catalogue_boutique
// Colonnes attendues : Nom | Prix(FCFA) | Description | Image URL | URL fiche | Actif(OUI/NON)

import { NextResponse } from 'next/server'
import Papa from 'papaparse'
import { getDb } from '@/lib/firebase'
import { Timestamp } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

function slugify(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
}

function parsePrix(txt: string): number {
  const m = txt.replace(/[\s\u00a0]/g, '').match(/\d[\d,.]*/)
  if (!m) return 0
  return parseInt(m[0].replace(/[.,]/g, '').slice(0, 9), 10) || 0
}

interface ProduitSheet {
  id: string; nom: string; prix: number; description: string
  image_url: string; url_fiche: string; categorie: string
  source: 'BOUTIQUE'; actif: boolean; synced_at: Timestamp
}

async function syncFromCSV(): Promise<{ produits: ProduitSheet[]; errors: string[] }> {
  const sheetId = process.env.GOOGLE_SHEETS_BOUTIQUE_ID
  if (!sheetId) throw new Error('Variable GOOGLE_SHEETS_BOUTIQUE_ID manquante — configurer dans Vercel')

  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`

  const response = await fetch(csvUrl)
  if (!response.ok) throw new Error(`Fetch CSV échoué : ${response.status} ${response.statusText}`)

  const csvText = await response.text()

  const { data, errors: parseErrors } = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  const errors: string[] = parseErrors.map(e => `Parse CSV : ${e.message}`)
  const produits: ProduitSheet[] = []
  const now = Timestamp.now()

  for (const row of data) {
    const actifVal = (row['Actif'] ?? row['actif'] ?? 'OUI').trim().toUpperCase()
    if (actifVal !== 'OUI') continue

    const nom = (row['Nom'] ?? row['nom'] ?? '').trim()
    if (!nom || nom.length < 2) continue

    const id = slugify(nom)
    if (!id) continue

    produits.push({
      id,
      nom,
      prix: parsePrix(row['Prix(FCFA)'] ?? row['Prix'] ?? row['prix'] ?? '0'),
      description: (row['Description'] ?? row['description'] ?? '').trim().slice(0, 300),
      image_url: (row['Image URL'] ?? row['image_url'] ?? '').trim(),
      url_fiche: (row['URL fiche'] ?? row['url_fiche'] ?? '').trim(),
      categorie: 'boutique',
      source: 'BOUTIQUE',
      actif: true,
      synced_at: now,
    })
  }

  return { produits, errors }
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { produits, errors } = await syncFromCSV()

    if (produits.length === 0) {
      return NextResponse.json({ synced: 0, errors })
    }

    const db = getDb()
    const col = db.collection('catalogue_boutique')

    // Marquer tous les produits BOUTIQUE existants inactifs
    const existing = await col.where('source', '==', 'BOUTIQUE').get()
    const b1 = db.batch()
    existing.docs.forEach(d => b1.update(d.ref, { actif: false }))
    await b1.commit()

    // Upsert des produits du sheet
    const b2 = db.batch()
    for (const p of produits) {
      b2.set(col.doc(p.id), p, { merge: true })
    }
    await b2.commit()

    return NextResponse.json({ synced: produits.length, errors })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[sync-boutique] erreur:', msg)
    return NextResponse.json({ synced: 0, errors: [msg] })
  }
}
