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
  type CardDetails,
  type AlliancePayment,
  type GenderType,
  type LocationType,
  analyserMessageSentinelle,
  TIER_CONFIGS,
  getPrixPourProfil,
} from '@/types/alliance-privee'
import { sendBrevoEmail } from '@/lib/email-brevo'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'

// ─── Collections ──────────────────────────────────────────────────────────────

const COL_PARTNERS = 'alliance_privee_partners'
const COL_CARDS = 'alliance_privee_cards'
const COL_APPLICATIONS = 'alliance_privee_members_applications'
const COL_PORTRAITS = 'alliance_privee_portraits_verified'
const COL_MATCHES = 'alliance_privee_matches'
const COL_CHATS = 'alliance_privee_private_chats'
const COL_MESSAGES = 'alliance_privee_chat_messages'
const COL_PAYMENTS = 'alliance_privee_payments'

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
  // pid dans l'URL = doc ID Firestore (pas un champ partenaire_id)
  const snap = await db.collection(COL_PARTNERS).doc(partenaireId).get()
  if (!snap.exists) return null
  const data = snap.data()!
  if (!data.alliance_active) return null
  return { id: snap.id, ...data } as AlliancePartner
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

// ─── Paiements ────────────────────────────────────────────────────────────────

export async function enregistrerPaiement(data: {
  tier: AllianceCardTier
  gender: GenderType
  location: LocationType
  partenaire_id: string
  proof_url: string
}): Promise<{ success: boolean; payment_id?: string; error?: string }> {
  try {
    const { montant, devise, methode } = getPrixPourProfil(data.tier, data.gender, data.location)
    const now = new Date().toISOString()
    const ref = await db.collection(COL_PAYMENTS).add({
      tier: data.tier,
      gender: data.gender,
      location: data.location,
      partenaire_id: data.partenaire_id,
      montant,
      devise,
      methode,
      proof_url: data.proof_url,
      statut: 'PENDING',
      date_creation: now,
    } as Omit<AlliancePayment, 'id'>)
    return { success: true, payment_id: ref.id }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function getPaiementsEnAttente(): Promise<AlliancePayment[]> {
  const snap = await db
    .collection(COL_PAYMENTS)
    .orderBy('date_creation', 'desc')
    .get()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }) as AlliancePayment)
}

