'use server'
// actions/alliance-privee-matching.ts — Matching & Chat Alliance Privée
// NE PAS importer twilio — utiliser fetch /api/whatsapp/send

import { db } from '@/lib/firebase'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import {
  calculateCompatibility,
  findCompatibleProfiles,
  getPortraitById,
  type CompatibilityMatch,
} from '@/lib/alliance-privee-matching'
import {
  sendInterestReceivedNotification,
  sendMutualInterestNotification,
  sendNewMessageNotification,
} from '@/lib/alliance-privee-notifications'
import { analyserMessageSentinelle } from '@/types/alliance-privee'

// ─── Collections ──────────────────────────────────────────────────────────────

const COL_INTERESTS = 'alliance_privee_interests'
const COL_MATCHES   = 'alliance_privee_matches'
const COL_MESSAGES  = 'alliance_privee_chat_messages'
const COL_PORTRAITS = 'alliance_privee_portraits_verified'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InterestDoc {
  id: string
  from_member_id: string
  to_member_id: string
  status: 'PENDING' | 'MUTUAL' | 'EXPIRED'
  date_created: string
  date_mutual?: string
  compatibility_score: number
}

export interface MatchDoc {
  id: string
  member_a_id: string
  member_b_id: string
  compatibility_score: number
  status: 'ACTIVE' | 'CHAT_ENABLED' | 'MEETING_SCHEDULED' | 'CLOSED'
  date_matched: string
  chat_enabled: boolean
  last_message_at?: string
  messages_count: number
}

export interface ChatMessageDoc {
  id: string
  match_id: string
  sender_id: string
  content: string
  blocked: boolean
  block_reason?: string
  date_sent: string
  read: boolean
  read_at?: string
}

// ─── Marquer un intérêt ───────────────────────────────────────────────────────

export async function marquerInteret(params: {
  fromMemberId: string
  toMemberId: string
}): Promise<{ success: boolean; mutual?: boolean; matchId?: string; error?: string }> {
  const { fromMemberId, toMemberId } = params
  try {
    // Vérifier que les deux membres existent
    const [profileA, profileB] = await Promise.all([
      getPortraitById(fromMemberId),
      getPortraitById(toMemberId),
    ])
    if (!profileA) return { success: false, error: 'Votre profil est introuvable' }
    if (!profileB) return { success: false, error: 'Profil cible introuvable' }

    // Éviter doublons — vérifier si intérêt déjà envoyé
    const existing = await db
      .collection(COL_INTERESTS)
      .where('from_member_id', '==', fromMemberId)
      .where('to_member_id', '==', toMemberId)
      .limit(1)
      .get()
    if (!existing.empty) {
      return { success: false, error: 'Intérêt déjà envoyé à ce profil' }
    }

    // Calculer score
    const { score } = calculateCompatibility(profileA, profileB)
    const now = new Date().toISOString()

    // Créer l'intérêt
    const interestRef = db.collection(COL_INTERESTS).doc()
    await interestRef.set({
      from_member_id: fromMemberId,
      to_member_id: toMemberId,
      status: 'PENDING',
      date_created: now,
      compatibility_score: score,
    })

    // Vérifier intérêt inverse (mutuel ?)
    const reverseSnap = await db
      .collection(COL_INTERESTS)
      .where('from_member_id', '==', toMemberId)
      .where('to_member_id', '==', fromMemberId)
      .where('status', '==', 'PENDING')
      .limit(1)
      .get()

    if (!reverseSnap.empty) {
      // 🎉 INTÉRÊT MUTUEL
      const matchRef = db.collection(COL_MATCHES).doc()
      const dateMutual = new Date().toISOString()

      await Promise.all([
        matchRef.set({
          member_a_id: fromMemberId,
          member_b_id: toMemberId,
          compatibility_score: score,
          status: 'CHAT_ENABLED',
          date_matched: dateMutual,
          chat_enabled: true,
          messages_count: 0,
        }),
        interestRef.update({ status: 'MUTUAL', date_mutual: dateMutual }),
        reverseSnap.docs[0].ref.update({ status: 'MUTUAL', date_mutual: dateMutual }),
      ])

      // Notifications asynchrones (ne bloquent pas la réponse)
      sendMutualInterestNotification(fromMemberId, toMemberId, matchRef.id).catch(console.warn)

      return { success: true, mutual: true, matchId: matchRef.id }
    }

    // Pas mutuel — notifier la cible
    sendInterestReceivedNotification(toMemberId, fromMemberId).catch(console.warn)

    return { success: true, mutual: false }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[marquerInteret]', msg)
    return { success: false, error: msg }
  }
}

