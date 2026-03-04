'use server'

import { db } from '@/lib/firebase'
import { revalidatePath } from 'next/cache'

type ActionResult = { success: true; id?: string } | { success: false; error: string }

export async function createPartner(formData: FormData): Promise<ActionResult> {
  try {
    const docRef = db.collection('partenaires').doc()
    await docRef.set({
      name: formData.get('name') as string,
      email: (formData.get('email') as string) || null,
      phone: (formData.get('phone') as string) || null,
      description: (formData.get('description') as string) || null,
      address: (formData.get('address') as string) || null,
      iban: (formData.get('iban') as string) || null,
      logo_url: (formData.get('logo_url') as string) || null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    revalidatePath('/admin/partenaires')
    return { success: true, id: docRef.id }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur lors de la création' }
  }
}

export async function updatePartner(id: string, formData: FormData): Promise<ActionResult> {
  try {
    await db.collection('partenaires').doc(id).update({
      name: formData.get('name') as string,
      email: (formData.get('email') as string) || null,
      phone: (formData.get('phone') as string) || null,
      description: (formData.get('description') as string) || null,
      address: (formData.get('address') as string) || null,
      iban: (formData.get('iban') as string) || null,
      logo_url: (formData.get('logo_url') as string) || null,
      is_active: formData.get('is_active') !== 'false',
      updated_at: new Date().toISOString(),
    })

    revalidatePath('/admin/partenaires')
    revalidatePath(`/admin/partenaires/${id}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur lors de la mise à jour' }
  }
}

export async function deletePartner(id: string): Promise<ActionResult> {
  try {
    await db.collection('partenaires').doc(id).update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    revalidatePath('/admin/partenaires')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur lors de la désactivation' }
  }
}