export async function verifierPaiement(
  paymentId: string,
  decision: 'VERIFIED' | 'REJECTED',
  adminId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: any = { statut: decision, verified_by: adminId, date_verification: now }
    if (reason) update.rejection_reason = reason
    await db.collection(COL_PAYMENTS).doc(paymentId).update(update)

    // Répercuter sur la candidature liée
    const appSnap = await db
      .collection(COL_APPLICATIONS)
      .where('payment_id', '==', paymentId)
      .limit(1)
      .get()
    if (!appSnap.empty) {
      await appSnap.docs[0].ref.update({
        payment_proof_verified: decision === 'VERIFIED',
        updated_at: now,
      })
    }

    revalidatePath('/admin/alliance-privee')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// ─── Candidatures ─────────────────────────────────────────────────────────────

export async function soumettreCandidat(
  data: Omit<AllianceApplication, 'id' | 'status' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const now = new Date().toISOString()
    const ref = await db.collection(COL_APPLICATIONS).add({
      ...data,
      payment_proof_verified: false,
      charte_acceptee: data.charte_acceptee ?? false,
      charte_date_acceptation: data.charte_acceptee ? now : null,
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

    // Bloquer approbation si paiement non vérifié
    if (decision === 'approuve' && !app.payment_proof_verified) {
      // Vérifier directement dans la collection paiements
      if (app.payment_id) {
        const paySnap = await db.collection(COL_PAYMENTS).doc(app.payment_id).get()
        const payData = paySnap.exists ? paySnap.data() : null
        if (!payData || payData.statut !== 'VERIFIED') {
          return { success: false, error: 'Impossible — paiement non vérifié. Vérifiez le justificatif dans l\'onglet Paiements.' }
        }
        // Mettre à jour le flag sur la candidature
        await appRef.update({ payment_proof_verified: true })
      } else {
        return { success: false, error: 'Impossible — aucun paiement lié à cette candidature.' }
      }
    }

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

      // Lien vers la carte
      const carteUrl = `${APP_URL}/alliance-privee/carte?card_id=${cardRef.id}`

      // Notif candidat WhatsApp avec lien carte
      await sendWhatsApp(
        app.telephone,
        `✦ *Alliance Privée L&Lui* — Félicitations !\n\nVotre candidature ${app.tier_souhaite} a été *approuvée*.\nVotre carte membre *${cardNumber}* est active.\n\n🎴 Accédez à votre carte :\n${carteUrl}\n\nBienvenue dans le cercle sélectif.`
      )

      // Email si fourni
      if (app.email) {
        const cardDetails = await getMemberCardDetails(cardRef.id)
        if (cardDetails) {
          await sendCardByEmail(cardRef.id, app.email, cardDetails)
        }
      }
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

// ─── Carte membre — lecture + email ───────────────────────────────────────────

export async function getMemberCardDetails(cardId: string): Promise<CardDetails | null> {
  const cardSnap = await db.collection(COL_CARDS).doc(cardId).get()
  if (!cardSnap.exists) return null
  const card = { id: cardSnap.id, ...cardSnap.data() } as AllianceMemberCard

  const [portraitSnap, partnerSnap] = await Promise.all([
    card.portrait_id ? db.collection(COL_PORTRAITS).doc(card.portrait_id).get() : Promise.resolve(null),
    db.collection(COL_PARTNERS).doc(card.partenaire_id).get(),
  ])

  const portrait = portraitSnap?.exists ? portraitSnap.data() as AlliancePortraitVerified : null
  const partner = partnerSnap.exists ? partnerSnap.data() as AlliancePartner : null

  return {
    card_id: card.id,
    card_number: card.card_number,
    tier: card.tier,
    status: card.status,
    activated_at: card.activated_at,
    expires_at: card.expires_at,
    prix_paye_fcfa: card.prix_paye_fcfa,
    partenaire_id: card.partenaire_id,
    prenom: portrait?.prenom ?? 'Membre',
    age: portrait?.age ?? 0,
    ville: portrait?.ville ?? '',
    profession: portrait?.profession ?? '',
    photo_url: portrait?.photo_url,
    nom_etablissement: partner?.nom_etablissement ?? 'Alliance Privée',
  }
}

export async function sendCardByEmail(
  cardId: string,
  email: string,
  cardDetails: CardDetails
): Promise<{ success: boolean; error?: string }> {
  const cardUrl = `${APP_URL}/alliance-privee/carte?card_id=${cardId}`
  const config = TIER_CONFIGS[cardDetails.tier]
  const expiresFormatted = new Date(cardDetails.expires_at).toLocaleDateString('fr-FR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const gradientMap: Record<string, string> = {
    PRESTIGE: 'linear-gradient(135deg, #1a0e00 0%, #2d1a00 50%, #1a0e00 100%)',
    EXCELLENCE: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)',
    ELITE: 'linear-gradient(135deg, #0a0010 0%, #1a0030 50%, #0a0010 100%)',
  }
  const accentMap: Record<string, string> = {
    PRESTIGE: '#C9A84C',
    EXCELLENCE: '#E8E8E8',
    ELITE: '#B9F2FF',
  }
  const gradient = gradientMap[cardDetails.tier] ?? gradientMap.PRESTIGE
  const accent = accentMap[cardDetails.tier] ?? accentMap.PRESTIGE

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;padding:0 20px;">

    <!-- En-tête -->
    <div style="text-align:center;margin-bottom:32px;">
      <p style="color:#C9A84C;font-size:11px;letter-spacing:4px;text-transform:uppercase;margin:0 0 8px;">✦ Alliance Privée ✦</p>
      <h1 style="color:#ffffff;font-size:22px;font-weight:300;margin:0;">Votre carte membre est prête</h1>
    </div>

    <!-- Carte digitale -->
    <div style="background:${gradient};border:1px solid ${accent}33;border-radius:20px;padding:32px;margin-bottom:24px;position:relative;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;">
        <div>
          <p style="color:${accent};font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 4px;">Alliance Privée</p>
          <p style="color:${accent};font-size:16px;font-weight:600;margin:0;">${config.emoji} ${config.label}</p>
        </div>
        <p style="color:${accent}99;font-size:11px;margin:0;font-family:monospace;">${cardDetails.card_number}</p>
      </div>
      <p style="color:#ffffff;font-size:24px;font-weight:300;letter-spacing:2px;margin:0 0 4px;">${cardDetails.prenom}</p>
      <p style="color:#ffffff66;font-size:12px;margin:0 0 24px;">${cardDetails.profession} · ${cardDetails.ville}</p>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;">
        <div>
          <p style="color:#ffffff44;font-size:9px;text-transform:uppercase;letter-spacing:2px;margin:0 0 2px;">Expire le</p>
          <p style="color:#ffffff88;font-size:12px;margin:0;">${expiresFormatted}</p>
        </div>
        <p style="color:${accent}88;font-size:22px;margin:0;">♛</p>
      </div>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:32px;">
      <a href="${cardUrl}" style="display:inline-block;background:${accent};color:#000000;font-size:13px;font-weight:600;padding:14px 32px;border-radius:12px;text-decoration:none;letter-spacing:0.5px;">
        Voir ma carte en ligne →
      </a>
    </div>

    <!-- Pied de page -->
    <div style="border-top:1px solid #ffffff0f;padding-top:24px;text-align:center;">
      <p style="color:#ffffff33;font-size:11px;line-height:1.6;margin:0;">
        ${cardDetails.nom_etablissement} · Alliance Privée L&Lui<br>
        Toutes vos informations sont traitées avec la plus stricte confidentialité.
      </p>
    </div>
  </div>
</body>
</html>`

  const ok = await sendBrevoEmail({
    to: email,
    toName: cardDetails.prenom,
    subject: `✦ Votre carte Alliance Privée ${config.label} — ${cardDetails.card_number}`,
    htmlContent: html,
  })

  return ok ? { success: true } : { success: false, error: 'Échec envoi Brevo' }
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
