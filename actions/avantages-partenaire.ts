'use server'

import { db } from '@/lib/firebase'
import { serializeFirestoreDoc } from '@/lib/serialization'
import { FieldValue } from 'firebase-admin/firestore'
import { revalidatePath } from 'next/cache'
import type { AvantageStars } from '@/types/avantages-stars'

export type SaveAvantagesResult =
  | { success: true }
  | { success: false; error: string }

export type GetAvantagesResult = {
  avantages: AvantageStars[]
}

export async function getAvantagesPartenaire(partenaire_id: string): Promise<GetAvantagesResult> {
  try {
    const snap = await db.collection('prescripteurs_partenaires').doc(partenaire_id).get()
    if (!snap.exists) return { avantages: [] }
    const data = serializeFirestoreDoc(snap.data()!)
    const avantages = Array.isArray(data.avantages_stars) ? (data.avantages_stars as AvantageStars[]) : []
    return { avantages }
  } catch (e) {
    console.error('[getAvantagesPartenaire]', e)
    return { avantages: [] }
  }
}

export async function saveAvantagesPartenaire(
  partenaire_id: string,
  avantages: AvantageStars[],
): Promise<SaveAvantagesResult> {
  try {
    if (!partenaire_id) return { success: false, error: 'partenaire_id requis' }
    const actifs = avantages.filter((a) => a.actif)
    if (actifs.length > 20) return { success: false, error: 'Maximum 20 avantages actifs' }

    await db.collection('prescripteurs_partenaires').doc(partenaire_id).update({
      avantages_stars: avantages,
      avantages_updated_at: FieldValue.serverTimestamp(),
    })

    revalidatePath('/admin/prescripteurs-partenaires')
    return { success: true }
  } catch (e) {
    console.error('[saveAvantagesPartenaire]', e)
    return { success: false, error: e instanceof Error ? e.message : 'Erreur' }
  }
}

export async function getAvantagesPublicPartenaire(
  partenaire_id: string,
): Promise<AvantageStars[]> {
  try {
    const snap = await db.collection('prescripteurs_partenaires').doc(partenaire_id).get()
    if (!snap.exists) return []
    const data = serializeFirestoreDoc(snap.data()!)
    if (!Array.isArray(data.avantages_stars)) return []
    return (data.avantages_stars as AvantageStars[]).filter((a) => a.actif)
  } catch (e) {
    console.error('[getAvantagesPublicPartenaire]', e)
    return []
  }
}
