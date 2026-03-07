'use server'

import { db } from '@/lib/firebase'
import { revalidatePath } from 'next/cache'
import {
  getNiveauFromSejours,
  generateBoutiquePromoCode,
  generateMemberCode,
  calculatePointsFromBoutique,
  NIVEAUX,
} from '@/lib/loyalty'
import type { LoyaltyClient, BoutiqueAchat } from '@/lib/types'

// ── Helpers ────────────────────────────────────────────────────

function formatPhone(phone: string): string {
  const cleaned = (phone || '').replace(/\D/g, '')
  return cleaned.startsWith('237') ? cleaned : `237${cleaned}`
}

function newId(): string {
  return db.collection('clients').doc().id
}

// ── CRUD clients ────────────────────────────────────────────────

export async function getClients(): Promise<LoyaltyClient[]> {
  const snap = await db.collection('clients').get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as LoyaltyClient))
    .sort((a, b) => b.created_at?.localeCompare(a.created_at) || 0)
}

export async function getClient(id: string): Promise<LoyaltyClient | null> {
  const doc = await db.collection('clients').doc(id).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as LoyaltyClient
}

export async function getClientByEmail(email: string): Promise<LoyaltyClient | null> {
  const snap = await db.collection('clients')
    .where('email', '==', email.toLowerCase().trim())
    .limit(1)
    .get()
  if (snap.empty) return null
  const doc = snap.docs[0]
  return { id: doc.id, ...doc.data() } as LoyaltyClient
}

export async function getClientByMemberCode(code: string): Promise<LoyaltyClient | null> {
  const snap = await db.collection('clients')
    .where('memberCode', '==', code.trim().toUpperCase())
    .limit(1)
    .get()
  if (snap.empty) return null
  const doc = snap.docs[0]
  return { id: doc.id, ...doc.data() } as LoyaltyClient
}

// Crée ou met à jour un profil client à partir d'une réservation confirmée
export async function syncClientFromReservation(data: {
  email: string
  firstName: string
  lastName: string
  phone: string
  reservationDate: string  // ISO
}): Promise<string> {
  const existing = await getClientByEmail(data.email)

  if (existing) {
    // Recalcule le nb de séjours confirmés
    const resSnap = await db.collection('reservations')
      .where('guest_email', '==', data.email)
      .where('reservation_status', '==', 'confirmee')
      .get()
    const totalSejours = resSnap.size
    const niveau = getNiveauFromSejours(totalSejours)
    const boutiqueDiscount = NIVEAUX[niveau].boutiqueDiscount

    await db.collection('clients').doc(existing.id).update({
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      totalSejours,
      niveau,
      boutiqueDiscount,
      updated_at: new Date().toISOString(),
    })
    revalidatePath('/admin/clients')
    return existing.id
  }

  // Nouveau client
  const id = newId()
  const memberCode = generateMemberCode()
  const boutiquePromoCode = generateBoutiquePromoCode()
  const now = new Date().toISOString()

  const newClient: Omit<LoyaltyClient, 'id'> = {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email.toLowerCase().trim(),
    phone: data.phone,
    birthDate: null,
    memberCode,
    joinedAt: data.reservationDate,
    niveau: 'novice',
    totalSejours: 1,
    totalPoints: 0,
    boutiqueDiscount: 5,
    boutiquePromoCode,
    boutiquePointsEarned: 0,
    boutiqueAchats: [],
    created_at: now,
    updated_at: now,
  }

  await db.collection('clients').doc(id).set(newClient)
  revalidatePath('/admin/clients')
  return id
}

// Création manuelle d'un client
export async function createClient(formData: FormData): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const email = (formData.get('email') as string).toLowerCase().trim()
    const existing = await getClientByEmail(email)
    if (existing) return { success: false, error: 'Un client avec cet email existe déjà.' }

    const id = newId()
    const memberCode = generateMemberCode()
    const boutiquePromoCode = generateBoutiquePromoCode()
    const now = new Date().toISOString()

    const client: Omit<LoyaltyClient, 'id'> = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email,
      phone: (formData.get('phone') as string) || null,
      birthDate: (formData.get('birthDate') as string) || null,
      memberCode,
      joinedAt: now,
      niveau: 'novice',
      totalSejours: 0,
      totalPoints: 0,
      boutiqueDiscount: 5,
      boutiquePromoCode,
      boutiquePointsEarned: 0,
      boutiqueAchats: [],
      created_at: now,
      updated_at: now,
    }

    await db.collection('clients').doc(id).set(client)
    revalidatePath('/admin/clients')
    return { success: true, id }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// Met à jour les infos de base d'un client
