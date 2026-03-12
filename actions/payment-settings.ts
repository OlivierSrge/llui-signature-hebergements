'use server'

import { db } from '@/lib/firebase'
import { revalidatePath } from 'next/cache'

export interface PaymentSettings {
  orange_money_number: string
  orange_money_holder: string
  bank_name: string
  bank_account: string
  bank_swift: string
  bank_holder: string
  bank_branch: string
  mtn_momo_number: string
  mtn_momo_holder: string
}

export const EMPTY_PAYMENT_SETTINGS: PaymentSettings = {
  orange_money_number: '',
  orange_money_holder: '',
  bank_name: '',
  bank_account: '',
  bank_swift: '',
  bank_holder: '',
  bank_branch: '',
  mtn_momo_number: '',
  mtn_momo_holder: '',
}

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

/** Résout le numéro OM à utiliser dans les messages de paiement partenaire */
export function resolveOmNumber(paymentSettings: PaymentSettings | null | undefined): string {
  return paymentSettings?.orange_money_number?.trim() || '693407964'
}
