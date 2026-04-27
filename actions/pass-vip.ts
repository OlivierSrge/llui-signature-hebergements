'use server'
// actions/pass-vip.ts
// Pass VIP temporaire — activation, lecture, expiration, notifications J-3

import { db } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { serializeFirestoreDoc } from '@/lib/serialization'
import {
  PASS_VIP_CONFIGS,
  SKU_TO_GRADE,
  GRADE_VIP_ORDER,
  TAUX_COMMISSION_PASS,
  type PassVipActif,
  type PassVipAnonyme,
  type PassVipGrade,
} from '@/types/pass-vip'
import { updatePassVipStatutSheets } from '@/lib/sheets-pass-vip'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'

async function sendWhatsApp(to: string, message: string): Promise<void> {
  await fetch(`${APP_URL}/api/whatsapp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.ADMIN_API_KEY}` },
    body: JSON.stringify({ to, message }),
  }).catch((e) => console.warn('[pass-vip sendWhatsApp]', e))
}

function gradeFromStars(stars: number): string {
  if (stars >= 10000) return 'DIAMANT'
  if (stars >= 5000)  return 'SAPHIR'
  if (stars >= 2000)  return 'OR'
  if (stars >= 500)   return 'ARGENT'
  if (stars >= 100)   return 'BRONZE'
  return 'START'
}

function buildPassDoc(doc: FirebaseFirestore.DocumentSnapshot): PassVipActif {
  const d = serializeFirestoreDoc(doc.data()!)
  return {
    id: doc.id,
    client_uid: (d.client_uid as string) ?? '',
    client_telephone: (d.client_telephone as string) ?? '',
    grade_pass: (d.grade_pass as PassVipGrade) ?? 'ARGENT',
    grade_naturel: (d.grade_naturel as string) ?? 'START',
    prix_paye: (d.prix_paye as number) ?? 0,
    sku: (d.sku as string) ?? '',
    prescripteur_id: d.prescripteur_id as string | undefined,
    actif: (d.actif as boolean) ?? false,
    created_at: (d.created_at as string) ?? '',
    expires_at: (d.expires_at as string) ?? '',
    expire_notifie_j3: (d.expire_notifie_j3 as boolean) ?? false,
  }
}

// ─── activerPassVip ───────────────────────────────────────────────────────────

export interface ActiverPassParams {
  client_uid: string
  client_telephone: string
  sku: string
  prescripteur_id?: string
}

export async function activerPassVip(
  params: ActiverPassParams,
): Promise<{ success: boolean; error?: string; expires_at?: string }> {
  const { client_uid, client_telephone, sku, prescripteur_id } = params

  const grade_pass = SKU_TO_GRADE[sku]
  if (!grade_pass) return { success: false, error: `SKU inconnu : ${sku}` }
  const config = PASS_VIP_CONFIGS[grade_pass]

  try {
    // Vérifier pas de Pass actif
    const now = new Date()
    const activeSnap = await db.collection('pass_vip_actifs')
      .where('client_uid', '==', client_uid)
      .where('actif', '==', true)
      .get()
    const hasActive = activeSnap.docs.some(
      (d) => new Date(d.data().expires_at as string) > now,
    )
    if (hasActive) return { success: false, error: 'Vous avez déjà un Pass VIP actif' }

    // Vérifier grade naturel < grade pass
    const clientSnap = await db.collection('clients_fidelite').doc(client_uid).get()
    const gradeNaturel = clientSnap.exists
      ? gradeFromStars((clientSnap.data()!.total_stars_historique as number) ?? 0)
      : 'START'
    if (GRADE_VIP_ORDER[grade_pass] <= GRADE_VIP_ORDER[gradeNaturel]) {
      return { success: false, error: `Vous atteignez déjà le grade ${gradeNaturel} naturellement` }
    }

    const created_at = now.toISOString()
    const expiresDate = new Date(now.getTime() + config.duree_jours * 86400000)
    const expires_at = expiresDate.toISOString()

    const passRef = db.collection('pass_vip_actifs').doc()
    const clientRef = db.collection('clients_fidelite').doc(client_uid)

    await db.runTransaction(async (tx) => {
      tx.set(passRef, {
        client_uid, client_telephone,
        grade_pass, grade_naturel: gradeNaturel,
        prix_paye: config.prix_fcfa,
        sku, prescripteur_id: prescripteur_id ?? null,
        actif: true,
        created_at, expires_at,
        expire_notifie_j3: false,
      })
      tx.set(clientRef, {
        grade_pass_actif: grade_pass,
        pass_expires_at: expires_at,
        updated_at: FieldValue.serverTimestamp(),
      }, { merge: true })
    })

    // Commission prescripteur N1 non-bloquante
    if (prescripteur_id) {
      const commissionN1 = Math.round(config.prix_fcfa * TAUX_COMMISSION_PASS[1])
      const rev = Math.floor(config.prix_fcfa / 10000)
      const walletRef = db.collection('wallets_partenaires').doc(prescripteur_id)
      const commRef = db.collection('commissions_partenaires').doc()
      const nowStr = new Date().toISOString()
      await db.runTransaction(async (tx) => {
        tx.set(walletRef, {
          cash: FieldValue.increment(Math.round(commissionN1 * 0.7)),
          credits: FieldValue.increment(Math.round(commissionN1 * 0.3)),
          rev_total: FieldValue.increment(rev),
          updated_at: nowStr,
        }, { merge: true })
        tx.set(commRef, {
          partenaire_id: prescripteur_id,
          partenaire_source_id: client_uid,
          partenaire_source_grade: gradeNaturel,
          type_vente: 'boutique',
          niveau: 1,
          montant_vente: config.prix_fcfa,
          taux_commission: TAUX_COMMISSION_PASS[1],
          montant_commission: commissionN1,
          montant_cash: Math.round(commissionN1 * 0.7),
          montant_credits: Math.round(commissionN1 * 0.3),
          rev_generes: rev,
          statut: 'validee',
          reference_vente: `PASS-${passRef.id}`,
          created_at: nowStr, validee_at: nowStr,
        })
      }).catch((e) => console.warn('[activerPassVip] commission error:', e))
    }

    // Notif WhatsApp client
    const expiresFormatted = expiresDate.toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
    })
    await sendWhatsApp(
      client_telephone,
      `💎 Votre Pass VIP ${grade_pass} est activé !\nValable jusqu'au ${expiresFormatted}.\nProfitez de vos avantages L&Lui Stars.`,
    )

    return { success: true, expires_at }
  } catch (e: unknown) {
    console.error('[activerPassVip]', e)
    return { success: false, error: e instanceof Error ? e.message : 'Erreur interne' }
  }
}

