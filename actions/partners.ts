'use server'

import { db } from '@/lib/firebase'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

type ActionResult = { success: true; id?: string } | { success: false; error: string }

function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'PART-'
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export async function createPartner(formData: FormData): Promise<ActionResult> {
  try {
    const docRef = db.collection('partenaires').doc()
    await docRef.set({
      name: formData.get('name') as string,
      email: (formData.get('email') as string) || null,
      phone: (formData.get('phone') as string) || null,
      description: (formData.get('description') as string) || null,
      address: (formData.get('address') as string) || null,
      iban: (formData.get('iban') as string) || null,
      logo_url: (formData.get('logo_url') as string) || null,
      promo_code: (formData.get('promo_code') as string)?.toUpperCase().trim() || null,
      access_code: generateAccessCode(),
      access_pin: (formData.get('access_pin') as string)?.trim() || null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    revalidatePath('/admin/partenaires')
    return { success: true, id: docRef.id }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur lors de la création' }
  }
}

export async function updatePartner(id: string, formData: FormData): Promise<ActionResult> {
  try {
    await db.collection('partenaires').doc(id).update({
      name: formData.get('name') as string,
      email: (formData.get('email') as string) || null,
      phone: (formData.get('phone') as string) || null,
      description: (formData.get('description') as string) || null,
      address: (formData.get('address') as string) || null,
      iban: (formData.get('iban') as string) || null,
      logo_url: (formData.get('logo_url') as string) || null,
      promo_code: (formData.get('promo_code') as string)?.toUpperCase().trim() || null,
      access_pin: (formData.get('access_pin') as string)?.trim() || null,
      is_active: formData.get('is_active') !== 'false',
      updated_at: new Date().toISOString(),
    })

    revalidatePath('/admin/partenaires')
    revalidatePath(`/admin/partenaires/${id}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur lors de la mise à jour' }
  }
}

export async function deletePartner(id: string): Promise<ActionResult> {
  try {
    await db.collection('partenaires').doc(id).update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    revalidatePath('/admin/partenaires')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur lors de la désactivation' }
  }
}

// ─── Authentification portail partenaire ─────────────────────────────────────

export type PartnerLoginResult =
  | { success: true; partnerId: string }
  | { success: false; error: string }

export async function loginPartner(
  accessCode: string,
  pin: string
): Promise<PartnerLoginResult> {
  const code = accessCode.trim().toUpperCase()
  if (!code || !pin.trim()) return { success: false, error: 'Identifiants requis' }

  const snap = await db.collection('partenaires')
    .where('access_code', '==', code)
    .where('is_active', '==', true)
    .limit(1)
    .get()

  if (snap.empty) return { success: false, error: 'Code d\'accès invalide' }

  const doc = snap.docs[0]
  const partner = doc.data()

  if (!partner.access_pin) return { success: false, error: 'Aucun PIN configuré pour ce compte' }
  if (partner.access_pin !== pin.trim()) return { success: false, error: 'PIN incorrect' }

  const cookieStore = await cookies()
  cookieStore.set('partner_session', doc.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 jours
    path: '/',
  })

  return { success: true, partnerId: doc.id }
}

export async function logoutPartner(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('partner_session')
}

export async function getPartnerFromSession(): Promise<{ id: string; name: string; access_code: string } | null> {
  const cookieStore = await cookies()
  const partnerId = cookieStore.get('partner_session')?.value
  if (!partnerId) return null

  const doc = await db.collection('partenaires').doc(partnerId).get()
  if (!doc.exists) return null

  const data = doc.data()!
  if (!data.is_active) return null

  return { id: doc.id, name: data.name, access_code: data.access_code }
}
