'use server'

import { db } from '@/lib/firebase'
import { revalidatePath } from 'next/cache'

type ActionResult = { success: true; id?: string } | { success: false; error: string }

interface EvenementPayload {
  titre: string
  description?: string
  categorie: string
  date_debut: string
  date_fin?: string
  heure?: string
  lieu?: string
  prix?: number
  image_url?: string
  hebergements_associes?: string[]
  recurrent?: boolean
  jour_recurrence?: string
}

export async function createEvenement(data: EvenementPayload): Promise<ActionResult> {
  try {
    const ref = db.collection('evenements_kribi').doc()
    await ref.set({
      titre: data.titre,
      description: data.description || null,
      categorie: data.categorie,
      date_debut: data.date_debut ? new Date(data.date_debut) : null,
      date_fin: data.date_fin ? new Date(data.date_fin) : null,
      heure: data.heure || null,
      lieu: data.lieu || null,
      prix: data.prix ?? 0,
      image_url: data.image_url?.trim() || null,
      hebergements_associes: data.hebergements_associes ?? [],
      actif: true,
      recurrent: data.recurrent ?? false,
      jour_recurrence: data.recurrent ? (data.jour_recurrence || null) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    revalidatePath('/admin/calendrier')
    revalidatePath('/')
    return { success: true, id: ref.id }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur lors de la création' }
  }
}

export async function updateEvenement(id: string, data: EvenementPayload): Promise<ActionResult> {
  try {
    await db.collection('evenements_kribi').doc(id).update({
      titre: data.titre,
      description: data.description || null,
      categorie: data.categorie,
      date_debut: data.date_debut ? new Date(data.date_debut) : null,
      date_fin: data.date_fin ? new Date(data.date_fin) : null,
      heure: data.heure || null,
      lieu: data.lieu || null,
      prix: data.prix ?? 0,
      image_url: data.image_url?.trim() || null,
      hebergements_associes: data.hebergements_associes ?? [],
      recurrent: data.recurrent ?? false,
      jour_recurrence: data.recurrent ? (data.jour_recurrence || null) : null,
      updated_at: new Date().toISOString(),
    })
    revalidatePath('/admin/calendrier')
    revalidatePath('/')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur lors de la mise à jour' }
  }
}

export async function deleteEvenement(id: string): Promise<ActionResult> {
  try {
    await db.collection('evenements_kribi').doc(id).delete()
    revalidatePath('/admin/calendrier')
    revalidatePath('/')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur lors de la suppression' }
  }
}

export async function toggleEvenementActif(id: string, actif: boolean): Promise<ActionResult> {
  try {
    await db.collection('evenements_kribi').doc(id).update({
      actif,
      updated_at: new Date().toISOString(),
    })
    revalidatePath('/admin/calendrier')
    revalidatePath('/')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur' }
  }
}
