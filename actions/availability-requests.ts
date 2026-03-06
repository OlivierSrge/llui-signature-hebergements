'use server'

import { db } from '@/lib/firebase'
import { revalidatePath } from 'next/cache'

type ActionResult = { success: true; requestId: string } | { success: false; error: string }

export async function createAvailabilityRequest(formData: {
  product_type: 'hebergement' | 'pack'
  product_id: string
  product_name: string
  guest_first_name: string
  guest_last_name: string
  guest_phone: string
  guest_email: string
  check_in: string
  check_out: string
  guests: number
  message: string
}): Promise<ActionResult> {
  try {
    const now = new Date().toISOString()
    const docRef = db.collection('demandes_disponibilite').doc()
    await docRef.set({
      ...formData,
      status: 'en_attente',
      reservation_id: null,
      created_at: now,
      updated_at: now,
    })

    revalidatePath('/admin/reservations')
    revalidatePath('/admin')

    return { success: true, requestId: docRef.id }
  } catch (e: any) {
    return { success: false, error: e.message || 'Une erreur est survenue' }
  }
}

export async function getAvailabilityRequests(status?: string) {
  const snap = await db.collection('demandes_disponibilite').get()
  let requests = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a: any, b: any) => b.created_at?.localeCompare(a.created_at) || 0) as any[]

  if (status) {
    requests = requests.filter((r) => r.status === status)
  }
  return requests
}

export async function markRequestHandled(
  requestId: string,
  reservationId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection('demandes_disponibilite').doc(requestId).update({
      status: 'traitee',
      reservation_id: reservationId || null,
      updated_at: new Date().toISOString(),
    })
    revalidatePath('/admin/reservations')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function markRequestCancelled(requestId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection('demandes_disponibilite').doc(requestId).update({
      status: 'annulee',
      updated_at: new Date().toISOString(),
    })
    revalidatePath('/admin/reservations')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
