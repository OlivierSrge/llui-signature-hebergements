'use server'

import { db } from '@/lib/firebase'
import { revalidatePath } from 'next/cache'
import { syncClientFromReservationId } from '@/actions/clients'
import { crediterWalletHebergement } from '@/actions/wallet-partenaire'

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

    // Crédit wallet prescripteur-partenaire Canal 2 (2% hébergement) — non-bloquant
    ;(async () => {
      try {
        const resSnap = await db.collection('reservations').doc(reservationId).get()
        const res = resSnap.data()
        const prescPartId = res?.prescripteur_partenaire_id as string | undefined
        const montant = (res?.total_price as number) ?? 0
        if (prescPartId && montant > 0) {
          const { credited, commission_fcfa } = await crediterWalletHebergement({
            partenaire_id: prescPartId,
            montant_vente: montant,
            reference_vente: reservationId,
          })
          if (credited) {
            await db.collection('reservations').doc(reservationId).update({
              commission_prescripteur_partenaire_statut: 'creditee',
              commission_prescripteur_partenaire_fcfa: commission_fcfa,
            })
            console.log(`[confirmPartnerReservation] 💰 wallet ${prescPartId} crédité +${commission_fcfa} FCFA (2% hébergement, résa ${reservationId})`)
          }
        }
      } catch (e) {
        console.warn('[confirmPartnerReservation] crédit wallet hébergement non-bloquant:', e)
      }
    })()

    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || 'Une erreur est survenue' }
  }
}
