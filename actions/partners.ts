'use server'

import { db } from '@/lib/firebase'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import type { DiscountType } from '@/lib/types'

type ActionResult = { success: true; id?: string } | { success: false; error: string }

function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'PART-'
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

/** Crée ou met à jour le code promo dans la collection promo_codes */
async function upsertPromoCode(
  code: string,
  discountType: DiscountType,
  discountValue: number,
  partnerId: string,
  partnerName: string
): Promise<void> {
  const existing = await db.collection('promo_codes').where('code', '==', code).limit(1).get()
  if (!existing.empty) {
    await existing.docs[0].ref.update({
      discount_type: discountType,
      discount_value: discountValue,
      partner_id: partnerId,
      partner_name: partnerName,
      active: true,
      updated_at: new Date().toISOString(),
    })
  } else {
    await db.collection('promo_codes').add({
      code,
      discount_type: discountType,
      discount_value: discountValue,
      partner_id: partnerId,
      partner_name: partnerName,
      active: true,
      expires_at: null,
      max_uses: null,
      used_count: 0,
      created_at: new Date().toISOString(),
    })
  }
}

export async function createPartner(formData: FormData): Promise<ActionResult> {
  try {
    const name = formData.get('name') as string
    const promoCode = (formData.get('promo_code') as string)?.toUpperCase().trim() || null
    const discountType = (formData.get('promo_discount_type') as DiscountType) || 'percent'
    const discountValue = Number(formData.get('promo_discount_value')) || 0

    const docRef = db.collection('partenaires').doc()

    await docRef.set({
      name,
      email: (formData.get('email') as string) || null,
      phone: (formData.get('phone') as string) || null,
      whatsapp_number: (formData.get('whatsapp_number') as string)?.replace(/\D/g, '') || null,
      description: (formData.get('description') as string) || null,
      address: (formData.get('address') as string) || null,
      iban: (formData.get('iban') as string) || null,
      logo_url: (formData.get('logo_url') as string) || null,
      promo_code: promoCode,
      promo_discount_type: discountType,
      promo_discount_value: discountValue,
      access_code: generateAccessCode(),
      access_pin: (formData.get('access_pin') as string)?.trim() || null,
      commission_usage_type: (formData.get('commission_usage_type') as string) || 'percent',
      commission_usage_value: Number(formData.get('commission_usage_value')) || 0,
      reliability_score: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    // Créer le code promo en base si renseigné
    if (promoCode && discountValue > 0) {
      await upsertPromoCode(promoCode, discountType, discountValue, docRef.id, name)
    }

    revalidatePath('/admin/partenaires')
    revalidatePath('/admin/promo-codes')
    return { success: true, id: docRef.id }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur lors de la création' }
  }
}

export async function updatePartner(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const name = formData.get('name') as string
    const promoCode = (formData.get('promo_code') as string)?.toUpperCase().trim() || null
    const discountType = (formData.get('promo_discount_type') as DiscountType) || 'percent'
    const discountValue = Number(formData.get('promo_discount_value')) || 0

    const pin = (formData.get('access_pin') as string)?.trim()
    const updateData: Record<string, unknown> = {
      name,
      email: (formData.get('email') as string) || null,
      phone: (formData.get('phone') as string) || null,
      whatsapp_number: (formData.get('whatsapp_number') as string)?.replace(/\D/g, '') || null,
      description: (formData.get('description') as string) || null,
      address: (formData.get('address') as string) || null,
      iban: (formData.get('iban') as string) || null,
      logo_url: (formData.get('logo_url') as string) || null,
      promo_code: promoCode,
      promo_discount_type: discountType,
      promo_discount_value: discountValue,
      commission_usage_type: (formData.get('commission_usage_type') as string) || 'percent',
      commission_usage_value: Number(formData.get('commission_usage_value')) || 0,
      is_active: formData.get('is_active') !== 'false',
      updated_at: new Date().toISOString(),
    }
    if (pin) updateData.access_pin = pin

    await db.collection('partenaires').doc(id).update(updateData)

    // Synchroniser le code promo si renseigné
    if (promoCode && discountValue > 0) {
      await upsertPromoCode(promoCode, discountType, discountValue, id, name)
    }

    revalidatePath('/admin/partenaires')
    revalidatePath(`/admin/partenaires/${id}`)
    revalidatePath('/admin/promo-codes')
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

// ─── Authentification portail partenaire ─────────────────────────────────────

export type PartnerLoginResult =
  | { success: true; partnerId: string }
  | { success: false; error: string }

export async function loginPartner(
  accessCode: string,
  pin: string
): Promise<PartnerLoginResult> {
  const code = accessCode.trim().toUpperCase()
  if (!code || !pin.trim()) return { success: false, error: 'Identifiants requis' }

  const snap = await db.collection('partenaires')
    .where('access_code', '==', code)
    .where('is_active', '==', true)
    .limit(1)
    .get()

  if (snap.empty) return { success: false, error: 'Code d\'accès invalide' }

  const doc = snap.docs[0]
  const partner = doc.data()

  if (!partner.access_pin) return { success: false, error: 'Aucun PIN configuré pour ce compte' }
  if (partner.access_pin !== pin.trim()) return { success: false, error: 'PIN incorrect' }

  const cookieStore = await cookies()
  cookieStore.set('partner_session', doc.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 jours
    path: '/',
  })

  return { success: true, partnerId: doc.id }
}

export async function logoutPartner(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('partner_session')
}

export async function getPartnerFromSession(): Promise<{ id: string; name: string; access_code: string } | null> {
  const cookieStore = await cookies()
  const partnerId = cookieStore.get('partner_session')?.value
  if (!partnerId) return null

  const doc = await db.collection('partenaires').doc(partnerId).get()
  if (!doc.exists) return null

  const data = doc.data()!
  if (!data.is_active) return null

  return { id: doc.id, name: data.name, access_code: data.access_code }
}
