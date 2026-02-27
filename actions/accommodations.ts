'use server'

import { createClient } from '@/lib/supabase/server'
import { generateSlug } from '@/lib/utils'
import { revalidatePath } from 'next/cache'

export async function createAccommodation(formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const images = (formData.get('images') as string)
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
  const amenities = (formData.get('amenities') as string)
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)

  const { data, error } = await supabase
    .from('accommodations')
    .insert({
      partner_id: formData.get('partner_id'),
      name,
      slug: generateSlug(name),
      type: formData.get('type'),
      description: formData.get('description'),
      short_description: formData.get('short_description'),
      capacity: Number(formData.get('capacity')),
      bedrooms: Number(formData.get('bedrooms')),
      bathrooms: Number(formData.get('bathrooms')),
      price_per_night: Number(formData.get('price_per_night')),
      commission_rate: Number(formData.get('commission_rate')),
      location: formData.get('location'),
      images,
      amenities,
      featured: formData.get('featured') === 'true',
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/hebergements')
  revalidatePath('/')

  return { success: true, id: data.id }
}

export async function updateAccommodation(id: string, formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const images = (formData.get('images') as string)
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
  const amenities = (formData.get('amenities') as string)
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)

  const { error } = await supabase
    .from('accommodations')
    .update({
      partner_id: formData.get('partner_id'),
      name,
      slug: generateSlug(name),
      type: formData.get('type'),
      description: formData.get('description'),
      short_description: formData.get('short_description'),
      capacity: Number(formData.get('capacity')),
      bedrooms: Number(formData.get('bedrooms')),
      bathrooms: Number(formData.get('bathrooms')),
      price_per_night: Number(formData.get('price_per_night')),
      commission_rate: Number(formData.get('commission_rate')),
      location: formData.get('location'),
      images,
      amenities,
      featured: formData.get('featured') === 'true',
      status: formData.get('status') || 'active',
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/hebergements')
  revalidatePath(`/admin/hebergements/${id}`)
  revalidatePath('/')

  return { success: true }
}

export async function deleteAccommodation(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('accommodations')
    .update({ status: 'inactive' })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/hebergements')
  revalidatePath('/')

  return { success: true }
}

export async function updateAvailability(
  accommodationId: string,
  dates: { date: string; is_available: boolean }[]
) {
  const supabase = await createClient()

  const upserts = dates.map(({ date, is_available }) => ({
    accommodation_id: accommodationId,
    date,
    is_available,
  }))

  const { error } = await supabase
    .from('availability')
    .upsert(upserts, { onConflict: 'accommodation_id,date' })

  if (error) return { error: error.message }

  revalidatePath(`/admin/hebergements/${accommodationId}/disponibilites`)
  revalidatePath(`/hebergements/${accommodationId}`)

  return { success: true }
}
