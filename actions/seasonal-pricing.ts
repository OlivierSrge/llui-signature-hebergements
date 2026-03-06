'use server'

import { db } from '@/lib/firebase'
import { revalidatePath } from 'next/cache'
import type { SeasonalPricing } from '@/lib/types'

type ActionResult = { success: true } | { success: false; error: string }

export async function getSeasonalPricing(accommodationId: string): Promise<SeasonalPricing[]> {
  const snap = await db
    .collection('hebergements')
    .doc(accommodationId)
    .collection('seasonal_pricing')
    .orderBy('start_date', 'asc')
    .get()
  return snap.docs.map((d) => ({ id: d.id, accommodation_id: accommodationId, ...d.data() })) as SeasonalPricing[]
}

export async function addSeasonalPricing(
  accommodationId: string,
  data: {
    label: string
    start_date: string
    end_date: string
    price_per_night: number
  }
): Promise<ActionResult> {
  try {
    if (data.start_date >= data.end_date) {
      return { success: false, error: 'La date de fin doit être postérieure à la date de début' }
    }
    await db
      .collection('hebergements')
      .doc(accommodationId)
      .collection('seasonal_pricing')
      .add({
        ...data,
        price_per_night: Number(data.price_per_night),
        created_at: new Date().toISOString(),
      })
    revalidatePath(`/admin/hebergements/${accommodationId}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteSeasonalPricing(
  accommodationId: string,
  periodId: string
): Promise<ActionResult> {
  try {
    await db
      .collection('hebergements')
      .doc(accommodationId)
      .collection('seasonal_pricing')
      .doc(periodId)
      .delete()
    revalidatePath(`/admin/hebergements/${accommodationId}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ============================================================
// Calcul du prix applicable selon les dates
// ============================================================
export async function getApplicablePrice(
  accommodationId: string,
  basePrice: number,
  checkIn: string,
  checkOut: string
): Promise<{ price: number; label: string | null }> {
  try {
    const periods = await getSeasonalPricing(accommodationId)
    if (periods.length === 0) return { price: basePrice, label: null }

    // Trouver la période qui couvre le check_in
    const applicable = periods.find(
      (p) => checkIn >= p.start_date && checkIn < p.end_date
    )

    if (applicable) {
      return { price: applicable.price_per_night, label: applicable.label }
    }

    return { price: basePrice, label: null }
  } catch {
    return { price: basePrice, label: null }
  }
}
