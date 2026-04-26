'use server'

import { db } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { getParametresPlateforme } from '@/actions/parametres'
import { revalidatePath } from 'next/cache'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'
async function sendWhatsApp(to: string, message: string): Promise<void> {
  await fetch(`${APP_URL}/api/whatsapp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.ADMIN_API_KEY}` },
    body: JSON.stringify({ to, message }),
  }).catch((e) => console.warn('[sendWhatsApp codes-sessions]', e))
}
import { appendCodeSessionAffilie, creerAffilie, genererCodePromo } from '@/lib/sheetsCanal2'

// ─── Types ────────────────────────────────────────────────────

export type TypePartenaire = 'hotel' | 'restaurant' | 'agence' | 'bar' | 'plage' | 'autre'
export type StatutPartenaire = 'actif' | 'suspendu' | 'expire'
export type RemiseType = 'reduction_pct' | 'non_financier'
export type RedirectionPrioritaire = 'boutique' | 'hebergements'
export type StatutCode = 'actif' | 'epuise' | 'expire'
export type CanalUtilisation = 'hebergement' | 'boutique'

export interface PrescripteurPartenaire {
  uid: string
  nom_etablissement: string
  type: TypePartenaire
  telephone: string
  adresse: string
  email?: string
  statut: StatutPartenaire
  // Remise
  remise_type: RemiseType
  remise_valeur_pct: number | null
  remise_description: string | null
  // Redirection
  redirection_prioritaire: RedirectionPrioritaire
  // Forfait
  forfait_type: 'mensuel' | 'annuel'
  forfait_montant_fcfa: number
  forfait_debut: string
  forfait_expire_at: string
  forfait_statut: 'actif' | 'expire' | 'grace'
  // QR
  qr_code_url: string
  qr_code_data: string
  qr_genere_le?: string
  // Stats
  total_scans: number
  total_codes_generes: number
  total_utilisations: number
  total_clients_uniques: number
  total_ca_hebergements_fcfa: number
  total_ca_boutique_fcfa: number
  total_commissions_fcfa: number
  created_at: string
  created_by: string
  // Vitrine Marketing
  subscriptionLevel?: 'free' | 'premium'
  carouselImages?: string[]     // max 5 URLs
  defaultImage?: string         // image enseigne (Free + Premium)
  photoUrl?: string             // logo/photo profil
  carousel_interval_sec?: number // durée d'affichage par image (défaut 6s)
  premium_expire_at?: string     // expiration abonnement Premium (ISO)
  premium_activated_at?: string  // date d'activation Premium (ISO)
  // Géolocalisation
  latitude?: number | null
  longitude?: number | null
  adresse_gps?: string | null
  // Stars fidélité
  solde_provision?: number       // provision Stars disponible (FCFA)
  total_ca_stars_fcfa?: number   // CA total encaissé via Stars
  avantages_hors_stars?: string  // texte libre : petits plus de l'établissement
  code_promo_affilie?: string    // code promo partenaire ex: "MAMINDOR-2026"
}

export interface CodeSession {
  code: string
  prescripteur_partenaire_id: string
  nom_partenaire: string
  type_partenaire: string
  remise_type: RemiseType
  remise_valeur_pct: number | null
  remise_description: string | null
  redirection_prioritaire: RedirectionPrioritaire
  created_at: string
  expire_at: string
  max_utilisations: number
  nb_utilisations: number
  statut: StatutCode
  utilisations: {
    used_at: string
    canal: CanalUtilisation
    montant_fcfa: number
    commission_fcfa: number
    reservation_id: string | null
  }[]
  // Vitrine partenaire (chargés depuis prescripteurs_partenaires)
  photoUrl?: string
  defaultImage?: string
  carouselImages?: string[]
  subscriptionLevel?: 'free' | 'premium'
  carousel_interval_sec?: number
  // Stars fidélité (live depuis prescripteurs_partenaires)
  client_id?: string             // téléphone lié après OTP
  avantages_hors_stars?: string  // petits plus de l'établissement
  code_promo_affilie?: string    // ex: "MAMINDOR-2026"
}

// ─── Helpers ───────────────────────────────────────────────────

