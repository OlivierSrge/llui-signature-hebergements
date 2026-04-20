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
  type PassVipGrade,
} from '@/types/pass-vip'

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
        grade_pass, grade_naturel,
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