// ─── getPassVipActif ──────────────────────────────────────────────────────────

export async function getPassVipActif(client_uid: string): Promise<PassVipActif | null> {
  const now = new Date()
  const snap = await db.collection('pass_vip_actifs')
    .where('client_uid', '==', client_uid)
    .where('actif', '==', true)
    .get()
  const actif = snap.docs
    .filter((d) => new Date(d.data().expires_at as string) > now)
    .map(buildPassDoc)
  return actif.length > 0 ? actif[0] : null
}

// ─── expirePassVip ────────────────────────────────────────────────────────────
// Appelé par cron quotidien

export async function expirePassVip(): Promise<{ expired_count: number }> {
  const now = new Date().toISOString()
  const snap = await db.collection('pass_vip_actifs')
    .where('actif', '==', true)
    .get()

  const expiredDocs = snap.docs.filter(
    (d) => (d.data().expires_at as string) < now,
  )
  if (expiredDocs.length === 0) return { expired_count: 0 }

  const batch = db.batch()
  for (const doc of expiredDocs) {
    const d = doc.data()
    batch.update(doc.ref, { actif: false })
    const clientRef = db.collection('clients_fidelite').doc(d.client_uid as string)
    batch.set(clientRef, {
      grade_pass_actif: null,
      pass_expires_at: null,
      updated_at: FieldValue.serverTimestamp(),
    }, { merge: true })
  }
  await batch.commit()

  // Notifs expiration non-bloquantes
  for (const doc of expiredDocs) {
    const d = doc.data()
    sendWhatsApp(
      d.client_telephone as string,
      `⏳ Votre Pass VIP ${d.grade_pass} a expiré.\nRenouvelez pour continuer à profiter de vos avantages L&Lui Stars.`,
    ).catch(() => {})
  }

  return { expired_count: expiredDocs.length }
}

// ─── notifierPassVipJ3 ────────────────────────────────────────────────────────
// Notification J-3 avant expiration

export async function notifierPassVipJ3(): Promise<{ notified_count: number }> {
  const now = new Date()
  const j3 = new Date(now.getTime() + 3 * 86400000).toISOString()

  const snap = await db.collection('pass_vip_actifs')
    .where('actif', '==', true)
    .where('expire_notifie_j3', '==', false)
    .get()

  const toNotify = snap.docs.filter(
    (d) => (d.data().expires_at as string) <= j3,
  )
  if (toNotify.length === 0) return { notified_count: 0 }

  const batch = db.batch()
  for (const doc of toNotify) {
    batch.update(doc.ref, { expire_notifie_j3: true })
  }
  await batch.commit()

  for (const doc of toNotify) {
    const d = doc.data()
    const expiresDate = new Date(d.expires_at as string)
    const formatted = expiresDate.toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long',
    })
    sendWhatsApp(
      d.client_telephone as string,
      `⏳ Votre Pass VIP ${d.grade_pass} expire dans 3 jours (le ${formatted}).\nRenouvelez sur la boutique L&Lui pour continuer vos avantages.`,
    ).catch(() => {})
  }

  return { notified_count: toNotify.length }
}