function getRedirectionParDefaut(type: TypePartenaire): RedirectionPrioritaire {
  return type === 'hotel' ? 'boutique' : 'hebergements'
}

async function genererCodeUnique(): Promise<string> {
  let code = ''
  let existe = true
  while (existe) {
    code = Math.floor(100000 + Math.random() * 900000).toString()
    const snap = await db.collection('codes_sessions').doc(code).get()
    existe = snap.exists && (snap.data()?.statut === 'actif')
  }
  return code
}

// ─── Actions Prescripteurs Partenaires ────────────────────────

/** Crée un prescripteur partenaire */
export async function creerPrescripteurPartenaire(data: {
  nom_etablissement: string
  type: TypePartenaire
  telephone: string
  adresse: string
  email?: string
  latitude?: number | null
  longitude?: number | null
  adresse_gps?: string | null
  remise_type: RemiseType
  remise_valeur_pct: number | null
  remise_description: string | null
  forfait_type: 'mensuel' | 'annuel'
  created_by?: string
}): Promise<{ success: boolean; uid?: string; code_promo?: string; error?: string }> {
  try {
    const params = await getParametresPlateforme()
    const maintenant = new Date()
    const forfaitMontant = data.forfait_type === 'mensuel'
      ? params.forfait_prescripteur_mensuel_fcfa
      : params.forfait_prescripteur_annuel_fcfa
    const dureeMs = data.forfait_type === 'mensuel' ? 30 * 24 * 3600 * 1000 : 365 * 24 * 3600 * 1000
    const expireAt = new Date(maintenant.getTime() + dureeMs)

    const ref = db.collection('prescripteurs_partenaires').doc()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'
    const qrData = `${appUrl}/promo/${ref.id}`

    // Générer le code promo affilié (stable, basé sur le nom)
    const code_promo_affilie = genererCodePromo(data.nom_etablissement)

    await ref.set({
      uid: ref.id,
      nom_etablissement: data.nom_etablissement,
      type: data.type,
      telephone: data.telephone,
      adresse: data.adresse,
      email: data.email ?? '',
      statut: 'actif',
      remise_type: data.remise_type,
      remise_valeur_pct: data.remise_valeur_pct,
      remise_description: data.remise_description,
      redirection_prioritaire: getRedirectionParDefaut(data.type),
      forfait_type: data.forfait_type,
      forfait_montant_fcfa: forfaitMontant,
      forfait_debut: maintenant.toISOString(),
      forfait_expire_at: expireAt.toISOString(),
      forfait_statut: 'actif',
      qr_code_url: '',
      qr_code_data: qrData,
      qr_genere_le: maintenant.toISOString(),
      code_promo_affilie,
      ...(data.latitude != null && data.longitude != null
        ? { latitude: data.latitude, longitude: data.longitude, adresse_gps: data.adresse_gps ?? '' }
        : {}),
      total_scans: 0,
      total_codes_generes: 0,
      total_utilisations: 0,
      total_clients_uniques: 0,
      total_ca_hebergements_fcfa: 0,
      total_ca_boutique_fcfa: 0,
      total_commissions_fcfa: 0,
      created_at: maintenant.toISOString(),
      created_by: data.created_by ?? 'admin',
    })

    // Insérer dans Affiliés_Codes (awaited — Vercel Lambda sinon kill la promise)
    try {
      const affilieResult = await creerAffilie({
        nom_etablissement: data.nom_etablissement,
        email: data.email ?? '',
        reduction_pct: data.remise_valeur_pct ?? 0,
        commission_pct: params.commission_partenaire_pct,
      })
      console.log('[creerPrescripteurPartenaire] creerAffilie result:', affilieResult)
    } catch (e) {
      console.warn('[creerPrescripteurPartenaire] creerAffilie failed:', e)
    }

    revalidatePath('/admin/prescripteurs-partenaires')
    return { success: true, uid: ref.id, code_promo: code_promo_affilie }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur' }
  }
}

