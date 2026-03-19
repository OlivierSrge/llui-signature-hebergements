'use server'

import { db } from '@/lib/firebase'
import { revalidatePath } from 'next/cache'
import { generateDevisRef } from '@/lib/devisDefaults'
import type { DevisFormData } from '@/lib/devisDefaults'

export type DevisStatus = 'brouillon' | 'envoyé' | 'accepté' | 'refusé'

export interface DevisRecord {
  id: string
  ref: string
  clientName: string
  clientPhone: string
  clientEmail: string
  pack: string
  dateEvenement: string
  nombreInvites: number
  totalTTC: number
  totalBoutique: number
  status: DevisStatus
  visibleBoutique: boolean
  createdAt: string
  notes: string
  pdfUrl: string
  formData?: DevisFormData
}

// Sauvegarder un devis (création ou mise à jour)
export async function saveDevis(
  formData: DevisFormData,
  totalTTC: number,
  totalBoutique: number,
  existingId?: string
): Promise<{ success: boolean; id?: string; ref?: string; error?: string }> {
  try {
    const ref = existingId
      ? ((await db.collection('devis').doc(existingId).get()).data() as any)?.ref || generateDevisRef()
      : generateDevisRef()

    const clientName = `${formData.prenomMarie} ${formData.nomMarie} & ${formData.prenomMariee} ${formData.nomMariee}`

    const record = {
      ref,
      clientName,
      clientPhone: formData.telephone,
      clientEmail: formData.email || '',
      pack: formData.pack || '',
      dateEvenement: formData.dateEvenement,
      nombreInvites: formData.nombreInvites,
      totalTTC,
      totalBoutique,
      status: 'brouillon' as DevisStatus,
      visibleBoutique: false,
      notes: formData.notes || '',
      pdfUrl: '',
      formData,
      ...(existingId ? { updatedAt: new Date().toISOString() } : { createdAt: new Date().toISOString() }),
    }

    let docId = existingId
    if (existingId) {
      await db.collection('devis').doc(existingId).set(record, { merge: true })
    } else {
      const docRef = await db.collection('devis').add(record)
      docId = docRef.id
    }

    revalidatePath('/admin/devis')
    return { success: true, id: docId, ref }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// Lister tous les devis
export async function getDevisList(): Promise<DevisRecord[]> {
  try {
    const snap = await db.collection('devis').orderBy('createdAt', 'desc').get()
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DevisRecord))
  } catch {
    return []
  }
}

// Charger un devis
export async function getDevis(id: string): Promise<DevisRecord | null> {
  try {
    const doc = await db.collection('devis').doc(id).get()
    if (!doc.exists) return null
    return { id: doc.id, ...doc.data() } as DevisRecord
  } catch {
    return null
  }
}

// Changer le statut
export async function updateDevisStatus(
  id: string,
  status: DevisStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection('devis').doc(id).update({ status, updatedAt: new Date().toISOString() })
    revalidatePath('/admin/devis')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// Toggle visible boutique
export async function toggleDevisVisibleBoutique(
  id: string,
  value: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection('devis').doc(id).update({ visibleBoutique: value, updatedAt: new Date().toISOString() })
    revalidatePath('/admin/devis')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// Dupliquer un devis
export async function dupliquerDevis(id: string): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const doc = await db.collection('devis').doc(id).get()
    if (!doc.exists) return { success: false, error: 'Devis introuvable' }
    const data = doc.data() as any
    const newRef = generateDevisRef()
    const docRef = await db.collection('devis').add({
      ...data,
      ref: newRef,
      status: 'brouillon',
      pdfUrl: '',
      createdAt: new Date().toISOString(),
      updatedAt: null,
    })
    revalidatePath('/admin/devis')
    return { success: true, id: docRef.id }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// Supprimer un devis
export async function deleteDevis(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection('devis').doc(id).delete()
    revalidatePath('/admin/devis')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
