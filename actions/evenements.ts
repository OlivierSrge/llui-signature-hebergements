'use server'

import { db } from '@/lib/firebase'
import { revalidatePath } from 'next/cache'

type ActionResult = { success: true; id?: string } | { success: false; error: string }

export type TypeEvenement = 'mariage' | 'festival' | 'sport' | 'culturel' | 'gastronomie' | 'autre'

export interface EvenementCanal2 {
  uid: string
  titre: string
  description: string
  date_debut: string
  date_fin: string | null
  lieu: string
  type: TypeEvenement
  emoji: string
  actif: boolean
  date_formatee?: string
  created_at: string
  created_by: string
}

function formaterDate(isoStr: string): string {
  try {
    const d = new Date(isoStr)
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  } catch {
    return isoStr
  }
}

/** Retourne les 3 prochains événements actifs (pour popup + home) */
export async function getEvenementsActifs(): Promise<EvenementCanal2[]> {
  try {
    const snap = await db.collection('evenements_kribi')
      .where('actif', '==', true)
      .limit(3)
      .get()

    return snap.docs.map((d) => {
      const data = d.data()
      const dateDebut = data.date_debut?.toDate
        ? data.date_debut.toDate().toISOString()
        : (data.date_debut ?? '')
      return {
        uid: d.id,
        titre: data.titre ?? '',
        description: data.description ?? '',
        date_debut: dateDebut,
        date_fin: data.date_fin?.toDate ? data.date_fin.toDate().toISOString() : (data.date_fin ?? null),
        lieu: data.lieu ?? '',
        type: (data.type ?? 'autre') as TypeEvenement,
        emoji: data.emoji ?? '🗓',
        actif: data.actif ?? true,
        created_at: data.created_at ?? '',
        created_by: data.created_by ?? '',
        date_formatee: formaterDate(dateDebut),
      }
    })
  } catch (error) {
    console.error('getEvenementsActifs:', error)
    return []
  }
}

/** Liste tous les événements pour l'admin */
export async function listerEvenementsAdmin(): Promise<EvenementCanal2[]> {
  const snap = await db.collection('evenements_kribi')
    .orderBy('date_debut', 'asc')
    .get()
  return snap.docs.map((d) => {
    const data = d.data()
    const dateDebut = data.date_debut?.toDate
      ? data.date_debut.toDate().toISOString()
      : (data.date_debut ?? '')
    return {
      uid: d.id,
      titre: data.titre ?? '',
      description: data.description ?? '',
      date_debut: dateDebut,
      date_fin: data.date_fin?.toDate ? data.date_fin.toDate().toISOString() : (data.date_fin ?? null),
      lieu: data.lieu ?? '',
      type: (data.type ?? 'autre') as TypeEvenement,
      emoji: data.emoji ?? '🗓',
      actif: data.actif ?? true,
      created_at: data.created_at ?? '',
      created_by: data.created_by ?? '',
      date_formatee: formaterDate(dateDebut),
    }
  })
}

/** Crée un événement Canal 2 */
export async function creerEvenementCanal2(data: {
  titre: string
  description: string
  date_debut: string
  date_fin: string | null
  lieu: string
  type: TypeEvenement
  emoji: string
  actif: boolean
}): Promise<{ success: boolean; uid?: string; error?: string }> {
  try {
    const ref = db.collection('evenements_kribi').doc()
    await ref.set({
      uid: ref.id,
      ...data,
      created_at: new Date().toISOString(),
      created_by: 'admin',
    })
    revalidatePath('/admin/evenements')
    revalidatePath('/')
    return { success: true, uid: ref.id }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur' }
  }
}

/** Modifie un événement Canal 2 */
export async function modifierEvenementCanal2(
  uid: string,
  data: Partial<Omit<EvenementCanal2, 'uid' | 'created_at' | 'created_by' | 'date_formatee'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection('evenements_kribi').doc(uid).update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    revalidatePath('/admin/evenements')
    revalidatePath('/')
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur' }
  }
}

/** Supprime un événement Canal 2 */
export async function supprimerEvenementCanal2(uid: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection('evenements_kribi').doc(uid).delete()
    revalidatePath('/admin/evenements')
    revalidatePath('/')
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur' }
  }
}

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
  fichier_type?: string
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
      fichier_type: data.fichier_type || null,
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
      fichier_type: data.fichier_type || null,
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
