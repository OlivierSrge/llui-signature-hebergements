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

  // Canal 3 — Moto-taxis prescripteurs
  commission_mototaxi_fcfa: number

  // Canal 4 — Commerciaux partenaires
  commission_commerciaux_pct: number
  partage_llui_pct: number
  partage_commercial_pct: number

  // Métadonnées
  modifie_par?: string
  modifie_at?: string
  version?: number
}

const DEFAULTS: ParametresPlateforme = {
  commission_partenaire_pct: 10,
  forfait_prescripteur_mensuel_fcfa: 25000,
  forfait_prescripteur_annuel_fcfa: 250000,
  commission_mototaxi_fcfa: 1500,
  commission_commerciaux_pct: 10,
  partage_llui_pct: 50,
  partage_commercial_pct: 50,
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
    commission_mototaxi_fcfa: d.commission_mototaxi_fcfa ?? DEFAULTS.commission_mototaxi_fcfa,
    commission_commerciaux_pct: d.commission_commerciaux_pct ?? DEFAULTS.commission_commerciaux_pct,
    partage_llui_pct: d.partage_llui_pct ?? DEFAULTS.partage_llui_pct,
    partage_commercial_pct: d.partage_commercial_pct ?? DEFAULTS.partage_commercial_pct,
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
