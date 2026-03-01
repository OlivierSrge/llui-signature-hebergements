'use server'

import { db } from '@/lib/firebase'
import { revalidatePath } from 'next/cache'
import type { DiscountType, PromoCode } from '@/lib/types'

export type PromoValidationResult =
  | { valid: true; code: string; discount_type: DiscountType; discount_value: number; discount_amount: number }
  | { valid: false; error: string }

export async function validatePromoCode(
  code: string,
  totalPrice: number
): Promise<PromoValidationResult> {
  const normalized = code.trim().toUpperCase()
  if (!normalized) return { valid: false, error: 'Code vide' }

  const snap = await db.collection('promo_codes')
    .where('code', '==', normalized)
    .limit(1)
    .get()

  if (snap.empty) return { valid: false, error: 'Code promo invalide' }

  const doc = snap.docs[0]
  const promo = doc.data()

  if (!promo.active) return { valid: false, error: 'Ce code promo n\'est plus actif' }

  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return { valid: false, error: 'Ce code promo a expiré' }
  }

  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
    return { valid: false, error: 'Ce code promo a atteint sa limite d\'utilisation' }
  }

  const discount_amount = promo.discount_type === 'percent'
    ? Math.round(totalPrice * promo.discount_value / 100)
    : Math.min(promo.discount_value, totalPrice)

  return {
    valid: true,
    code: normalized,
    discount_type: promo.discount_type,
    discount_value: promo.discount_value,
    discount_amount,
  }
}

export async function getPromoCodes(): Promise<PromoCode[]> {
  const snap = await db.collection('promo_codes').orderBy('created_at', 'desc').get()
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as PromoCode))
}

export async function createPromoCode(data: {
  code: string
  discount_type: DiscountType
  discount_value: number
  expires_at: string | null
  max_uses: number | null
}): Promise<{ success: boolean; error?: string }> {
  const code = data.code.trim().toUpperCase()
  if (!code) return { success: false, error: 'Le code est requis' }

  const existing = await db.collection('promo_codes').where('code', '==', code).limit(1).get()
  if (!existing.empty) return { success: false, error: 'Ce code existe déjà' }

  await db.collection('promo_codes').add({
    code,
    discount_type: data.discount_type,
    discount_value: Number(data.discount_value),
    active: true,
    expires_at: data.expires_at || null,
    max_uses: data.max_uses ? Number(data.max_uses) : null,
    used_count: 0,
    created_at: new Date().toISOString(),
  })

  revalidatePath('/admin/promo-codes')
  return { success: true }
}

export async function togglePromoCode(id: string, active: boolean): Promise<void> {
  await db.collection('promo_codes').doc(id).update({ active })
  revalidatePath('/admin/promo-codes')
}

export async function deletePromoCode(id: string): Promise<void> {
  await db.collection('promo_codes').doc(id).delete()
  revalidatePath('/admin/promo-codes')
}