/** Lit un prescripteur partenaire par ID */
export async function getPrescripteurPartenaire(id: string): Promise<PrescripteurPartenaire | null> {
  const snap = await db.collection('prescripteurs_partenaires').doc(id).get()
  if (!snap.exists) return null
  return { uid: snap.id, ...(snap.data() as Omit<PrescripteurPartenaire, 'uid'>) }
}

/** Liste tous les prescripteurs partenaires */
export async function listerPrescripteursPartenaires(): Promise<PrescripteurPartenaire[]> {
  const snap = await db.collection('prescripteurs_partenaires')
    .orderBy('created_at', 'desc').get()
  return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<PrescripteurPartenaire, 'uid'>) }))
}

// ─── Actions Codes Sessions ────────────────────────────────────

/** Génère un code 6 chiffres suite au scan QR */
export async function genererCodeSession(
  prescripteurId: string
): Promise<{ success: boolean; code?: string; redirection?: RedirectionPrioritaire; error?: string }> {
  try {
    const partenaire = await getPrescripteurPartenaire(prescripteurId)
    if (!partenaire) return { success: false, error: 'Partenaire introuvable' }
    if (partenaire.statut !== 'actif') return { success: false, error: 'partenaire_inactif' }
    const now = new Date()
    if (new Date(partenaire.forfait_expire_at) < now) return { success: false, error: 'partenaire_inactif' }

    const code = await genererCodeUnique()
    const expireAt = new Date(now.getTime() + 48 * 3600 * 1000)

    const session: Omit<CodeSession, 'code'> = {
      prescripteur_partenaire_id: prescripteurId,
      nom_partenaire: partenaire.nom_etablissement,
      type_partenaire: partenaire.type,
      remise_type: partenaire.remise_type,
      remise_valeur_pct: partenaire.remise_valeur_pct,
      remise_description: partenaire.remise_description,
      redirection_prioritaire: partenaire.redirection_prioritaire,
      created_at: now.toISOString(),
      expire_at: expireAt.toISOString(),
      max_utilisations: 5,
      nb_utilisations: 0,
      statut: 'actif',
      utilisations: [],
    }

    await db.collection('codes_sessions').doc(code).set(session)

    // Incrémenter stats partenaire
    await db.collection('prescripteurs_partenaires').doc(prescripteurId).update({
      total_scans: FieldValue.increment(1),
      total_codes_generes: FieldValue.increment(1),
    })

    // SMS WhatsApp partenaire
    try {
      await sendWhatsApp(partenaire.telephone,
        `📱 QR scanné dans votre établissement !\nCode généré : ${code}\nValable 48h — max 5 utilisations.\n— L&Lui Signature`
      )
    } catch {}

    // Insérer dans Affiliés_Codes pour validation boutique Netlify
    appendCodeSessionAffilie({
      code,
      nom_partenaire: partenaire.nom_etablissement,
      email_partenaire: partenaire.email ?? '',
      reduction_pct: partenaire.remise_valeur_pct ?? 0,
      commission_pct: 8,
    }).catch((e) => console.warn('[genererCodeSession] appendCodeSessionAffilie:', e))

    return { success: true, code, redirection: partenaire.redirection_prioritaire }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur' }
  }
}

