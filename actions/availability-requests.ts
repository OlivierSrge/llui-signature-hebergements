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
  promo_code?: string
  promo_discount?: number
}): Promise<ActionResult> {
  try {
    const now = new Date().toISOString()

    // Résoudre le partenaire propriétaire du logement
    let routedToPartnerId: string | null = null
    if (formData.product_type === 'hebergement' && formData.product_id) {
      const accDoc = await db.collection('hebergements').doc(formData.product_id).get()
      if (accDoc.exists && accDoc.data()?.partner_id) {
        routedToPartnerId = accDoc.data()!.partner_id
      }
    }

    const docRef = db.collection('demandes_disponibilite').doc()
    await docRef.set({
      ...formData,
      status: 'en_attente',
      reservation_id: null,
      // Routage partenaire
      routed_to_partner_id: routedToPartnerId,
      routed_to_partner_at: routedToPartnerId ? now : null,
      // Prise en charge
      handled_by: null,       // 'admin' | 'partner' | null
      handled_at: null,
      handled_by_id: null,
      created_at: now,
      updated_at: now,
    })

    revalidatePath('/admin/reservations')
    revalidatePath('/admin')
    revalidatePath('/admin/demandes')
    if (routedToPartnerId) {
      revalidatePath('/partenaire/dashboard')
      revalidatePath('/partenaire/demandes')
    }

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

/** Demandes non encore prises en charge pour un partenaire donné */
export async function getPartnerPendingDemands(accommodationIds: string[]) {
  if (accommodationIds.length === 0) return []
  const chunks: string[][] = []
  for (let i = 0; i < accommodationIds.length; i += 10) chunks.push(accommodationIds.slice(i, i + 10))
  const results: any[] = []
  for (const chunk of chunks) {
    const snap = await db.collection('demandes_disponibilite')
      .where('product_id', 'in', chunk)
      .where('status', '==', 'en_attente')
      .get()
    snap.docs.forEach((d) => results.push({ id: d.id, ...d.data() }))
  }
  // Seulement celles pas encore prises en charge
  return results
    .filter((r: any) => r.handled_by === null || r.handled_by === undefined)
    .sort((a: any, b: any) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
}

export async function markRequestHandled(
  requestId: string,
  reservationId?: string,
  adminId: string = 'admin'
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString()
    const docRef = db.collection('demandes_disponibilite').doc(requestId)
    const doc = await docRef.get()
    const data = doc.exists ? doc.data() : null

    let delaiTraitement: number | null = null
    if (data?.created_at) {
      delaiTraitement = Math.round((new Date(now).getTime() - new Date(data.created_at).getTime()) / 60000)
    }

    await docRef.update({
      status: 'traitee',
      reservation_id: reservationId || null,
      handled_by: 'admin',
      handled_at: now,
      treatedAt: now,
      treatedBy: 'admin',
      treatedById: adminId,
      reservationId: reservationId || null,
      delaiTraitement,
      updated_at: now,
    })
    revalidatePath('/admin/reservations')
    revalidatePath('/admin/demandes')
    revalidatePath('/admin')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function markRequestHandledByPartner(
  requestId: string,
  partnerId: string,
  reservationId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString()
    const docRef = db.collection('demandes_disponibilite').doc(requestId)
    const doc = await docRef.get()
    const data = doc.exists ? doc.data() : null

    let delaiTraitement: number | null = null
    if (data?.created_at) {
      delaiTraitement = Math.round((new Date(now).getTime() - new Date(data.created_at).getTime()) / 60000)
    }

    await docRef.update({
      status: 'traitee',
      reservation_id: reservationId || null,
      handled_by: 'partner',
      handled_at: now,
      handled_by_id: partnerId,
      treatedAt: now,
      treatedBy: 'partner',
      treatedById: partnerId,
      reservationId: reservationId || null,
      delaiTraitement,
      updated_at: now,
    })
    revalidatePath('/admin/demandes')
    revalidatePath('/admin')
    revalidatePath('/partenaire/dashboard')
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
    revalidatePath('/admin/demandes')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
