'use server'

import { db } from '@/lib/firebase'
import { revalidatePath } from 'next/cache'
import type { PaymentSettings, AdminPaymentSettings } from '@/lib/payment-settings'
import { EMPTY_PAYMENT_SETTINGS, DEFAULT_ADMIN_PAYMENT_SETTINGS } from '@/lib/payment-settings'

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

// ── Admin global payment settings ──────────────────────────────────────────

export async function loadAdminPaymentSettings(): Promise<AdminPaymentSettings> {
  const doc = await db.collection('settings').doc('adminPaymentSettings').get()
  if (!doc.exists) return DEFAULT_ADMIN_PAYMENT_SETTINGS
  return { ...DEFAULT_ADMIN_PAYMENT_SETTINGS, ...(doc.data() as Partial<AdminPaymentSettings>) }
}

export async function saveAdminPaymentSettings(
  settings: AdminPaymentSettings
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection('settings').doc('adminPaymentSettings').set({
      ...settings,
      updated_at: new Date().toISOString(),
    })
    revalidatePath('/admin/parametres-paiement')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/**
 * Résout les paramètres de paiement pour une réservation :
 * Priorité : payment_settings partenaire > adminPaymentSettings > valeurs codées en dur
 */
export async function resolvePaymentSettingsForReservation(
  partnerId?: string | null
): Promise<{ omNumber: string; revolut: { link: string; message: string; include_by_default: boolean; display_name: string } }> {
  const adminSettings = await loadAdminPaymentSettings()
  let omNumber = adminSettings.orange_money_number || '693407964'

  if (partnerId) {
    const partnerDoc = await db.collection('partenaires').doc(partnerId).get()
    if (partnerDoc.exists) {
      const pData = partnerDoc.data()!
      const partnerOm = pData.payment_settings?.orange_money_number?.trim()
      if (partnerOm) omNumber = partnerOm
    }
  }

  return {
    omNumber,
    revolut: {
      link: adminSettings.revolut_link || 'https://revolut.me/olivieqf4i',
      message: adminSettings.revolut_message || "Paiement sécurisé par carte bancaire ou virement",
      include_by_default: adminSettings.revolut_include_by_default !== false,
      display_name: adminSettings.revolut_display_name || 'L&Lui Signature',
    },
  }
}