// ─── getPassVipParToken ───────────────────────────────────────────────────────
// Lecture d'un Pass VIP anonyme par son token.
// Cherche d'abord dans pass_vip_actifs (ancien système, token = doc ID),
// puis dans pass_vip_pending_orders (boutique Netlify, token = champ).

function parseGradeFromTypePassStr(typePass: string): PassVipGrade {
  const u = typePass.toUpperCase()
  if (u.includes('DIAMANT')) return 'DIAMANT'
  if (u.includes('SAPHIR'))  return 'SAPHIR'
  if (u.includes('OR'))      return 'OR'
  return 'ARGENT'
}

export async function getPassVipParToken(token: string): Promise<PassVipAnonyme | null> {
  if (!token || token.length < 4) return null

  // 1. Ancien système — token = doc ID dans pass_vip_actifs
  const oldDoc = await db.collection('pass_vip_actifs').doc(token).get()
  if (oldDoc.exists) {
    const d = serializeFirestoreDoc(oldDoc.data()!)
    const grade_pass = (d.grade_pass as PassVipGrade) ?? 'ARGENT'
    return {
      id: oldDoc.id,
      nom_usage: (d.nom_usage as string) ?? '',
      grade_pass,
      actif: (d.actif as boolean) ?? false,
      statut: ((d.statut as string) ?? 'actif') as PassVipAnonyme['statut'],
      created_at: (d.created_at as string) ?? '',
      expires_at: (d.expires_at as string) ?? '',
      activated_at: (d.activated_at as string) ?? undefined,
      nb_utilisations: (d.nb_utilisations as number) ?? 0,
      prescripteur_id: (d.prescripteur_id as string) ?? null,
      ref_lisible: `L&Lui Signature-${grade_pass}-${oldDoc.id.slice(0, 4).toUpperCase()}`,
      sheets_row: (d.sheets_row as number) ?? undefined,
      sheets_id: (d.sheets_id as string) ?? undefined,
      email: (d.email as string) ?? undefined,
      contact: (d.contact as string) ?? undefined,
    }
  }

  // 2. Nouveau système boutique — token = champ dans pass_vip_pending_orders
  const orderSnap = await db.collection('pass_vip_pending_orders')
    .where('token', '==', token)
    .limit(1)
    .get()
  if (orderSnap.empty) return null

  const orderDoc = orderSnap.docs[0]
  const order = serializeFirestoreDoc(orderDoc.data())
  const grade_pass = parseGradeFromTypePassStr((order.type_pass as string) ?? '')
  const ref = (order.ref_lisible as string) ?? `L&Lui-${grade_pass}-${token.slice(0, 4).toUpperCase()}`

  // Commande annulée
  if (order.statut === 'cancelled') {
    return {
      id: token,
      nom_usage: (order.nom_client as string) ?? '',
      grade_pass,
      actif: false,
      statut: 'expire',
      created_at: (order.date_commande as string) ?? '',
      expires_at: '',
      nb_utilisations: 0,
      prescripteur_id: null,
      ref_lisible: ref,
      email: (order.email_client as string) ?? undefined,
      contact: (order.tel_client as string) ?? undefined,
    }
  }

  // Commande confirmée → lire le pass actif dans pass_vip_boutique
  if (order.statut === 'confirmed' && order.pass_id) {
    const passDoc = await db.collection('pass_vip_boutique').doc(order.pass_id as string).get()
    if (passDoc.exists) {
      const p = serializeFirestoreDoc(passDoc.data()!)
      const isActif = (p.statut as string) === 'actif' && new Date(p.date_fin as string) > new Date()
      return {
        id: token,
        nom_usage: (p.nom as string) ?? '',
        grade_pass,
        actif: isActif,
        statut: isActif ? 'actif' : 'expire',
        created_at: (p.created_at as string) ?? '',
        expires_at: (p.date_fin as string) ?? '',
        nb_utilisations: 0,
        prescripteur_id: null,
        ref_lisible: ref,
        email: (p.email as string) ?? undefined,
        contact: (p.tel as string) ?? undefined,
      }
    }
  }

  // Commande en attente de paiement (pending)
  return {
    id: token,
    nom_usage: (order.nom_client as string) ?? '',
    grade_pass,
    actif: false,
    statut: 'pending',
    created_at: (order.date_commande as string) ?? '',
    expires_at: '',
    nb_utilisations: 0,
    prescripteur_id: null,
    ref_lisible: ref,
    email: (order.email_client as string) ?? undefined,
    contact: (order.tel_client as string) ?? undefined,
  }
}

