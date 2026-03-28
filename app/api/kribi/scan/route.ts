// app/api/kribi/scan/route.ts
// Incrémente le compteur de scans de la page /kribi

import { NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const db = getDb()
    const now = new Date()
    const moisKey = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`

    await db
      .collection('stats_kribi')
      .doc('page_kribi')
      .set(
        {
          scans_total: FieldValue.increment(1),
          [`scans_${moisKey}`]: FieldValue.increment(1),
          derniere_visite: now.toISOString(),
        },
        { merge: true }
      )

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

export async function GET() {
  try {
    const db = getDb()
    const now = new Date()
    const moisKey = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`

    const doc = await db.collection('stats_kribi').doc('page_kribi').get()
    const data = doc.data() ?? {}

    const abSnap = await db.collection('abonnes_newsletter').where('source', '==', 'page_kribi').get()

    return NextResponse.json({
      scans_total: data.scans_total ?? 0,
      scans_ce_mois: data[`scans_${moisKey}`] ?? 0,
      abonnes: abSnap.size,
    })
  } catch {
    return NextResponse.json({ scans_total: 0, scans_ce_mois: 0, abonnes: 0 })
  }
}
