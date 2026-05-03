'use server'
// actions/alliance-privee.ts — Module Alliance Privée L&Lui
// NE PAS importer twilio ici — utiliser fetch /api/whatsapp/send

import { db } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { revalidatePath } from 'next/cache'
import {
  type AlliancePartner,
  type AllianceMemberCard,
  type AllianceApplication,
  type AlliancePortraitVerified,
  type AllianceMatch,
  type AlliancePrivateChat,
  type AllianceChatMessage,
  type AllianceCardTier,
  type ApplicationStatus,
  analyserMessageSentinelle,
  TIER_CONFIGS,
} from '@/types/alliance-privee'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'

// ─── Collections ──────────────────────────────────────────────────────────────

const COL_PARTNERS = 'alliance_privee_partners'
const COL_CARDS = 'alliance_privee_cards'
const COL_APPLICATIONS = 'alliance_privee_members_applications'
const COL_PORTRAITS = 'alliance_privee_portraits_verified'
const COL_MATCHES = 'alliance_privee_matches'
const COL_CHATS = 'alliance_privee_private_chats'
const COL_MESSAGES = 'alliance_privee_chat_messages'

// ─── Helper WhatsApp ──────────────────────────────────────────────────────────

async function sendWhatsApp(telephone: string, message: string): Promise<void> {
  try {
    await fetch(`${APP_URL}/api/whatsapp/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ADMIN_API_KEY ?? ''}`,
      },
      body: JSON.stringify({ telephone, message }),
    })
  } catch (e) {
    console.warn('[AlliancePrivee] sendWhatsApp erreur:', e)
  }
}

// ─── Partenaires Alliance ─────────────────────────────────────────────────────

export async function getAlliancePartner(partenaireId: string): Promise<AlliancePartner | null> {
  const snap = await db
    .collection(COL_PARTNERS)
    .where('partenaire_id', '==', partenaireId)
    .where('alliance_active', '==', true)
    .limit(1)
    .get()
  if (snap.empty) return null
  const doc = snap.docs[0]
  return { id: doc.id, ...doc.data() } as AlliancePartner
}

export async function getAllAlliancePartners(): Promise<AlliancePartner[]> {
  const snap = await db.collection(COL_PARTNERS).orderBy('created_at', 'desc').get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AlliancePartner)
}

export async function upsertAlliancePartner(
  partenaireId: string,
  data: Partial<Omit<AlliancePartner, 'id' | 'partenaire_id' | 'created_at'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const snap = await db
      .collection(COL_PARTNERS)
      .where('partenaire_id', '==', partenaireId)
      .limit(1)
      .get()

    const now = new Date().toISOString()
    if (snap.empty) {
      await db.collection(COL_PARTNERS).add({
        partenaire_id: partenaireId,
        alliance_active: false,
        prix_prestige_fcfa: TIER_CONFIGS.PRESTIGE.prix_defaut_fcfa,
        prix_excellence_fcfa: TIER_CONFIGS.EXCELLENCE.prix_defaut_fcfa,
        prix_elite_fcfa: TIER_CONFIGS.ELITE.prix_defaut_fcfa,
        ...data,
        created_at: now,
        updated_at: now,
      })
    } else {
      await snap.docs[0].ref.update({ ...data, updated_at: now })
    }
    revalidatePath('/admin/alliance-privee')
    return { success: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { success: false, error: msg }
  }
}

export async function toggleAllianceActive(
  partenaireId: string,
  active: boolean
): Promise<{ success: boolean; error?: string }> {
  return upsertAlliancePartner(partenaireId, { alliance_active: active })
}

// ─── Candidatures ─────────────────────────────────────────────────────────────

export async function soumettreCandidat(
  data: Omit<AllianceApplication, 'id' | 'status' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const now = new Date().toISOString()
    const ref = await db.collection(COL_APPLICATIONS).add({
      ...data,
      status: 'en_attente' as ApplicationStatus,
      created_at: now,
      updated_at: now,
    })

    // Notif admin
    const adminPhone = process.env.ADMIN_WHATSAPP_PHONE
    if (adminPhone) {
      await sendWhatsApp(
        adminPhone,
        `✦ *Alliance Privée* — Nouvelle candidature ${data.tier_souhaite}\nPrénom : ${data.prenom}, ${data.age} ans, ${data.ville}\nPartenaire : ${data.partenaire_id}`
      )
    }

    revalidatePath('/admin/alliance-privee')
    return { success: true, id: ref.id }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { success: false, error: msg }
  }
}

