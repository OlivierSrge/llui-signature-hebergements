'use server'

import { db } from '@/lib/firebase'
import { sendWhatsApp } from '@/lib/whatsappNotif'
import { revalidatePath } from 'next/cache'

export interface NotePartenaire {
  id: string
  prescripteur_id: string
  partenaire_id: string
  reservation_id: string
  note: number
  commentaire: string
  created_at: string
  created_by: string
  partenaire_nom?: string
  hebergement_nom?: string
}

// ─── Créer une note ───────────────────────────────────────────

export async function noterPrescripteur(data: {
  prescripteur_id: string
  partenaire_id: string
  reservation_id: string
  note: number
  commentaire: string
  created_by: string
  partenaire_nom?: string
  hebergement_nom?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Vérifier que la réservation n'a pas déjà été notée
    const resaDoc = await db.collection('reservations').doc(data.reservation_id).get()
    if (!resaDoc.exists) return { success: false, error: 'Reservation introuvable' }
    if (resaDoc.data()?.note_donnee === true) return { success: false, error: 'Deja note' }

    // Créer la note
    await db.collection('notes_prescripteurs').add({
      prescripteur_id: data.prescripteur_id,
      partenaire_id: data.partenaire_id,
      reservation_id: data.reservation_id,
      note: data.note,
      commentaire: data.commentaire,
      created_at: new Date().toISOString(),
      created_by: data.created_by,
      partenaire_nom: data.partenaire_nom ?? '',
      hebergement_nom: data.hebergement_nom ?? '',
    })

    // Marquer la réservation comme notée
    await db.collection('reservations').doc(data.reservation_id).update({
      note_donnee: true,
      note_prescripteur: data.note,
    })

    // Recalculer note_moyenne du prescripteur
    const notesSnap = await db.collection('notes_prescripteurs')
      .where('prescripteur_id', '==', data.prescripteur_id)
      .get()
    const notes = notesSnap.docs.map((d) => d.data().note as number)
    const total_notes = notes.length
    const note_moyenne = total_notes > 0
      ? Math.round((notes.reduce((s, n) => s + n, 0) / total_notes) * 10) / 10
      : 0
    const badge_confiance = note_moyenne >= 4.5 && total_notes >= 5

    await db.collection('prescripteurs').doc(data.prescripteur_id).update({
      note_moyenne,
      total_notes,
      badge_confiance,
    })

    // SMS WhatsApp si note >= 4
    if (data.note >= 4) {
      try {
        const prescDoc = await db.collection('prescripteurs').doc(data.prescripteur_id).get()
        const prescData = prescDoc.data()
        if (prescData?.telephone) {
          const msg = `Bravo ${prescData.nom_complet} ! ${data.partenaire_nom ?? 'Un partenaire'} vous a note ${data.note}/5 etoiles. Continuez comme ca ! — L&Lui Signature`
          await sendWhatsApp(prescData.telephone as string, msg)
        }
      } catch {}
    }

    // Alerte admin si note <= 2 (sans SMS au prescripteur)
    if (data.note <= 2) {
      try {
        await db.collection('alertes_admin').add({
          type: 'note_basse_prescripteur',
          prescripteur_id: data.prescripteur_id,
          partenaire_id: data.partenaire_id,
          note: data.note,
          commentaire: data.commentaire,
          created_at: new Date().toISOString(),
          lu: false,
        })
      } catch {}
    }

    revalidatePath('/partenaire/dashboard')
    return { success: true }
  } catch (err: any) {
    console.error('[noterPrescripteur]', err)
    return { success: false, error: err.message }
  }
}

// ─── Réservations à noter (commission versée, pas encore notée) ──

export async function getReservationsANoter(
  partenaireId: string
): Promise<{ id: string; prescripteur_id: string; prescripteur_nom: string; client_nom: string; hebergement_nom: string; commission_versee_at: string }[]> {
  try {
    const snap = await db.collection('reservations')
      .where('partner_id', '==', partenaireId)
      .where('statut_prescription', '==', 'commission_versee')
      .where('note_donnee', '==', false)
      .limit(5)
      .get()
    return snap.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        prescripteur_id: (data.prescripteur_id ?? '') as string,
        prescripteur_nom: (data.prescripteur_nom ?? 'Prescripteur') as string,
        client_nom: `${data.guest_first_name ?? ''} ${data.guest_last_name ?? ''}`.trim(),
        hebergement_nom: (data.accommodation?.name ?? '') as string,
        commission_versee_at: (data.commission_versee_at ?? data.updated_at ?? '') as string,
      }
    })
  } catch (err) {
    console.error('[getReservationsANoter]', err)
    return []
  }
}

// ─── Notes d'un prescripteur (pour admin) ────────────────────

export async function getNotesPrescripteur(
  prescripteurId: string
): Promise<NotePartenaire[]> {
  try {
    const snap = await db.collection('notes_prescripteurs')
      .where('prescripteur_id', '==', prescripteurId)
      .get()
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as NotePartenaire))
    return docs.sort((a, b) => b.created_at.localeCompare(a.created_at))
  } catch (err) {
    console.error('[getNotesPrescripteur]', err)
    return []
  }
}