/** Lit un code session */
export async function getCodeSession(code: string): Promise<CodeSession | null> {
  const snap = await db.collection('codes_sessions').doc(code).get()
  console.log(`[getCodeSession] code="${code}" exists=${snap.exists}`)
  if (!snap.exists) return null

  const data = snap.data()!
  console.log(`[getCodeSession] session data: prescripteur_partenaire_id="${data.prescripteur_partenaire_id}" nom_partenaire="${data.nom_partenaire}" statut="${data.statut}"`)

  const session = { code, ...(data as Omit<CodeSession, 'code'>) }

  // Charger les images depuis le doc partenaire
  if (session.prescripteur_partenaire_id) {
    try {
      const partSnap = await db.collection('prescripteurs_partenaires').doc(session.prescripteur_partenaire_id).get()
      console.log(`[getCodeSession] partenaire "${session.prescripteur_partenaire_id}" exists=${partSnap.exists}`)
      if (partSnap.exists) {
        const p = partSnap.data()!
        console.log(`[getCodeSession] partenaire fields: subscriptionLevel="${p.subscriptionLevel}" carouselImages=${JSON.stringify(p.carouselImages ?? [])} defaultImage="${p.defaultImage}" photoUrl="${p.photoUrl}"`)
        // Toujours utiliser le nom actuel du partenaire (peut avoir été renommé après génération du code)
        if (p.nom_etablissement) session.nom_partenaire = p.nom_etablissement as string
        session.photoUrl = p.photoUrl ?? undefined
        session.defaultImage = p.defaultImage ?? undefined
        session.carouselImages = (p.carouselImages as string[] | undefined)?.filter(Boolean) ?? undefined
        session.subscriptionLevel = p.subscriptionLevel ?? 'free'
        session.carousel_interval_sec = typeof p.carousel_interval_sec === 'number' ? p.carousel_interval_sec : 6
        session.avantages_hors_stars = typeof p.avantages_hors_stars === 'string' ? p.avantages_hors_stars : undefined
        session.code_promo_affilie = typeof p.code_promo_affilie === 'string' ? p.code_promo_affilie : undefined
      } else {
        console.warn(`[getCodeSession] ⚠️ partenaire "${session.prescripteur_partenaire_id}" introuvable dans Firestore`)
      }
    } catch (e) {
      console.error(`[getCodeSession] erreur chargement partenaire:`, e)
    }
  } else {
    console.warn(`[getCodeSession] ⚠️ code "${code}" n'a pas de prescripteur_partenaire_id`)
  }

  return session
}

/** Valide un code (vérification sans incrément) */
export async function validerCode(
  code: string,
  montant_fcfa: number,
  canal: CanalUtilisation
): Promise<{
  valide: boolean
  raison?: string
  message?: string
  nom_partenaire?: string
  remise_type?: RemiseType
  remise_valeur_pct?: number | null
  remise_description?: string | null
  reduction_fcfa?: number
  montant_final_fcfa?: number
  utilisations_restantes?: number
  expire_dans_heures?: number
}> {
  const session = await getCodeSession(code)
  if (!session) return { valide: false, raison: 'invalide', message: 'Code introuvable' }

  const now = new Date()
  if (session.statut === 'expire' || new Date(session.expire_at) < now)
    return { valide: false, raison: 'expire', message: 'Ce code a expiré. Repassez chez votre partenaire.' }
  if (session.statut === 'epuise' || session.nb_utilisations >= session.max_utilisations)
    return { valide: false, raison: 'epuise', message: 'Ce code a été entièrement utilisé (5/5).' }

  const partenaire = await getPrescripteurPartenaire(session.prescripteur_partenaire_id)
  if (!partenaire || partenaire.statut !== 'actif' || new Date(partenaire.forfait_expire_at) < now)
    return { valide: false, raison: 'partenaire_inactif', message: 'Ce code n\'est plus actif.' }

  const reduction_fcfa = session.remise_type === 'reduction_pct' && session.remise_valeur_pct
    ? Math.round(montant_fcfa * session.remise_valeur_pct / 100)
    : 0
  const montant_final_fcfa = montant_fcfa - reduction_fcfa
  const expire_dans_heures = Math.max(0, Math.round((new Date(session.expire_at).getTime() - now.getTime()) / 3600000))

  return {
    valide: true,
    nom_partenaire: session.nom_partenaire,
    remise_type: session.remise_type,
    remise_valeur_pct: session.remise_valeur_pct,
    remise_description: session.remise_description,
    reduction_fcfa,
    montant_final_fcfa,
    utilisations_restantes: session.max_utilisations - session.nb_utilisations,
    expire_dans_heures,
  }
}

