'use server'

import { db } from '@/lib/firebase'
import { revalidatePath } from 'next/cache'
import type { PaymentSettings } from '@/lib/payment-settings'
import { EMPTY_PAYMENT_SETTINGS } from '@/lib/payment-settings'

export async function loadPaymentSettings(partnerId: string): Promise<PaymentSettings> {
  const doc = await db.collection('partenaires').doc(partnerId).get()
  if (!doc.exists) return EMPTY_PAYMENT_SETTINGS
  return (doc.data()?.payment_settings as PaymentSettings) || EMPTY_PAYMENT_SETTINGS
}

export async function savePaymentSettings(
  partnerId: string,
  settings: PaymentSettings
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection('partenaires').doc(partnerId).update({
      payment_settings: settings,
      updated_at: new Date().toISOString(),
    })
    revalidatePath('/partenaire/parametres')
    revalidatePath(`/admin/partenaires/${partnerId}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function adminSavePaymentSettings(
  partnerId: string,
  settings: PaymentSettings
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection('partenaires').doc(partnerId).update({
      payment_settings: settings,
      updated_at: new Date().toISOString(),
    })
    revalidatePath(`/admin/partenaires/${partnerId}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
