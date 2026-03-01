'use server'

import { db } from '@/lib/firebase'
import { generateSlug } from '@/lib/utils'
import { sendPackRequestEmail } from '@/lib/email'
import { revalidatePath } from 'next/cache'

type ActionResult = { success: true; id?: string } | { success: false; error: string }

export async function createPack(formData: FormData): Promise<ActionResult> {
  try {
    const name = formData.get('name') as string
    const accommodation_ids = (formData.get('accommodation_ids') as string)
      .split(',').map((s) => s.trim()).filter(Boolean)
    const images = (formData.get('images') as string)
      .split('\n').map((s) => s.trim()).filter(Boolean)

    const docRef = db.collection('packs').doc()
    await docRef.set({
      name,
      slug: generateSlug(name),
      pack_type: formData.get('pack_type'),
      short_description: formData.get('short_description') || '',
      description: formData.get('description') || null,
      accommodation_ids,
      images,
      featured: formData.get('featured') === 'true',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    revalidatePath('/admin/packs')
    revalidatePath('/packs')
    return { success: true, id: docRef.id }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur lors de la création' }
  }
}

export async function updatePack(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const name = formData.get('name') as string
    const accommodation_ids = (formData.get('accommodation_ids') as string)
      .split(',').map((s) => s.trim()).filter(Boolean)
    const images = (formData.get('images') as string)
      .split('\n').map((s) => s.trim()).filter(Boolean)

    await db.collection('packs').doc(id).update({
      name,
      slug: generateSlug(name),
      pack_type: formData.get('pack_type'),
      short_description: formData.get('short_description') || '',
      description: formData.get('description') || null,
      accommodation_ids,
      images,
      featured: formData.get('featured') === 'true',
      status: formData.get('status') || 'active',
      updated_at: new Date().toISOString(),
    })

    revalidatePath('/admin/packs')
    revalidatePath(`/admin/packs/${id}`)
    revalidatePath('/packs')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur lors de la mise à jour' }
  }
}

export async function deletePack(id: string): Promise<ActionResult> {
  try {
    await db.collection('packs').doc(id).update({
      status: 'inactive',
      updated_at: new Date().toISOString(),
    })
    revalidatePath('/admin/packs')
    revalidatePath('/packs')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur lors de la suppression' }
  }
}

export async function requestPack(formData: FormData): Promise<ActionResult> {
  try {
    const data = {
      pack_name: formData.get('pack_name') as string,
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      event_date: (formData.get('event_date') as string) || null,
      guests: formData.get('guests') ? Number(formData.get('guests')) : null,
      message: (formData.get('message') as string) || null,
      promo_code: (formData.get('promo_code') as string) || null,
    }

    await db.collection('pack_requests').add({
      ...data,
      status: 'nouveau',
      created_at: new Date().toISOString(),
    })

    await sendPackRequestEmail(data)

    revalidatePath('/admin')
    revalidatePath('/admin/pack-requests')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur lors de l\'envoi' }
  }
}

export async function updatePackRequestStatus(
  id: string,
  status: 'traite' | 'annule'
): Promise<void> {
  await db.collection('pack_requests').doc(id).update({ status })
  revalidatePath('/admin')
  revalidatePath('/admin/pack-requests')
}