/** Confirme une utilisation après paiement */
export async function confirmerUtilisation(data: {
  code: string
  canal: CanalUtilisation
  montant_fcfa: number
  reservation_id: string | null
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getCodeSession(data.code)
    if (!session) return { success: false, error: 'Code introuvable' }

    const params = await getParametresPlateforme()
    const tauxCommission = params.commission_partenaire_pct
    const commission_fcfa = Math.round(data.montant_fcfa * tauxCommission / 100)
    const now = new Date().toISOString()
    const nouvellesUtilistations = session.nb_utilisations + 1
    const epuise = nouvellesUtilistations >= session.max_utilisations

    const utilisation = {
      used_at: now,
      canal: data.canal,
      montant_fcfa: data.montant_fcfa,
      commission_fcfa,
      reservation_id: data.reservation_id,
    }

    // Mise à jour code session
    await db.collection('codes_sessions').doc(data.code).update({
      nb_utilisations: FieldValue.increment(1),
      statut: epuise ? 'epuise' : 'actif',
      utilisations: FieldValue.arrayUnion(utilisation),
    })

    // Créer commission Canal 2
    await db.collection('commissions_canal2').add({
      prescripteur_partenaire_id: session.prescripteur_partenaire_id,
      code: data.code,
      canal: data.canal,
      montant_transaction_fcfa: data.montant_fcfa,
      taux_commission_pct: tauxCommission,
      commission_fcfa,
      statut: 'en_attente',
      created_at: now,
      confirmee_at: null,
      versee_at: null,
      versee_par: null,
    })

    // Stats partenaire
    const updateStats: Record<string, unknown> = {
      total_utilisations: FieldValue.increment(1),
      total_commissions_fcfa: FieldValue.increment(commission_fcfa),
    }
    if (data.canal === 'hebergement') updateStats.total_ca_hebergements_fcfa = FieldValue.increment(data.montant_fcfa)
    else updateStats.total_ca_boutique_fcfa = FieldValue.increment(data.montant_fcfa)
    await db.collection('prescripteurs_partenaires').doc(session.prescripteur_partenaire_id).update(updateStats)

    // Commission spéciale hôtel/résidence si réservation hébergement
    const partenaire = await getPrescripteurPartenaire(session.prescripteur_partenaire_id)
    if (data.canal === 'hebergement' &&
        (session.type_partenaire === 'hotel' || session.type_partenaire === 'residence')) {
      const forfaitHotel = params.forfait_hotel_reservation_fcfa ?? 2000
      await db.collection('commissions_canal2').add({
        prescripteur_partenaire_id: session.prescripteur_partenaire_id,
        code: data.code,
        canal: 'hebergement_via_hotel',
        montant_transaction_fcfa: data.montant_fcfa,
        commission_fcfa: forfaitHotel,
        statut: 'en_attente',
        created_at: now,
        confirmee_at: null,
        versee_at: null,
        versee_par: null,
      })
      if (partenaire) {
        const commHotelFmt = new Intl.NumberFormat('fr-FR').format(forfaitHotel) + ' FCFA'
        try {
          await sendWhatsApp(partenaire.telephone,
            `🏠 Un client ayant scanné votre QR vient de réserver un hébergement L&Lui !\nCommission : ${commHotelFmt}\n— L&Lui Signature`
          )
        } catch {}
      }
    }

    // SMS WhatsApp partenaire
    if (partenaire) {
      const restantes = session.max_utilisations - nouvellesUtilistations
      const canalLabel = data.canal === 'hebergement' ? 'Hébergement' : 'Boutique'
      const montantFmt = new Intl.NumberFormat('fr-FR').format(data.montant_fcfa) + ' FCFA'
      const commFmt = new Intl.NumberFormat('fr-FR').format(commission_fcfa) + ' FCFA'
      try {
        await sendWhatsApp(partenaire.telephone,
          `🎉 Code ${data.code} utilisé !\nCanal : ${canalLabel}\nMontant : ${montantFmt}\nCommission : ${commFmt}\nUtilisations restantes : ${restantes}/5\n— L&Lui Signature`
        )
      } catch {}
      // SMS admin
      const adminPhone = process.env.ADMIN_WHATSAPP_PHONE ?? '693407964'
      try {
        await sendWhatsApp(adminPhone,
          `💰 Utilisation code Canal 2 !\nPartenaire : ${partenaire.nom_etablissement}\nCode : ${data.code}\nCanal : ${canalLabel}\nMontant : ${montantFmt}\nCommission : ${commFmt}\n— L&Lui Signature`
        )
      } catch {}
    }

    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur' }
  }
}