// ─── activerPassAuPremierClic ─────────────────────────────────────────────────
// Appelée une seule fois à la première ouverture du lien.
// Idempotent : si déjà actif, ne fait rien.

export async function activerPassAuPremierClic(
  token: string,
): Promise<{ success: boolean; error?: string }> {
  if (!token) return { success: false, error: 'Token manquant' }

  try {
    const passRef = db.collection('pass_vip_actifs').doc(token)
    let sheetsRow: number | undefined
    let sheetsId: string | undefined
    let grade_pass: PassVipGrade = 'ARGENT'
    let prescripteur_id: string | null = null
    let prix_paye = 0

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(passRef)
      if (!snap.exists) throw new Error('Pass introuvable')

      const d = snap.data()!
      // Idempotent — déjà activé
      if (d.actif === true && d.statut === 'actif') return

      grade_pass = (d.grade_pass as PassVipGrade) ?? 'ARGENT'
      prescripteur_id = (d.prescripteur_id as string) ?? null
      prix_paye = (d.prix_paye as number) ?? 0
      sheetsRow = (d.sheets_row as number) ?? undefined
      sheetsId = (d.sheets_id as string) ?? undefined

      const config = PASS_VIP_CONFIGS[grade_pass]
      const now = new Date()
      const activated_at = now.toISOString()
      const expires_at = new Date(now.getTime() + config.duree_jours * 86400000).toISOString()

      tx.update(passRef, {
        actif: true,
        statut: 'actif',
        activated_at,
        expires_at,    // repart de maintenant
        updated_at: FieldValue.serverTimestamp(),
      })
    })

    // Commission prescripteur N1 à l'activation — non-bloquante
    if (prescripteur_id && prix_paye > 0) {
      const commissionN1 = Math.round(prix_paye * TAUX_COMMISSION_PASS[1])
      const rev = Math.floor(prix_paye / 10000)
      const walletRef = db.collection('wallets_partenaires').doc(prescripteur_id)
      const commRef = db.collection('commissions_partenaires').doc()
      const nowStr = new Date().toISOString()
      db.runTransaction(async (tx) => {
        tx.set(walletRef, {
          cash: FieldValue.increment(Math.round(commissionN1 * 0.7)),
          credits: FieldValue.increment(Math.round(commissionN1 * 0.3)),
          rev_total: FieldValue.increment(rev),
          updated_at: nowStr,
        }, { merge: true })
        tx.set(commRef, {
          partenaire_id: prescripteur_id,
          partenaire_source_id: null,
          partenaire_source_grade: 'ANONYME',
          type_vente: 'boutique',
          niveau: 1,
          montant_vente: prix_paye,
          taux_commission: TAUX_COMMISSION_PASS[1],
          montant_commission: commissionN1,
          montant_cash: Math.round(commissionN1 * 0.7),
          montant_credits: Math.round(commissionN1 * 0.3),
          rev_generes: rev,
          statut: 'validee',
          reference_vente: `PASS-${token}`,
          created_at: nowStr, validee_at: nowStr,
        })
      }).catch((e) => console.warn('[activerPassAuPremierClic] commission error:', e))
    }

    // Sync Google Sheets — non-bloquante
    if (sheetsRow) {
      updatePassVipStatutSheets(sheetsRow, sheetsId ?? null).catch(
        (e) => console.warn('[activerPassAuPremierClic] sheets sync error:', e),
      )
    }

    return { success: true }
  } catch (e: unknown) {
    console.error('[activerPassAuPremierClic]', e)
    return { success: false, error: e instanceof Error ? e.message : 'Erreur interne' }
  }
}

// ─── sauvegarderVipPartenaire ─────────────────────────────────────────────────
// Sauvegarde les préférences Pass VIP d'un partenaire prescripteur

export async function sauvegarderVipPartenaire(
  partenaire_id: string,
  accepte_pass_vip: boolean,
  grades_pass_acceptes: PassVipGrade[],
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection('prescripteurs_partenaires').doc(partenaire_id).update({
      accepte_pass_vip,
      grades_pass_acceptes: accepte_pass_vip ? grades_pass_acceptes : [],
      updated_at: new Date().toISOString(),
    })
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur' }
  }
}