// ─── Vérifier si intérêt déjà envoyé ─────────────────────────────────────────

export async function checkInteretEnvoye(
  fromMemberId: string,
  toMemberId: string
): Promise<boolean> {
  const snap = await db
    .collection(COL_INTERESTS)
    .where('from_member_id', '==', fromMemberId)
    .where('to_member_id', '==', toMemberId)
    .limit(1)
    .get()
  return !snap.empty
}

// ─── Lire les profils compatibles ────────────────────────────────────────────

export async function getProfilsCompatibles(
  memberId: string
): Promise<CompatibilityMatch[]> {
  return findCompatibleProfiles(memberId, 12)
}

// ─── Intérêts envoyés par le membre ──────────────────────────────────────────

export async function getMesInterets(memberId: string): Promise<InterestDoc[]> {
  const snap = await db
    .collection(COL_INTERESTS)
    .where('from_member_id', '==', memberId)
    .orderBy('date_created', 'desc')
    .get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as InterestDoc)
}

// ─── Intérêts reçus ───────────────────────────────────────────────────────────

export async function getInteretsRecus(memberId: string): Promise<InterestDoc[]> {
  const snap = await db
    .collection(COL_INTERESTS)
    .where('to_member_id', '==', memberId)
    .where('status', '==', 'PENDING')
    .orderBy('date_created', 'desc')
    .get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as InterestDoc)
}

// ─── Mes matchs ───────────────────────────────────────────────────────────────

export async function getMesMatchs(memberId: string): Promise<MatchDoc[]> {
  const [snapA, snapB] = await Promise.all([
    db
      .collection(COL_MATCHES)
      .where('member_a_id', '==', memberId)
      .where('chat_enabled', '==', true)
      .orderBy('date_matched', 'desc')
      .get(),
    db
      .collection(COL_MATCHES)
      .where('member_b_id', '==', memberId)
      .where('chat_enabled', '==', true)
      .orderBy('date_matched', 'desc')
      .get(),
  ])
  const all = [
    ...snapA.docs.map((d) => ({ id: d.id, ...d.data() }) as MatchDoc),
    ...snapB.docs.map((d) => ({ id: d.id, ...d.data() }) as MatchDoc),
  ]
  // Dédoublonner et trier
  const seen = new Set<string>()
  return all
    .filter((m) => {
      if (seen.has(m.id)) return false
      seen.add(m.id)
      return true
    })
    .sort((a, b) => (b.last_message_at ?? b.date_matched).localeCompare(a.last_message_at ?? a.date_matched))
}

// ─── Détail d'un match ────────────────────────────────────────────────────────

export async function getMatch(matchId: string): Promise<MatchDoc | null> {
  const snap = await db.collection(COL_MATCHES).doc(matchId).get()
  if (!snap.exists) return null
  return { id: snap.id, ...snap.data() } as MatchDoc
}

// ─── Messages d'un chat ───────────────────────────────────────────────────────

export async function getChatMessages(matchId: string): Promise<ChatMessageDoc[]> {
  const snap = await db
    .collection(COL_MESSAGES)
    .where('match_id', '==', matchId)
    .orderBy('date_sent', 'asc')
    .get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatMessageDoc)
}

// ─── Envoyer un message ───────────────────────────────────────────────────────