/** Statistiques Canal 2 pour le dashboard admin */
export async function getStatsCanalDeux() {
  const [partenairesSnap, codesSnap, commissionsSnap] = await Promise.all([
    db.collection('prescripteurs_partenaires').where('statut', '==', 'actif').get(),
    db.collection('codes_sessions').where('statut', '==', 'actif').get(),
    db.collection('commissions_canal2').where('statut', '==', 'en_attente').get(),
  ])

  const partenaires = partenairesSnap.docs.map((d) => ({
    uid: d.id, ...(d.data() as Omit<PrescripteurPartenaire, 'uid'>),
  }))

  const totalCa = partenaires.reduce((s, p) => s + p.total_ca_hebergements_fcfa + p.total_ca_boutique_fcfa, 0)
  const totalCommissions = commissionsSnap.docs.reduce((s, d) => s + (d.data().commission_fcfa as number ?? 0), 0)
  const totalUtilisations = partenaires.reduce((s, p) => s + p.total_utilisations, 0)
  const forfaitsPercus = partenaires.reduce((s, p) => s + p.forfait_montant_fcfa, 0)

  const now = new Date()
  const septJours = new Date(now.getTime() + 7 * 24 * 3600 * 1000)
  const expirantBientot = partenaires.filter((p) => {
    const exp = new Date(p.forfait_expire_at)
    return exp > now && exp <= septJours
  })

  const top = [...partenaires]
    .sort((a, b) => (b.total_ca_hebergements_fcfa + b.total_ca_boutique_fcfa) - (a.total_ca_hebergements_fcfa + a.total_ca_boutique_fcfa))
    .slice(0, 5)

  const commissionsParPartenaire = commissionsSnap.docs.reduce<Record<string, number>>((acc, d) => {
    const pid = d.data().prescripteur_partenaire_id as string
    acc[pid] = (acc[pid] ?? 0) + (d.data().commission_fcfa as number ?? 0)
    return acc
  }, {})

  return {
    partenaires_actifs: partenaires.length,
    codes_actifs: codesSnap.size,
    total_utilisations: totalUtilisations,
    total_ca_fcfa: totalCa,
    commissions_dues_fcfa: totalCommissions,
    forfaits_percus_fcfa: forfaitsPercus,
    expirant_bientot: expirantBientot,
    top_partenaires: top,
    commissions_par_partenaire: commissionsParPartenaire,
    tous_partenaires: partenaires,
  }
}

/** Modifier un prescripteur partenaire existant */
export async function modifierPrescripteurPartenaire(
  id: string,
  data: {
    nom_etablissement?: string
    type?: TypePartenaire
    telephone?: string
    adresse?: string
    latitude?: number | null
    longitude?: number | null
    adresse_gps?: string | null
    remise_type?: RemiseType
    remise_valeur_pct?: number | null
    remise_description?: string | null
    statut?: StatutPartenaire
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id) return { success: false, error: 'ID requis' }
    const snap = await db.collection('prescripteurs_partenaires').doc(id).get()
    if (!snap.exists) return { success: false, error: 'Partenaire introuvable' }

    const update: Record<string, unknown> = {}
    if (data.nom_etablissement !== undefined) update.nom_etablissement = data.nom_etablissement
    if (data.type !== undefined) {
      update.type = data.type
      update.redirection_prioritaire = getRedirectionParDefaut(data.type)
    }
    if (data.telephone !== undefined) update.telephone = data.telephone
    if (data.adresse !== undefined) update.adresse = data.adresse
    if (data.latitude != null && data.longitude != null) {
      update.latitude = data.latitude
      update.longitude = data.longitude
      update.adresse_gps = data.adresse_gps ?? ''
    }
    if (data.remise_type !== undefined) update.remise_type = data.remise_type
    if (data.remise_valeur_pct !== undefined) update.remise_valeur_pct = data.remise_valeur_pct
    if (data.remise_description !== undefined) update.remise_description = data.remise_description
    if (data.statut !== undefined) update.statut = data.statut
    update.updated_at = new Date().toISOString()

    await db.collection('prescripteurs_partenaires').doc(id).update(update)
    revalidatePath('/admin/prescripteurs-partenaires')
    revalidatePath(`/partenaire-prescripteur/${id}`)
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur' }
  }
}