export async function getCandidatures(
  filters: { partenaire_id?: string; status?: ApplicationStatus } = {}
): Promise<AllianceApplication[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = db.collection(COL_APPLICATIONS).orderBy('created_at', 'desc')
  if (filters.partenaire_id) query = query.where('partenaire_id', '==', filters.partenaire_id)
  if (filters.status) query = query.where('status', '==', filters.status)
  const snap = await query.get()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }) as AllianceApplication)
}

export async function traiterCandidature(
  applicationId: string,
  decision: 'approuve' | 'refuse' | 'en_revision',
  notes?: string,
  adminId?: string
): Promise<{ success: boolean; portrait_id?: string; error?: string }> {
  try {
    const appRef = db.collection(COL_APPLICATIONS).doc(applicationId)
    const appSnap = await appRef.get()
    if (!appSnap.exists) return { success: false, error: 'Candidature introuvable' }

    const app = { id: appSnap.id, ...appSnap.data() } as AllianceApplication
    const now = new Date().toISOString()

    await appRef.update({
      status: decision,
      moderateur_notes: notes ?? '',
      traite_par: adminId ?? 'admin',
      traite_at: now,
      updated_at: now,
    })

    let portrait_id: string | undefined
    if (decision === 'approuve') {
      // Créer le portrait vérifié
      const cardNumber = await genererNumerosCarte()
      const cardRef = await db.collection(COL_CARDS).add({
        tier: app.tier_souhaite,
        portrait_id: '',  // sera mis à jour
        partenaire_id: app.partenaire_id,
        card_number: cardNumber,
        activated_at: now,
        expires_at: calculerExpiration(app.tier_souhaite),
        status: 'active',
        prix_paye_fcfa: 0,
        created_at: now,
      } as Omit<AllianceMemberCard, 'id'>)

      const portraitRef = await db.collection(COL_PORTRAITS).add({
        application_id: applicationId,
        partenaire_id: app.partenaire_id,
        tier: app.tier_souhaite,
        card_id: cardRef.id,
        prenom: app.prenom,
        age: app.age,
        ville: app.ville,
        profession: app.profession,
        photo_url: app.photo_url ?? null,
        bio: app.bio,
        valeurs: app.valeurs,
        loisirs: app.loisirs,
        recherche: app.recherche,
        genre: app.genre,
        genre_recherche: app.genre_recherche,
        actif: true,
        created_at: now,
        updated_at: now,
      } as Omit<AlliancePortraitVerified, 'id'>)

      await cardRef.update({ portrait_id: portraitRef.id })
      portrait_id = portraitRef.id

      // Notif candidat
      await sendWhatsApp(
        app.telephone,
        `✦ *Alliance Privée L&Lui* — Félicitations !\n\nVotre candidature ${app.tier_souhaite} a été *approuvée*.\nVotre carte membre *${cardNumber}* est active.\n\nBienvenue dans le cercle sélectif.`
      )
    } else if (decision === 'refuse') {
      await sendWhatsApp(
        app.telephone,
        `✦ *Alliance Privée L&Lui*\n\nNous avons étudié votre candidature avec attention.\nAprès examen, nous ne sommes pas en mesure de l'accepter à ce stade.\n\nMerci de votre intérêt.`
      )
    }

    revalidatePath('/admin/alliance-privee')
    return { success: true, portrait_id }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { success: false, error: msg }
  }
}

// ─── Portraits ────────────────────────────────────────────────────────────────

export async function getPortraitsVerifies(
  partenaireId?: string
): Promise<AlliancePortraitVerified[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = db.collection(COL_PORTRAITS).where('actif', '==', true).orderBy('created_at', 'desc')
  if (partenaireId) query = query.where('partenaire_id', '==', partenaireId)
  const snap = await query.get()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }) as AlliancePortraitVerified)
}

// ─── Matches ──────────────────────────────────────────────────────────────────

export async function getMatchesPourPortrait(portraitId: string): Promise<AllianceMatch[]> {
  const [snapA, snapB] = await Promise.all([
    db.collection(COL_MATCHES).where('portrait_a_id', '==', portraitId).get(),
    db.collection(COL_MATCHES).where('portrait_b_id', '==', portraitId).get(),
  ])
  const docs = [...snapA.docs, ...snapB.docs]
  return docs.map((d) => ({ id: d.id, ...d.data() }) as AllianceMatch)
}