export async function updateClient(
  clientId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getClient(clientId)
    if (!client) return { success: false, error: 'Client introuvable' }

    await db.collection('clients').doc(clientId).update({
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      phone: (formData.get('phone') as string) || null,
      birthDate: (formData.get('birthDate') as string) || null,
      totalSejours: Number(formData.get('totalSejours') || client.totalSejours),
      updated_at: new Date().toISOString(),
    })

    // Recalcule le niveau
    const totalSejours = Number(formData.get('totalSejours') || client.totalSejours)
    const niveau = getNiveauFromSejours(totalSejours)
    const boutiqueDiscount = NIVEAUX[niveau].boutiqueDiscount
    await db.collection('clients').doc(clientId).update({ niveau, boutiqueDiscount })

    revalidatePath(`/admin/clients/${clientId}`)
    revalidatePath('/admin/clients')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// Enregistre un achat boutique et met à jour les points + niveau
export async function recordBoutiqueAchat(
  clientId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string; pointsGagnes?: number }> {
  try {
    const client = await getClient(clientId)
    if (!client) return { success: false, error: 'Client introuvable' }

    const montant = Number(formData.get('montant'))
    const articles = formData.get('articles') as string
    const date = formData.get('date') as string
    if (!montant || montant <= 0) return { success: false, error: 'Montant invalide' }

    const points = calculatePointsFromBoutique(montant)

    const achat: BoutiqueAchat = {
      id: newId(),
      montant,
      articles: articles || '',
      date: date || new Date().toISOString().split('T')[0],
      points,
      created_at: new Date().toISOString(),
    }

    const newBoutiquePointsEarned = (client.boutiquePointsEarned || 0) + points
    const newTotalPoints = (client.totalPoints || 0) + points
    const newBoutiqueAchats = [...(client.boutiqueAchats || []), achat]

    // Recalcule le niveau (les points boutique comptent comme 10 pts = 1 séjour supplémentaire)
    const bonusSejours = Math.floor(newTotalPoints / 100) // 100 points = 1 séjour équivalent
    const effectiveSejours = client.totalSejours + bonusSejours
    const niveau = getNiveauFromSejours(effectiveSejours)
    const boutiqueDiscount = NIVEAUX[niveau].boutiqueDiscount

    await db.collection('clients').doc(clientId).update({
      boutiquePointsEarned: newBoutiquePointsEarned,
      totalPoints: newTotalPoints,
      boutiqueAchats: newBoutiqueAchats,
      niveau,
      boutiqueDiscount,
      updated_at: new Date().toISOString(),
    })

    revalidatePath(`/admin/clients/${clientId}`)
    revalidatePath('/admin/clients')
    return { success: true, pointsGagnes: points }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ── Notifications anniversaire ─────────────────────────────────

// Clients dont c'est l'anniversaire aujourd'hui (birthDate = MM-DD du jour)
export async function getBirthdayClients(): Promise<LoyaltyClient[]> {
  const now = new Date()
  const mmdd = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const snap = await db.collection('clients').get()
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as LoyaltyClient))
    .filter((c) => c.birthDate && c.birthDate.slice(5) === mmdd) // YYYY-MM-DD → MM-DD
}

// Clients dont c'est l'anniversaire du premier séjour (joinedAt = même MM-DD, année différente)
export async function getStayAnniversaryClients(): Promise<LoyaltyClient[]> {
  const now = new Date()
  const currentYear = now.getFullYear()
  const mmdd = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const snap = await db.collection('clients').get()
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as LoyaltyClient))
    .filter((c) => {
      if (!c.joinedAt) return false
      const joined = c.joinedAt.slice(0, 10) // YYYY-MM-DD
      const joinedYear = parseInt(joined.slice(0, 4))
      const joinedMmdd = joined.slice(5)
      return joinedMmdd === mmdd && joinedYear < currentYear
    })
}