/** Renomme un partenaire (nom_etablissement) */
export async function renommerPrescripteurPartenaire(
  id: string,
  nom: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const trimmed = nom.trim()
    if (!trimmed) return { success: false, error: 'Nom requis' }
    await db.collection('prescripteurs_partenaires').doc(id).update({
      nom_etablissement: trimmed,
      updated_at: new Date().toISOString(),
    })
    revalidatePath('/admin/prescripteurs-partenaires')
    revalidatePath(`/partenaire-prescripteur/${id}`)
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur' }
  }
}

/** Prolonge ou modifie la date d'expiration du forfait d'un partenaire */
export async function prolongerForfaitPartenaire(
  id: string,
  nouvelleDateISO: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const date = new Date(nouvelleDateISO)
    if (isNaN(date.getTime())) return { success: false, error: 'Date invalide' }
    const newStatut = date > new Date() ? 'actif' : 'expire'
    await db.collection('prescripteurs_partenaires').doc(id).update({
      forfait_expire_at: date.toISOString(),
      forfait_statut: newStatut,
      updated_at: new Date().toISOString(),
    })
    revalidatePath('/admin/prescripteurs-partenaires')
    revalidatePath(`/partenaire-prescripteur/${id}`)
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur' }
  }
}

/** Marquer une commission comme versée */
export async function marquerCommissionVersee(
  prescripteurId: string,
  versee_par = 'Olivier Serge'
): Promise<{ success: boolean }> {
  const snap = await db.collection('commissions_canal2')
    .where('prescripteur_partenaire_id', '==', prescripteurId)
    .where('statut', '==', 'en_attente').get()
  const batch = db.batch()
  const now = new Date().toISOString()
  snap.docs.forEach((d) => {
    batch.update(d.ref, { statut: 'versee', versee_at: now, versee_par })
  })
  await batch.commit()
  revalidatePath('/admin/prescripteurs-partenaires')
  return { success: true }
}

// ─── Actions Vitrine Marketing ────────────────────────────────

/** Partenaire met à jour sa vitrine (defaultImage + carouselImages) */
export async function updateVitrine(
  id: string,
  data: { defaultImage?: string; carouselImages?: string[]; carousel_interval_sec?: number }
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id) return { success: false, error: 'ID requis' }
    const params = await getParametresPlateforme()
    const maxImages = params.premium_nb_images ?? 5
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (data.defaultImage !== undefined) update.defaultImage = data.defaultImage.trim()
    if (data.carouselImages !== undefined) {
      update.carouselImages = data.carouselImages
        .map((u) => u.trim())
        .filter((u) => u.length > 0)
        .slice(0, maxImages)
    }
    if (data.carousel_interval_sec !== undefined) {
      update.carousel_interval_sec = Math.max(3, Math.min(30, Math.round(data.carousel_interval_sec)))
    }
    await db.collection('prescripteurs_partenaires').doc(id).update(update)
    revalidatePath(`/partenaire-prescripteur/${id}`)
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur' }
  }
}

/** Admin bascule le niveau d'abonnement Free ↔ Premium */
export async function setSubscriptionLevel(
  id: string,
  level: 'free' | 'premium'
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id) return { success: false, error: 'ID requis' }
    const update: Record<string, unknown> = {
      subscriptionLevel: level,
      updated_at: new Date().toISOString(),
    }
    // Activation Premium → calculer premium_expire_at depuis les paramètres globaux
    if (level === 'premium') {
      const params = await getParametresPlateforme()
      const dureeJours = params.premium_duree_jours ?? 365
      update.premium_expire_at = new Date(Date.now() + dureeJours * 24 * 3600 * 1000).toISOString()
      update.premium_activated_at = new Date().toISOString()
    } else {
      update.premium_expire_at = null
    }
    await db.collection('prescripteurs_partenaires').doc(id).update(update)
    revalidatePath('/admin/prescripteurs-partenaires')
    revalidatePath(`/partenaire-prescripteur/${id}`)
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur' }
  }
}

