// app/api/cron/sync-boutique/route.ts
// Sync catalogue depuis Google Sheets → Firestore catalogue_boutique
// Colonnes attendues : A=Nom  B=Prix(FCFA)  C=Description  D=Image URL  E=URL fiche  F=Actif(oui/non)
// Une feuille = une catégorie de produits

import { NextResponse } from 'next/server'
import { google } from 'googleapis'
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

async function syncFromSheets(): Promise<{ produits: ProduitSheet[]; categories: string[]; errors: string[] }> {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const spreadsheetId = process.env.GOOGLE_SHEETS_BOUTIQUE_ID

  if (!clientEmail || !privateKey || !spreadsheetId) {
    throw new Error('Variables GOOGLE_SHEETS_* manquantes — configurer dans Vercel')
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
  const api = google.sheets({ version: 'v4', auth })

  // Récupérer les noms de toutes les feuilles
  const meta = await api.spreadsheets.get({ spreadsheetId })
  const sheetNames = (meta.data.sheets ?? [])
    .map(s => s.properties?.title ?? '')
    .filter(Boolean)

  if (sheetNames.length === 0) throw new Error('Aucune feuille trouvée dans le Google Sheet')

  const produits: ProduitSheet[] = []
  const categories: string[] = []
  const errors: string[] = []
  const now = Timestamp.now()

  for (const sheetName of sheetNames) {
    try {
      const resp = await api.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:F`,
      })

      const rows = resp.data.values ?? []
      if (rows.length < 2) continue // Vide ou entête seul

      // Vérification structure : ligne 1 doit contenir un champ "nom/name/produit"
      const headers = rows[0].map((h: unknown) => String(h).toLowerCase())
      if (!headers.some(h => /nom|name|produit/.test(h))) {
        errors.push(`Feuille "${sheetName}" : structure inattendue — headers : ${headers.join(', ')}`)
        continue
      }

      categories.push(sheetName)

      for (const row of rows.slice(1)) {
        const nom = String(row[0] ?? '').trim()
        if (!nom || nom.length < 2) continue

        // Colonne F : actif (oui/non/true/false/1/0) — défaut oui
        const actifVal = String(row[5] ?? 'oui').toLowerCase()
        if (['non', 'false', '0', 'no'].includes(actifVal)) continue

        const id = slugify(nom)
        if (!id) continue

        produits.push({
          id, nom,
          prix: parsePrix(String(row[1] ?? '0')),
          description: String(row[2] ?? '').trim().slice(0, 300),
          image_url: String(row[3] ?? '').trim(),
          url_fiche: String(row[4] ?? '').trim(),
          categorie: sheetName,
          source: 'BOUTIQUE',
          actif: true,
          synced_at: now,
        })
      }
    } catch (e) {
      errors.push(`Feuille "${sheetName}" : ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return { produits, categories, errors }
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { produits, categories, errors } = await syncFromSheets()

    if (produits.length === 0) {
      return NextResponse.json({ synced: 0, categories, errors })
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

    return NextResponse.json({ synced: produits.length, categories, errors })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[sync-boutique] erreur:', msg)
    return NextResponse.json({ synced: 0, categories: [], errors: [msg] })
  }
}
