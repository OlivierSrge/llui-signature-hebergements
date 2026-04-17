'use server'

import { db } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { revalidatePath } from 'next/cache'

const DOC_PATH = 'parametres_plateforme/taux_et_forfaits'

export interface ParametresPlateforme {
  // Canal 1 — Partenaires hébergeurs
  commission_partenaire_pct: number

  // Canal 2 — Prescripteurs partenaires
  forfait_prescripteur_mensuel_fcfa: number
  forfait_prescripteur_annuel_fcfa: number

  // Canal 2 — Abonnement Premium Vitrine
  premium_prix_mensuel_fcfa: number
  premium_prix_annuel_fcfa: number
  premium_nb_images: number       // nombre d'images carrousel autorisées (défaut 5)
  premium_duree_jours: number     // durée d'un abonnement Premium (défaut 365)

  // Canal 2 — Hôtels & Résidences partenaires
  forfait_hotel_reservation_fcfa: number

  // Canal 3 — Moto-taxis prescripteurs
  commission_mototaxi_fcfa: number

  // Canal 4 — Commerciaux partenaires
  commission_commerciaux_pct: number
  partage_llui_pct: number
  partage_commercial_pct: number

  // Moteur de fidélité L&Lui Stars
  fidelite_duree_pass_jours: number       // durée de validité du pass (défaut 365)
  fidelite_remise_argent_pct: number      // remise boutique Pass Argent (défaut 5%)
  fidelite_remise_or_pct: number          // remise boutique Pass Or (défaut 10%)
  fidelite_remise_platine_pct: number     // remise boutique Pass Platine (défaut 20%)
  fidelite_multiplicateur_argent: number  // multiplicateur stars Argent (défaut 1.0)
  fidelite_multiplicateur_or: number      // multiplicateur stars Or (défaut 1.5)
  fidelite_multiplicateur_platine: number // multiplicateur stars Platine (défaut 2.0)
  fidelite_seuil_novice: number           // seuil stars Novice (défaut 0)
  fidelite_seuil_explorateur: number      // seuil stars Explorateur (défaut 25 000)
  fidelite_seuil_ambassadeur: number      // seuil stars Ambassadeur (défaut 75 000)
  fidelite_seuil_excellence: number       // seuil stars Excellence (défaut 150 000)
  fidelite_valeur_star_fcfa: number       // valeur d'1 star en FCFA (provision partenaire)
  fidelite_otp_template: string           // template message OTP WhatsApp

  // Métadonnées
  modifie_par?: string
  modifie_at?: string
  version?: number
}

const DEFAULTS: ParametresPlateforme = {
  commission_partenaire_pct: 10,
  forfait_prescripteur_mensuel_fcfa: 25000,
  forfait_prescripteur_annuel_fcfa: 250000,
  premium_prix_mensuel_fcfa: 10000,
  premium_prix_annuel_fcfa: 100000,
  premium_nb_images: 5,
  premium_duree_jours: 365,
  forfait_hotel_reservation_fcfa: 2000,
  commission_mototaxi_fcfa: 1500,
  commission_commerciaux_pct: 10,
  partage_llui_pct: 50,
  partage_commercial_pct: 50,
  // Fidélité
  fidelite_duree_pass_jours: 365,
  fidelite_remise_argent_pct: 5,
  fidelite_remise_or_pct: 10,
  fidelite_remise_platine_pct: 20,
  fidelite_multiplicateur_argent: 1.0,
  fidelite_multiplicateur_or: 1.5,
  fidelite_multiplicateur_platine: 2.0,
  fidelite_seuil_novice: 0,
  fidelite_seuil_explorateur: 25000,
  fidelite_seuil_ambassadeur: 75000,
  fidelite_seuil_excellence: 150000,
  fidelite_valeur_star_fcfa: 1,
  fidelite_otp_template: '',
}