/** Partenaire actualise ses stats depuis commissions_canal2 Firestore */
export async function actualiserStatsPartenaire(
  id: string
): Promise<{ success: boolean; error?: string; stats?: Record<string, number> }> {
  try {
    if (!id) return { success: false, error: 'ID requis' }

    const snap = await db.collection('commissions_canal2')
      .where('prescripteur_partenaire_id', '==', id)
      .get()

    let ca_boutique = 0
    let ca_hebergements = 0
    let commissions_dues = 0
    let commissions_versees = 0
    let ventes_en_cours = 0
    let nb_utilisations = 0
    const clients = new Set<string>()

    for (const doc of snap.docs) {
      const d = doc.data()
      const montant = (d.montant_transaction_fcfa as number) ?? 0
      const commission = (d.commission_fcfa as number) ?? 0
      const statut = d.statut as string
      const canal = d.canal as string

      if (statut === 'vente_en_cours') {
        ventes_en_cours += montant
        continue
      }

      // Payé / confirmé / versé
      if (canal === 'hebergement') ca_hebergements += montant
      else ca_boutique += montant

      if (statut === 'en_attente') commissions_dues += commission
      if (statut === 'versee') commissions_versees += commission

      nb_utilisations++
      if (d.client_tel) clients.add(d.client_tel as string)
      if (d.client_email) clients.add(d.client_email as string)
    }

    const stats = {
      total_ca_boutique_fcfa: ca_boutique,
      total_ca_hebergements_fcfa: ca_hebergements,
      total_commissions_fcfa: commissions_dues + commissions_versees,
      total_utilisations: nb_utilisations,
      total_clients_uniques: clients.size,
      stats_updated_at: Date.now(),
    }

    await db.collection('prescripteurs_partenaires').doc(id).update({
      ...stats,
      updated_at: new Date().toISOString(),
    })

    revalidatePath(`/partenaire-prescripteur/${id}`)
    return { success: true, stats }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur' }
  }
}

/** Admin définit les images du carrousel d'un partenaire */
export async function setCarouselImagesAdmin(
  id: string,
  images: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id) return { success: false, error: 'ID requis' }
    const params = await getParametresPlateforme()
    const maxImages = params.premium_nb_images ?? 5
    const cleaned = images.map((u) => u.trim()).filter((u) => u.length > 0).slice(0, maxImages)
    // Images présentes → Premium avec expiration. Sinon → Free.
    const subscriptionLevel = cleaned.length > 0 ? 'premium' : 'free'
    const update: Record<string, unknown> = {
      carouselImages: cleaned,
      subscriptionLevel,
      updated_at: new Date().toISOString(),
    }
    if (cleaned.length > 0) {
      const dureeJours = params.premium_duree_jours ?? 365
      update.premium_expire_at = new Date(Date.now() + dureeJours * 24 * 3600 * 1000).toISOString()
      update.premium_activated_at = new Date().toISOString()
    }
    await db.collection('prescripteurs_partenaires').doc(id).update(update)
    revalidatePath('/admin/prescripteurs-partenaires')
    revalidatePath(`/partenaire-prescripteur/${id}`)
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur' }
  }
}

/** Admin définit la photo/logo d'un partenaire (photoUrl) */
export async function setPhotoUrlAdmin(
  id: string,
  photoUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id) return { success: false, error: 'ID requis' }
    await db.collection('prescripteurs_partenaires').doc(id).update({
      photoUrl: photoUrl.trim(),
      updated_at: new Date().toISOString(),
    })
    revalidatePath('/admin/prescripteurs-partenaires')
    revalidatePath(`/partenaire-prescripteur/${id}`)
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur' }
  }
}

/** Admin définit l'image par défaut d'un partenaire */
export async function setDefaultImageAdmin(
  id: string,
  defaultImage: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id) return { success: false, error: 'ID requis' }
    await db.collection('prescripteurs_partenaires').doc(id).update({
      defaultImage: defaultImage.trim(),
      updated_at: new Date().toISOString(),
    })
    revalidatePath('/admin/prescripteurs-partenaires')
    revalidatePath(`/partenaire-prescripteur/${id}`)
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur' }
  }
}