export async function repondreMatch(
  matchId: string,
  portraitId: string,
  reponse: 'accepte' | 'refuse'
): Promise<{ success: boolean; mutuel?: boolean; error?: string }> {
  try {
    const matchRef = db.collection(COL_MATCHES).doc(matchId)
    const matchSnap = await matchRef.get()
    if (!matchSnap.exists) return { success: false, error: 'Match introuvable' }

    const match = { id: matchSnap.id, ...matchSnap.data() } as AllianceMatch
    const isA = match.portrait_a_id === portraitId
    const updateField = isA ? 'status_a' : 'status_b'
    const otherStatus = isA ? match.status_b : match.status_a

    const now = new Date().toISOString()
    let global_status = match.global_status
    let mutuel = false

    if (reponse === 'refuse') {
      global_status = 'refuse'
    } else if (reponse === 'accepte' && otherStatus === 'accepte') {
      global_status = 'mutuel'
      mutuel = true
    }

    await matchRef.update({ [updateField]: reponse, global_status, updated_at: now })

    // Créer le chat si mutuel
    if (mutuel) {
      await db.collection(COL_CHATS).add({
        match_id: matchId,
        participant_a_id: match.portrait_a_id,
        participant_b_id: match.portrait_b_id,
        partenaire_id: match.partenaire_id,
        message_count: 0,
        created_at: now,
      } as Omit<AlliancePrivateChat, 'id'>)
    }

    return { success: true, mutuel }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { success: false, error: msg }
  }
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export async function getMessages(chatId: string): Promise<AllianceChatMessage[]> {
  const snap = await db
    .collection(COL_MESSAGES)
    .where('chat_id', '==', chatId)
    .orderBy('created_at', 'asc')
    .get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AllianceChatMessage)
}

export async function envoyerMessage(
  chatId: string,
  senderId: string,
  content: string
): Promise<{ success: boolean; blocked?: boolean; reason?: string; error?: string }> {
  try {
    // Sentinelle IA
    const analyse = analyserMessageSentinelle(content)
    const now = new Date().toISOString()

    const messageData: Omit<AllianceChatMessage, 'id'> = {
      chat_id: chatId,
      sender_id: senderId,
      content,
      status: analyse.ok ? 'ok' : 'bloque',
      blocked_reason: analyse.ok ? undefined : analyse.reason,
      created_at: now,
    }

    await db.collection(COL_MESSAGES).add(messageData)

    if (analyse.ok) {
      await db
        .collection(COL_CHATS)
        .doc(chatId)
        .update({ last_message_at: now, message_count: FieldValue.increment(1) })
    }

    return { success: true, blocked: !analyse.ok, reason: analyse.reason }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { success: false, error: msg }
  }
}

// ─── Stats Admin ──────────────────────────────────────────────────────────────

export interface AllianceStats {
  total_partenaires_actifs: number
  total_candidatures: number
  candidatures_en_attente: number
  candidatures_approuvees: number
  total_portraits: number
  total_matches: number
  matches_mutuels: number
}

export async function getAllianceStats(): Promise<AllianceStats> {
  const [partners, candidatures, portraits, matches] = await Promise.all([
    db.collection(COL_PARTNERS).where('alliance_active', '==', true).count().get(),
    db.collection(COL_APPLICATIONS).get(),
    db.collection(COL_PORTRAITS).where('actif', '==', true).count().get(),
    db.collection(COL_MATCHES).get(),
  ])

  const candDocs = candidatures.docs.map((d) => d.data())
  const matchDocs = matches.docs.map((d) => d.data())

  return {
    total_partenaires_actifs: partners.data().count,
    total_candidatures: candDocs.length,
    candidatures_en_attente: candDocs.filter((d) => d['status'] === 'en_attente').length,
    candidatures_approuvees: candDocs.filter((d) => d['status'] === 'approuve').length,
    total_portraits: portraits.data().count,
    total_matches: matchDocs.length,
    matches_mutuels: matchDocs.filter((d) => d['global_status'] === 'mutuel').length,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function genererNumerosCarte(): Promise<string> {
  const count = (await db.collection(COL_CARDS).count().get()).data().count
  const num = String(count + 1).padStart(5, '0')
  return `AP-${new Date().getFullYear()}-${num}`
}

function calculerExpiration(tier: AllianceCardTier): string {
  const jours = tier === 'PRESTIGE' ? 90 : tier === 'EXCELLENCE' ? 180 : 365
  const d = new Date()
  d.setDate(d.getDate() + jours)
  return d.toISOString()
}
