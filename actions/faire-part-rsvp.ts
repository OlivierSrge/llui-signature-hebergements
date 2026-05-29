'use server'
// actions/faire-part-rsvp.ts — RSVP temps réel pour les invitations numériques

import { db } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'

export interface RsvpData {
  prenom: string
  nom: string
  presence: 'present' | 'absent'
  nb_accompagnants: number
  message?: string
}

export async function submitRsvp(marie_uid: string, data: RsvpData) {
  if (!marie_uid || !data.prenom?.trim() || !data.nom?.trim()) {
    return { success: false, error: 'Données manquantes' }
  }
  if (data.presence !== 'present' && data.presence !== 'absent') {
    return { success: false, error: 'Présence invalide' }
  }

  try {
    await db.collection('portail_users').doc(marie_uid).collection('rsvp').add({
      prenom: data.prenom.trim(),
      nom: data.nom.trim(),
      presence: data.presence,
      nb_accompagnants: data.presence === 'present' ? Math.max(0, data.nb_accompagnants) : 0,
      message: data.message?.trim() || '',
      created_at: FieldValue.serverTimestamp(),
      source: 'faire-part',
    })
    return { success: true }
  } catch (e) {
    console.error('[submitRsvp]', e)
    return { success: false, error: 'Erreur serveur' }
  }
}
