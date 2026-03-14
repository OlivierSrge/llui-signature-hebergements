'use server'

import { db } from '@/lib/firebase'
import type { CommissionsData, PartnerRow } from '@/components/admin/CommissionsWidget'

function getLast6MonthsForYear(year: number): { label: string; key: string }[] {
  const now = new Date()
  // Si l'année sélectionnée est l'année courante, afficher les 6 derniers mois
  if (year === now.getFullYear()) {
    const result = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      result.push({
        label: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      })
    }
    return result
  }
  // Sinon : toute l'année (12 mois)
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(year, i, 1)
    return {
      label: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
      key: `${year}-${String(i + 1).padStart(2, '0')}`,
    }
  })
}

export async function getPartnerCommissionsData(year: number = new Date().getFullYear()): Promise<CommissionsData> {
  const months = getLast6MonthsForYear(year)

  // Charger les partenaires actifs
  const partnersSnap = await db.collection('partenaires').get()
  const partners = partnersSnap.docs.map((d) => ({
    id: d.id,
    name: d.data().name || 'Partenaire',
    plan: d.data().plan || d.data().subscription_plan || undefined,
  }))

  // Charger les réservations payées
  const resSnap = await db.collection('reservations')
    .where('payment_status', '==', 'paye')
    .get()
  const reservations = resSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[]

  const rows: PartnerRow[] = partners.map((partner) => {
    const partnerResv = reservations.filter((r) => r.partner_id === partner.id && r.payment_date)

    const monthCells = months.map((month) => {
      const monthResv = partnerResv.filter((r) => {
        const d = (r.payment_date as string).slice(0, 7)
        return d === month.key
      })
      if (monthResv.length === 0) return null

      const commAmount = monthResv.reduce((s: number, r: any) => {
        const comm = r.commission_amount != null ? r.commission_amount : (r.total_price * (r.commission_rate || 0)) / 100 || 0
        return s + comm
      }, 0)

      return {
        amount: commAmount,
        reservations: monthResv.map((r: any) => ({
          id: r.id,
          code: r.confirmation_code || r.id.slice(-8).toUpperCase(),
          guestName: `${r.guest_first_name || ''} ${r.guest_last_name || ''}`.trim(),
          accommodationName: r.accommodation?.name || '',
          checkIn: r.check_in || '',
          checkOut: r.check_out || '',
          totalPrice: r.total_price || 0,
          commissionRate: r.commission_rate || 0,
          commissionAmount: r.commission_amount != null ? r.commission_amount : (r.total_price * (r.commission_rate || 0)) / 100 || 0,
          paymentDate: r.payment_date || '',
        })),
      }
    })

    const total = monthCells.reduce((s, c) => s + (c?.amount || 0), 0)
    return {
      partnerId: partner.id,
      partnerName: partner.name,
      partnerPlan: partner.plan,
      months: monthCells,
      total,
    }
  })

  // Filtrer les partenaires sans aucune commission (optionnel: garder tous)
  // Pour le tableau, on garde tous les partenaires
  return { months, rows }
}

/** Données de commission des 12 derniers mois pour un partenaire spécifique */
export async function getPartnerCommissions12Months(partnerId: string): Promise<{ month: string; label: string; amount: number }[]> {
  const now = new Date()
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    return {
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
    }
  })

  const resSnap = await db.collection('reservations')
    .where('partner_id', '==', partnerId)
    .where('payment_status', '==', 'paye')
    .get()
  const reservations = resSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[]

  return months.map(({ month, label }) => {
    const monthResv = reservations.filter((r) => r.payment_date?.slice(0, 7) === month)
    const amount = monthResv.reduce((s, r) => {
      return s + (r.commission_amount != null ? r.commission_amount : (r.total_price * (r.commission_rate || 0)) / 100 || 0)
    }, 0)
    return { month, label, amount }
  })
}
