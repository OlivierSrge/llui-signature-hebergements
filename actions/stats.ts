'use server'

import { db } from '@/lib/firebase'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { FieldValue } = require('firebase-admin/firestore')

export async function trackPageView(accommodationId: string) {
  const month = new Date().toISOString().substring(0, 7) // "2026-03"
  const docRef = db.collection('stats_views').doc(`${accommodationId}_${month}`)
  try {
    await docRef.set(
      {
        accommodation_id: accommodationId,
        month,
        count: FieldValue.increment(1),
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    )
  } catch {
    /* silently fail */
  }
}
