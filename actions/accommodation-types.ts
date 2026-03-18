'use server'

import { db } from '@/lib/firebase'
import { revalidatePath } from 'next/cache'
import type { AccommodationTypeInfo } from '@/lib/accommodationTypes'

export async function loadAccommodationTypesSettings(): Promise<AccommodationTypeInfo[]> {
  try {
    const doc = await db.collection('settings').doc('accommodationTypes').get()
    if (doc.exists) {
      const data = doc.data()
      if (Array.isArray(data?.types)) return data.types as AccommodationTypeInfo[]
    }
  } catch { /* fallback to defaults */ }
  return []
}

export async function saveAccommodationTypesSettings(
  types: AccommodationTypeInfo[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection('settings').doc('accommodationTypes').set({
      types,
      updatedAt: new Date().toISOString(),
    })
    revalidatePath('/admin/parametres-paiement')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur lors de la sauvegarde' }
  }
}
