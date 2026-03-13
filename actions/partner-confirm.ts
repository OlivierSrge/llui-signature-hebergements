'use server'

import { db } from '@/lib/firebase'
import { revalidatePath } from 'next/cache'
import { syncClientFromReservationId } from '@/actions/clients'

type ActionResult =
  | { success: true }
  | { success: false; error: string }

export async function confirmPartnerReservation(reservationId: string): Promise<ActionResult> {
  try {
    const docRef = db.collection('reservations').doc(reservationId)
    const doc = await docRef.get()
    if (!doc.exists) return { success: false, error: 'Réservation introuvable' }

    const data = doc.data()!
    if (data.reservation_status === 'confirmee') {
      return { success: false, error: 'Réservation déjà confirmée' }
    }

    await docRef.update({
      reservation_status: 'confirmee',
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    revalidatePath(`/partenaire/confirm/${reservationId}`)
    revalidatePath('/admin/reservations')
    revalidatePath(`/admin/reservations/${reservationId}`)
    revalidatePath('/partenaire/dashboard')

    // Créer/mettre à jour le profil client L&Lui Stars
    await syncClientFromReservationId(reservationId).catch(() => {})

    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || 'Une erreur est survenue' }
  }
}
