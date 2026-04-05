'use server'

import { db } from '@/lib/firebase'

export interface RangPrescripteur {
  uid: string
  nom_complet: string
  type: string
  telephone: string
  note_moyenne: number
  total_notes: number
  badge_confiance: boolean
  clients_ce_mois: number
  commission_ce_mois: number
  score: number
}

export async function getClassementMensuel(): Promise<RangPrescripteur[]> {
  try {
    const now = new Date()
    const moisPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    // Charger les prescripteurs et les réservations versées en parallèle
    const [prescSnap, resaSnap] = await Promise.all([
      db.collection('prescripteurs').where('statut', '==', 'actif').get(),
      db.collection('reservations')
        .where('statut_prescription', '==', 'commission_versee')
        .limit(500)
        .get(),
    ])

    // Filtrer réservations de ce mois (par commission_versee_at ou check_in)
    const resasDuMois = resaSnap.docs
      .map((d) => ({ id: d.id, ...d.data() } as any))
      .filter((r: any) => {
        const dateRef = (r.commission_versee_at ?? r.check_in ?? '') as string
        return dateRef.startsWith(moisPrefix)
      })

    // Agréger par prescripteur
    const statsParPresc: Record<string, { clients: number; commission: number }> = {}
    for (const r of resasDuMois) {
      const pid = r.prescripteur_id as string
      if (!pid) continue
      if (!statsParPresc[pid]) statsParPresc[pid] = { clients: 0, commission: 0 }
      statsParPresc[pid].clients += 1
      statsParPresc[pid].commission += (r.commission_prescripteur_fcfa ?? 0) as number
    }

    // Construire le classement
    const classement: RangPrescripteur[] = prescSnap.docs
      .map((d) => {
        const p = d.data() as any
        const stats = statsParPresc[d.id] ?? { clients: 0, commission: 0 }
        const note = (p.note_moyenne ?? 0) as number
        const score = Math.round((stats.clients * 0.7 + note * 0.3 * 10) * 10) / 10
        return {
          uid: d.id,
          nom_complet: (p.nom_complet ?? '') as string,
          type: (p.type ?? '') as string,
          telephone: (p.telephone ?? '') as string,
          note_moyenne: note,
          total_notes: (p.total_notes ?? 0) as number,
          badge_confiance: (p.badge_confiance ?? false) as boolean,
          clients_ce_mois: stats.clients,
          commission_ce_mois: stats.commission,
          score,
        }
      })
      .filter((p) => p.clients_ce_mois > 0 || p.note_moyenne > 0)
      .sort((a, b) => b.score - a.score)

    return classement
  } catch (err) {
    console.error('[getClassementMensuel]', err)
    return []
  }
}