export async function envoyerMessage(params: {
  matchId: string
  senderId: string
  content: string
}): Promise<{ success: boolean; blocked?: boolean; reason?: string; error?: string }> {
  const { matchId, senderId, content } = params
  try {
    const trimmed = content.trim()
    if (!trimmed) return { success: false, error: 'Message vide' }
    if (trimmed.length > 2000) return { success: false, error: 'Message trop long (max 2000 caractères)' }

    // Vérifier match actif
    const matchSnap = await db.collection(COL_MATCHES).doc(matchId).get()
    if (!matchSnap.exists) return { success: false, error: 'Conversation introuvable' }
    const match = matchSnap.data() as Omit<MatchDoc, 'id'>
    if (!match.chat_enabled) return { success: false, error: 'Chat non activé pour ce match' }
    if (match.status === 'CLOSED') return { success: false, error: 'Cette conversation a été fermée' }

    // Vérifier que le sender fait partie du match
    if (match.member_a_id !== senderId && match.member_b_id !== senderId) {
      return { success: false, error: 'Accès non autorisé' }
    }

    // SENTINELLE IA
    const sentinelle = analyserMessageSentinelle(trimmed)
    const now = new Date().toISOString()

    if (!sentinelle.ok) {
      // Enregistrer le message bloqué
      await db.collection(COL_MESSAGES).add({
        match_id: matchId,
        sender_id: senderId,
        content: trimmed,
        blocked: true,
        block_reason: sentinelle.reason,
        date_sent: now,
        read: false,
      })
      return {
        success: false,
        blocked: true,
        reason: `Pour votre sécurité, l'échange de coordonnées directes est réservé aux rendez-vous officiels organisés par L&Lui Signature.`,
      }
    }

    // Message OK
    const msgRef = db.collection(COL_MESSAGES).doc()
    const recipientId = match.member_a_id === senderId ? match.member_b_id : match.member_a_id

    await Promise.all([
      msgRef.set({
        match_id: matchId,
        sender_id: senderId,
        content: trimmed,
        blocked: false,
        date_sent: now,
        read: false,
      }),
      db.collection(COL_MATCHES).doc(matchId).update({
        last_message_at: now,
        messages_count: FieldValue.increment(1),
      }),
    ])

    // Récupérer le prénom de l'expéditeur pour la notification
    db.collection(COL_PORTRAITS)
      .doc(senderId)
      .get()
      .then((snap) => {
        if (snap.exists) {
          const prenom = snap.data()!.prenom as string
          sendNewMessageNotification(recipientId, prenom, matchId, trimmed).catch(console.warn)
        }
      })
      .catch(console.warn)

    return { success: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[envoyerMessage]', msg)
    return { success: false, error: msg }
  }
}

// ─── Marquer messages comme lus ───────────────────────────────────────────────

export async function marquerMessagesLus(matchId: string, memberId: string): Promise<void> {
  const snap = await db
    .collection(COL_MESSAGES)
    .where('match_id', '==', matchId)
    .where('read', '==', false)
    .get()

  const batch = db.batch()
  const now = new Date().toISOString()
  snap.docs.forEach((doc) => {
    if (doc.data().sender_id !== memberId) {
      batch.update(doc.ref, { read: true, read_at: now })
    }
  })
  await batch.commit()
}

// ─── Stats dashboard membre ───────────────────────────────────────────────────

export interface MemberDashboardStats {
  matchs_actifs: number
  interets_envoyes: number
  interets_recus: number
  messages_non_lus: number
  profils_compatibles_count: number
}

export async function getMemberDashboardStats(
  memberId: string
): Promise<MemberDashboardStats> {
  const [matchsA, matchsB, interetsEnvoyes, interetsRecus, msgsNonLus] = await Promise.all([
    db
      .collection(COL_MATCHES)
      .where('member_a_id', '==', memberId)
      .where('chat_enabled', '==', true)
      .get(),
    db
      .collection(COL_MATCHES)
      .where('member_b_id', '==', memberId)
      .where('chat_enabled', '==', true)
      .get(),
    db
      .collection(COL_INTERESTS)
      .where('from_member_id', '==', memberId)
      .get(),
    db
      .collection(COL_INTERESTS)
      .where('to_member_id', '==', memberId)
      .where('status', '==', 'PENDING')
      .get(),
    db
      .collection(COL_MESSAGES)
      .where('read', '==', false)
      .get(),
  ])

  // Filtrer les messages non lus qui ne sont pas du membre
  const allMatchIds = new Set([
    ...matchsA.docs.map((d) => d.id),
    ...matchsB.docs.map((d) => d.id),
  ])
  const nonLus = msgsNonLus.docs.filter(
    (d) =>
      allMatchIds.has(d.data().match_id) && d.data().sender_id !== memberId
  )

  return {
    matchs_actifs: matchsA.size + matchsB.size,
    interets_envoyes: interetsEnvoyes.size,
    interets_recus: interetsRecus.size,
    messages_non_lus: nonLus.length,
    profils_compatibles_count: 0, // calculé côté client
  }
}

// ─── Admin — tous les matchs ──────────────────────────────────────────────────

export async function getAllMatchs(): Promise<MatchDoc[]> {
  const snap = await db
    .collection(COL_MATCHES)
    .orderBy('date_matched', 'desc')
    .limit(100)
    .get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MatchDoc)
}

export async function getAllChatMessages(matchId: string): Promise<ChatMessageDoc[]> {
  const snap = await db
    .collection(COL_MESSAGES)
    .where('match_id', '==', matchId)
    .orderBy('date_sent', 'asc')
    .get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatMessageDoc)
}

export async function fermerMatch(
  matchId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection(COL_MATCHES).doc(matchId).update({
      status: 'CLOSED',
      chat_enabled: false,
    })
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}
