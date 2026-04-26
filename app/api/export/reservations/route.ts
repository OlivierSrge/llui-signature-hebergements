import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function row(fields: unknown[]): string {
  return fields.map(escapeCSV).join(',')
}

export async function GET(req: NextRequest) {
  // Auth admin uniquement
  const cookieStore = cookies()
  const adminSession = cookieStore.get('admin_session')?.value
  if (adminSession !== 'authenticated') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || ''
  const source = searchParams.get('source') || ''

  const snap = await db.collection('reservations').get()
  let reservations = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a: any, b: any) => b.created_at?.localeCompare(a.created_at) || 0) as any[]

  if (status && ['demande', 'en_attente', 'confirmee', 'annulee'].includes(status)) {
    reservations = reservations.filter((r) => r.reservation_status === status)
  }
  if (source && ['direct', 'partenaire', 'admin'].includes(source)) {
    reservations = reservations.filter((r) => r.source === source)
  }

  const HEADERS = [
    'Code réservation',
    'Statut réservation',
    'Statut paiement',
    'Source',
    'Hébergement',
    'Prénom client',
    'Nom client',
    'Téléphone',
    'Email',
    'Arrivée',
    'Départ',
    'Nuits',
    'Voyageurs',
    'Prix/nuit (FCFA)',
    'Sous-total (FCFA)',
    'Remise (FCFA)',
    'Total (FCFA)',
    'Mode paiement',
    'Partenaire',
    'Code promo',
    'Arrivée confirmée',
    'Date création',
    'Date confirmation',
  ]

  const lines: string[] = [HEADERS.join(',')]

  for (const r of reservations) {
    lines.push(row([
      r.confirmation_code || r.id,
      r.reservation_status,
      r.payment_status,
      r.source || 'direct',
      r.accommodation?.name || r.accommodation_id || '',
      r.guest_first_name || '',
      r.guest_last_name || '',
      r.guest_phone || '',
      r.guest_email || '',
      r.check_in || '',
      r.check_out || '',
      r.nights || '',
      r.guests || '',
      r.price_per_night || '',
      r.subtotal || r.total_price || '',
      r.discount_amount || 0,
      r.total_price || '',
      r.payment_method || '',
      r.partner_name || '',
      r.promo_code || '',
      r.check_in_confirmed ? 'Oui' : 'Non',
      r.created_at ? r.created_at.substring(0, 10) : '',
      r.confirmed_at ? r.confirmed_at.substring(0, 10) : '',
    ]))
  }

  const csv = '\uFEFF' + lines.join('\n') // BOM UTF-8 pour Excel

  const today = new Date().toISOString().substring(0, 10)
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="reservations-${today}.csv"`,
    },
  })
}
