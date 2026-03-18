'use server'

import { db } from '@/lib/firebase'
import {
  SEUIL_ESCALADE_ADMIN, FENETRE_ADMIN_MINUTES, ACOMPTE_LLUI_PERCENT,
  type ReservationRules,
} from '@/lib/reservationRules'
import { revalidatePath } from 'next/cache'

// ── Load / Save réservation rules ────────────────────────────────────────

export async function loadReservationRules(): Promise<ReservationRules> {
  try {
    const doc = await db.collection('settings').doc('reservationRules').get()
    if (doc.exists) {
      const d = doc.data()!
      return {
        seuilEscaladeAdmin:  d.seuilEscaladeAdmin  ?? SEUIL_ESCALADE_ADMIN,
        fenetreAdminMinutes: d.fenetreAdminMinutes ?? FENETRE_ADMIN_MINUTES,
        acompteLluiPercent:  d.acompteLluiPercent  ?? ACOMPTE_LLUI_PERCENT,
      }
    }
  } catch { /* ignore */ }
  return {
    seuilEscaladeAdmin:  SEUIL_ESCALADE_ADMIN,
    fenetreAdminMinutes: FENETRE_ADMIN_MINUTES,
    acompteLluiPercent:  ACOMPTE_LLUI_PERCENT,
  }
}

export async function saveReservationRules(rules: ReservationRules): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection('settings').doc('reservationRules').set({
      ...rules,
      updatedAt: new Date().toISOString(),
    }, { merge: true })
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ── Champs initiaux selon la source ─────────────────────────────────────

export async function buildSourceFields(
  source: 'llui_site' | 'partner_qr',
  totalPrice: number,
  partnerId?: string | null,
  partnerName?: string | null,
): Promise<Record<string, unknown>> {
  const rules = await loadReservationRules()
  const now = new Date()

  if (source === 'llui_site') {
    return {
      source: 'llui_site',
      sourcePartnerId: partnerId ?? null,
      sourcePartnerName: partnerName ?? null,
      handledBy: 'admin',
      adminCanOverride: true,
      visiblePartenaire: false,
      acompteRequired: false,
      acompteAmount: null,
      acompteStatus: null,
      acompteConfirmedAt: null,
      acompteConfirmedBy: null,
      autoEscalated: false,
      autoEscalatedReason: null,
      adminWindowStart: null,
      adminWindowEnd: null,
      adminWindowUsed: false,
    }
  }

  // source === 'partner_qr'
  // Vérifier seuil d'escalade
  if (totalPrice >= rules.seuilEscaladeAdmin) {
    return {
      source: 'llui_site',
      sourcePartnerId: partnerId ?? null,
      sourcePartnerName: partnerName ?? null,
      handledBy: 'admin',
      adminCanOverride: true,
      visiblePartenaire: false,
      acompteRequired: false,
      acompteAmount: null,
      acompteStatus: null,
      acompteConfirmedAt: null,
      acompteConfirmedBy: null,
      autoEscalated: true,
      autoEscalatedReason: 'Montant supérieur au seuil automatique',
      adminWindowStart: null,
      adminWindowEnd: null,
      adminWindowUsed: false,
    }
  }

  // Flux B normal : fenêtre admin 2h
  const windowEnd = new Date(now.getTime() + rules.fenetreAdminMinutes * 60 * 1000)
  const acompteAmount = Math.round(totalPrice * rules.acompteLluiPercent)

  return {
    source: 'partner_qr',
    sourcePartnerId: partnerId ?? null,
    sourcePartnerName: partnerName ?? null,
    handledBy: 'partner',
    adminCanOverride: true,
    visiblePartenaire: false, // devient true quand admin laisse au partenaire
    acompteRequired: true,
    acompteAmount,
    acompteStatus: 'pending',
    acompteConfirmedAt: null,
    acompteConfirmedBy: null,
    autoEscalated: false,
    autoEscalatedReason: null,
    adminWindowStart: now.toISOString(),
    adminWindowEnd: windowEnd.toISOString(),
    adminWindowUsed: false,
  }
}

