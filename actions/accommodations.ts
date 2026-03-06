'use server'

import { db } from '@/lib/firebase'
import { generateSlug } from '@/lib/utils'
import { revalidatePath } from 'next/cache'

type ActionResult = { success: true; id?: string } | { success: false; error: string }

export async function createAccommodation(formData: FormData): Promise<ActionResult> {
  try {
    const name = formData.get('name') as string
    const images = (formData.get('images') as string)
      .split('\n').map((s) => s.trim()).filter(Boolean)
    const amenities = (formData.get('amenities') as string)
      .split('\n').map((s) => s.trim()).filter(Boolean)
    const partner_id = formData.get('partner_id') as string

    let partnerData: Record<string, unknown> = {}
    if (partner_id) {
      const partnerDoc = await db.collection('partenaires').doc(partner_id).get()
      partnerData = partnerDoc.data() || {}
    }

    const ratingsOverall = parseFloat(formData.get('ratings_overall') as string)
    const ratings = isNaN(ratingsOverall) ? null : {
      overall: ratingsOverall,
      count: parseInt(formData.get('ratings_count') as string) || 0,
      cleanliness: parseFloat(formData.get('ratings_cleanliness') as string) || ratingsOverall,
      accuracy: parseFloat(formData.get('ratings_accuracy') as string) || ratingsOverall,
      checkin: parseFloat(formData.get('ratings_checkin') as string) || ratingsOverall,
      communication: parseFloat(formData.get('ratings_communication') as string) || ratingsOverall,
      location: parseFloat(formData.get('ratings_location') as string) || ratingsOverall,
      value: parseFloat(formData.get('ratings_value') as string) || ratingsOverall,
    }

    const docRef = db.collection('hebergements').doc()
    await docRef.set({
      partner_id,
      partner: {
        name: partnerData.name || '',
        description: partnerData.description || null,
        address: partnerData.address || null,
      },
      name,
      slug: generateSlug(name),
      type: formData.get('type'),
      description: formData.get('description') || null,
      short_description: formData.get('short_description') || null,
      capacity: Number(formData.get('capacity')),
      bedrooms: Number(formData.get('bedrooms')),
      bathrooms: Number(formData.get('bathrooms')),
      price_per_night: Number(formData.get('price_per_night')),
      commission_rate: Number(formData.get('commission_rate')),
      location: formData.get('location') || null,
      images,
      amenities,
      ratings,
      featured: formData.get('featured') === 'true',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    revalidatePath('/admin/hebergements')
    revalidatePath('/')
    return { success: true, id: docRef.id }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur lors de la création' }
  }
}

export async function updateAccommodation(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const name = formData.get('name') as string
    const images = (formData.get('images') as string)
      .split('\n').map((s) => s.trim()).filter(Boolean)
    const amenities = (formData.get('amenities') as string)
      .split('\n').map((s) => s.trim()).filter(Boolean)
    const partner_id = formData.get('partner_id') as string

    let partnerData: Record<string, unknown> = {}
    if (partner_id) {
      const partnerDoc = await db.collection('partenaires').doc(partner_id).get()
      partnerData = partnerDoc.data() || {}
    }

    const ratingsOverall = parseFloat(formData.get('ratings_overall') as string)
    const ratings = isNaN(ratingsOverall) ? null : {
      overall: ratingsOverall,
      count: parseInt(formData.get('ratings_count') as string) || 0,
      cleanliness: parseFloat(formData.get('ratings_cleanliness') as string) || ratingsOverall,
      accuracy: parseFloat(formData.get('ratings_accuracy') as string) || ratingsOverall,
      checkin: parseFloat(formData.get('ratings_checkin') as string) || ratingsOverall,
      communication: parseFloat(formData.get('ratings_communication') as string) || ratingsOverall,
      location: parseFloat(formData.get('ratings_location') as string) || ratingsOverall,
      value: parseFloat(formData.get('ratings_value') as string) || ratingsOverall,
    }

    await db.collection('hebergements').doc(id).update({
      partner_id,
      partner: {
        name: partnerData.name || '',
        description: partnerData.description || null,
        address: partnerData.address || null,
      },
      name,
      slug: generateSlug(name),
      type: formData.get('type'),
      description: formData.get('description') || null,
      short_description: formData.get('short_description') || null,
      capacity: Number(formData.get('capacity')),
      bedrooms: Number(formData.get('bedrooms')),
      bathrooms: Number(formData.get('bathrooms')),
      price_per_night: Number(formData.get('price_per_night')),
      commission_rate: Number(formData.get('commission_rate')),
      location: formData.get('location') || null,
      images,
      amenities,
      ratings,
      featured: formData.get('featured') === 'true',
      status: formData.get('status') || 'active',
      updated_at: new Date().toISOString(),
    })

    revalidatePath('/admin/hebergements')
    revalidatePath(`/admin/hebergements/${id}`)
    revalidatePath('/')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur lors de la mise à jour' }
  }
}

export async function duplicateAccommodation(id: string): Promise<ActionResult> {
  try {
    const source = await db.collection('hebergements').doc(id).get()
    if (!source.exists) return { success: false, error: 'Hébergement introuvable' }

    const data = source.data() as Record<string, unknown>
    const newName = `${data.name} (copie)`
    const newDoc = db.collection('hebergements').doc()
    await newDoc.set({
      ...data,
      name: newName,
      slug: generateSlug(newName),
      status: 'inactive',
      featured: false,
      partner_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    revalidatePath('/admin/hebergements')
    return { success: true, id: newDoc.id }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur lors de la duplication' }
  }
}

export async function deleteAccommodation(id: string): Promise<ActionResult> {
  try {
    await db.collection('hebergements').doc(id).update({
      status: 'inactive',
      updated_at: new Date().toISOString(),
    })
    revalidatePath('/admin/hebergements')
    revalidatePath('/')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur lors de la suppression' }
  }
}

export async function activateAccommodation(id: string): Promise<ActionResult> {
  try {
    await db.collection('hebergements').doc(id).update({
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    revalidatePath('/admin/hebergements')
    revalidatePath('/')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || "Erreur lors de l'activation" }
  }
}

export async function updateAvailability(
  accommodationId: string,
  dates: { date: string; is_available: boolean }[]
): Promise<ActionResult> {
  try {
    const batch = db.batch()
    for (const { date, is_available } of dates) {
      const docId = `${accommodationId}_${date}`
      const ref = db.collection('disponibilites').doc(docId)
      if (is_available) {
        batch.delete(ref)
      } else {
        batch.set(ref, { accommodation_id: accommodationId, date, is_available: false })
      }
    }
    await batch.commit()
    revalidatePath(`/admin/hebergements/${accommodationId}/disponibilites`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur lors de la mise à jour des disponibilités' }
  }
}