/** Lit les paramètres. Si le document n'existe pas, le crée avec les valeurs par défaut. */
export async function getParametresPlateforme(): Promise<ParametresPlateforme> {
  const snap = await db.doc(DOC_PATH).get()
  if (!snap.exists) {
    await db.doc(DOC_PATH).set({
      ...DEFAULTS,
      modifie_par: 'system',
      modifie_at: new Date().toISOString(),
      version: 1,
    })
    return DEFAULTS
  }
  const d = snap.data()!
  return {
    commission_partenaire_pct: d.commission_partenaire_pct ?? DEFAULTS.commission_partenaire_pct,
    forfait_prescripteur_mensuel_fcfa: d.forfait_prescripteur_mensuel_fcfa ?? DEFAULTS.forfait_prescripteur_mensuel_fcfa,
    forfait_prescripteur_annuel_fcfa: d.forfait_prescripteur_annuel_fcfa ?? DEFAULTS.forfait_prescripteur_annuel_fcfa,
    premium_prix_mensuel_fcfa: d.premium_prix_mensuel_fcfa ?? DEFAULTS.premium_prix_mensuel_fcfa,
    premium_prix_annuel_fcfa: d.premium_prix_annuel_fcfa ?? DEFAULTS.premium_prix_annuel_fcfa,
    premium_nb_images: d.premium_nb_images ?? DEFAULTS.premium_nb_images,
    premium_duree_jours: d.premium_duree_jours ?? DEFAULTS.premium_duree_jours,
    forfait_hotel_reservation_fcfa: d.forfait_hotel_reservation_fcfa ?? DEFAULTS.forfait_hotel_reservation_fcfa,
    commission_mototaxi_fcfa: d.commission_mototaxi_fcfa ?? DEFAULTS.commission_mototaxi_fcfa,
    commission_commerciaux_pct: d.commission_commerciaux_pct ?? DEFAULTS.commission_commerciaux_pct,
    partage_llui_pct: d.partage_llui_pct ?? DEFAULTS.partage_llui_pct,
    partage_commercial_pct: d.partage_commercial_pct ?? DEFAULTS.partage_commercial_pct,
    // Fidélité
    fidelite_duree_pass_jours: d.fidelite_duree_pass_jours ?? DEFAULTS.fidelite_duree_pass_jours,
    fidelite_remise_argent_pct: d.fidelite_remise_argent_pct ?? DEFAULTS.fidelite_remise_argent_pct,
    fidelite_remise_or_pct: d.fidelite_remise_or_pct ?? DEFAULTS.fidelite_remise_or_pct,
    fidelite_remise_platine_pct: d.fidelite_remise_platine_pct ?? DEFAULTS.fidelite_remise_platine_pct,
    fidelite_multiplicateur_argent: d.fidelite_multiplicateur_argent ?? DEFAULTS.fidelite_multiplicateur_argent,
    fidelite_multiplicateur_or: d.fidelite_multiplicateur_or ?? DEFAULTS.fidelite_multiplicateur_or,
    fidelite_multiplicateur_platine: d.fidelite_multiplicateur_platine ?? DEFAULTS.fidelite_multiplicateur_platine,
    fidelite_seuil_novice: d.fidelite_seuil_novice ?? DEFAULTS.fidelite_seuil_novice,
    fidelite_seuil_explorateur: d.fidelite_seuil_explorateur ?? DEFAULTS.fidelite_seuil_explorateur,
    fidelite_seuil_ambassadeur: d.fidelite_seuil_ambassadeur ?? DEFAULTS.fidelite_seuil_ambassadeur,
    fidelite_seuil_excellence: d.fidelite_seuil_excellence ?? DEFAULTS.fidelite_seuil_excellence,
    fidelite_valeur_star_fcfa: d.fidelite_valeur_star_fcfa ?? DEFAULTS.fidelite_valeur_star_fcfa,
    fidelite_otp_template: d.fidelite_otp_template ?? DEFAULTS.fidelite_otp_template,
    modifie_par: d.modifie_par,
    modifie_at: d.modifie_at,
    version: d.version,
  }
}

/** Met à jour les paramètres et trace l'historique. */
export async function updateParametresPlateforme(
  nouvelles: Omit<ParametresPlateforme, 'modifie_par' | 'modifie_at' | 'version'>,
  modifie_par = 'Olivier Serge'
): Promise<{ success: boolean; error?: string }> {
  try {
    const snap = await db.doc(DOC_PATH).get()
    const anciennes = snap.exists ? (snap.data() as ParametresPlateforme) : DEFAULTS
    const now = new Date().toISOString()
    const newVersion = (anciennes.version ?? 0) + 1

    // Calcul des différences
    const differences: string[] = []
    const keys = Object.keys(nouvelles) as (keyof typeof nouvelles)[]
    for (const k of keys) {
      const ancien = (anciennes as unknown as Record<string, unknown>)[k]
      const nouveau = nouvelles[k]
      if (ancien !== undefined && ancien !== nouveau) {
        differences.push(`${k} : ${ancien} → ${nouveau}`)
      }
    }

    // Mise à jour document principal
    await db.doc(DOC_PATH).set({
      ...nouvelles,
      modifie_par,
      modifie_at: now,
      version: newVersion,
    })

    // Trace dans sous-collection historique
    if (differences.length > 0) {
      await db.doc(DOC_PATH).collection('historique').add({
        modifie_par,
        modifie_at: now,
        anciennes_valeurs: anciennes,
        nouvelles_valeurs: nouvelles,
        differences,
        created_at: FieldValue.serverTimestamp(),
      })
    }

    revalidatePath('/admin/parametres')
    return { success: true }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    return { success: false, error: msg }
  }
}

/** Retourne les 10 dernières entrées de l'historique. */
export async function getHistoriqueParametres(): Promise<{
  id: string
  modifie_par: string
  modifie_at: string
  differences: string[]
}[]> {
  const snap = await db.doc(DOC_PATH)
    .collection('historique')
    .orderBy('created_at', 'desc')
    .limit(10)
    .get()
  return snap.docs.map((d) => ({
    id: d.id,
    modifie_par: d.data().modifie_par ?? '',
    modifie_at: d.data().modifie_at ?? '',
    differences: d.data().differences ?? [],
  }))
}
