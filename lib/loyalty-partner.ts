import { db } from './firebase'

export type PartenaireType = 'hebergement' | 'prescripteur'

/**
 * Charge les infos du partenaire depuis la bonne collection.
 * Si partenaire_type n'est pas fourni, essaie les deux collections.
 */
export async function getPartnerInfo(
  partenaire_id: string,
  partenaire_type?: PartenaireType
): Promise<{ id: string; type: PartenaireType; name: string; email?: string } & Record<string, unknown>> {
  const collections: { type: PartenaireType; col: string }[] = partenaire_type
    ? [
        partenaire_type === 'hebergement'
          ? { type: 'hebergement', col: 'partenaires' }
          : { type: 'prescripteur', col: 'prescripteurs_partenaires' },
      ]
    : [
        { type: 'prescripteur', col: 'prescripteurs_partenaires' },
        { type: 'hebergement', col: 'partenaires' },
      ]

  for (const { type, col } of collections) {
    const doc = await db.collection(col).doc(partenaire_id).get()
    if (doc.exists) {
      const data = doc.data() ?? {}
      const name: string =
        (data.nom_etablissement as string | undefined) ??
        (data.nom as string | undefined) ??
        (data.name as string | undefined) ??
        'Partenaire'
      return { id: doc.id, type, name, ...data }
    }
  }

  throw new Error(`Partenaire ${partenaire_id} non trouvé dans aucune collection`)
}

/**
 * Retourne le nom du partenaire. Ne lève jamais d'exception.
 */
export async function getPartnerName(
  partenaire_id: string,
  partenaire_type?: PartenaireType
): Promise<string> {
  try {
    const p = await getPartnerInfo(partenaire_id, partenaire_type)
    return p.name
  } catch {
    return 'Partenaire'
  }
}