// ── Migration réservations existantes ─────────────────────────────────────

export async function migrateExistingReservations(): Promise<{ migrated: number; error?: string }> {
  try {
    const snap = await db.collection('reservations').get()
    let migrated = 0
    const batch = db.batch()

    for (const doc of snap.docs) {
      const data = doc.data()
      // Seulement si pas encore migré
      if (data.source === 'llui_site' || data.source === 'partner_qr') continue

      const updates: Record<string, unknown> = {
        source: 'llui_site',
        sourcePartnerId: data.partner_id ?? null,
        sourcePartnerName: data.partner_name ?? null,
        handledBy: 'admin',
        adminCanOverride: true,
        visiblePartenaire: true,
        acompteRequired: false,
        acompteAmount: null,
        acompteStatus: null,
        acompteConfirmedAt: null,
        acompteConfirmedBy: null,
        autoEscalated: false,
        autoEscalatedReason: null,
        adminWindowStart: null,
        adminWindowEnd: null,
        adminWindowUsed: false,
        updated_at: new Date().toISOString(),
      }
      batch.update(doc.ref, updates)
      migrated++
    }

    if (migrated > 0) await batch.commit()
    revalidatePath('/admin/reservations')
    return { migrated }
  } catch (e: any) {
    return { migrated: 0, error: e.message }
  }
}

// ── Admin reprend la main ──────────────────────────────────────────────────

export async function adminTakeOver(
  reservationId: string,
  adminId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection('reservations').doc(reservationId).update({
      source: 'llui_site',
      handledBy: 'admin',
      adminWindowUsed: true,
      visiblePartenaire: false,
      autoEscalated: true,
      autoEscalatedReason: 'Reprise manuelle admin dans la fenêtre prioritaire',
      updated_at: new Date().toISOString(),
    })
    revalidatePath('/admin')
    revalidatePath(`/admin/reservations/${reservationId}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ── Admin laisse au partenaire ─────────────────────────────────────────────

export async function adminDelegateToPartner(
  reservationId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection('reservations').doc(reservationId).update({
      handledBy: 'partner',
      adminWindowUsed: false,
      visiblePartenaire: true,
      updated_at: new Date().toISOString(),
    })
    revalidatePath('/admin')
    revalidatePath(`/admin/reservations/${reservationId}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ── Admin confirme réception acompte ──────────────────────────────────────

export async function confirmAcompte(
  reservationId: string,
  adminId: string,
  montantRecu: number,
  moyenPaiement: string,
  reference: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection('reservations').doc(reservationId).update({
      acompteStatus: 'confirmed',
      acompteConfirmedAt: new Date().toISOString(),
      acompteConfirmedBy: adminId,
      acompteReceivedAmount: montantRecu,
      acomptePaymentMethod: moyenPaiement,
      acompteReference: reference,
      updated_at: new Date().toISOString(),
    })
    revalidatePath('/admin/reservations')
    revalidatePath(`/admin/reservations/${reservationId}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ── Admin dispense l'acompte (cas VIP) ────────────────────────────────────

export async function waiveAcompte(
  reservationId: string,
  adminId: string,
  raison: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection('reservations').doc(reservationId).update({
      acompteStatus: 'waived',
      acompteConfirmedAt: new Date().toISOString(),
      acompteConfirmedBy: adminId,
      acompteWaivedReason: raison,
      updated_at: new Date().toISOString(),
    })
    revalidatePath('/admin/reservations')
    revalidatePath(`/admin/reservations/${reservationId}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ── Forcer flux L&Lui pour un partenaire ─────────────────────────────────

export async function setForceFluxLlui(
  partnerId: string,
  force: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection('partenaires').doc(partnerId).update({
      forceFluxLlui: force,
      updated_at: new Date().toISOString(),
    })
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
