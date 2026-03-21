// app/api/cron/sync-boutique/route.ts
// Sync catalogue depuis Google Sheets (CSV public) → Firestore catalogue_boutique

import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export async function GET() {
  const SHEET_ID = process.env.GOOGLE_SHEETS_BOUTIQUE_ID

  if (!SHEET_ID) {
    return NextResponse.json({
      success: false,
      error: 'Variables GOOGLE_SHEETS_* manquantes — configurer dans Vercel'
    })
  }

  try {
    const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`
    const response = await fetch(CSV_URL, {
      next: { revalidate: 0 }
    })

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Sheet inaccessible (${response.status}) — vérifier partage public`
      })
    }

    const csvText = await response.text()
    const lines = csvText.split('\n').filter(l => l.trim())

    if (lines.length < 2) {
      return NextResponse.json({ success: false, error: 'Sheet vide' })
    }

    const headers = lines[0].split(',').map(h =>
      h.trim().replace(/^"|"$/g, '')
    )

    const indexNom   = headers.findIndex(h => h.toLowerCase().includes('nom'))
    const indexDesc  = headers.findIndex(h =>
      h.toLowerCase().includes('description') && !h.toLowerCase().includes('long')
    )
    const indexPrix  = headers.findIndex(h => h.toLowerCase().includes('prix'))
    const indexCat   = headers.findIndex(h => h.toLowerCase().includes('cat'))
    const indexImage = headers.findIndex(h => h.toLowerCase().includes('image'))
    const indexActif = headers.findIndex(h => h.toLowerCase().includes('actif'))

    let synced = 0
    const batch = db.batch()

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c =>
        c.trim().replace(/^"|"$/g, '')
      )

      const actif = cols[indexActif]?.toUpperCase()
      if (actif !== 'OUI') continue

      const nom = cols[indexNom] || ''
      if (!nom) continue

      const slug = nom.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

      if (!slug) continue

      const ref = db.collection('catalogue_boutique').doc(slug)
      batch.set(ref, {
        id: slug,
        nom,
        description: indexDesc >= 0 ? (cols[indexDesc] || '') : '',
        prix: indexPrix >= 0 ? parseInt(cols[indexPrix]?.replace(/\D/g, '') || '0', 10) : 0,
        categorie: indexCat >= 0 ? (cols[indexCat] || 'boutique') : 'boutique',
        image_url: indexImage >= 0 ? (cols[indexImage] || '') : '',
        source: 'BOUTIQUE',
        actif: true,
        synced_at: FieldValue.serverTimestamp(),
      }, { merge: true })

      synced++
    }

    await batch.commit()

    return NextResponse.json({ success: true, synced })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[sync-boutique] erreur:', msg)
    return NextResponse.json({ success: false, error: msg })
  }
}
