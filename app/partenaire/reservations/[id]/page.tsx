export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { db } from '@/lib/firebase'
import Link from 'next/link'
import { ArrowLeft, QrCode, CheckCircle2, User, Calendar, CreditCard, Handshake } from 'lucide-react'
import { formatDate, formatPrice, getPaymentMethodLabel } from '@/lib/utils'
import PartnerReservationActions from '@/components/partner/PartnerReservationActions'

async function getReservation(id: string, partnerId: string) {
  const doc = await db.collection('reservations').doc(id).get()
  if (!doc.exists) return null
  const data = doc.data()!
  // Le partenaire ne peut voir que ses propres réservations
  if (data.partner_id !== partnerId && data.source !== 'partenaire') return null
  // Ou des réservations liées à ses hébergements
  return { id: doc.id, ...data } as any
}

export default async function PartnerReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const cookieStore = cookies()
  const partnerId = cookieStore.get('partner_session')?.value
  if (!partnerId) redirect('/partenaire')

  const { id } = await params
  const res = await getReservation(id, partnerId)
  if (!res) notFound()

  const STATUS_LABEL: Record<string, string> = { en_attente: 'En attente', confirmee: 'Confirmée', annulee: 'Annulée' }
  const STATUS_COLOR: Record<string, string> = {
    en_attente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    confirmee: 'bg-green-100 text-green-800 border-green-200',
    annulee: 'bg-red-100 text-red-800 border-red-200',
  }

  return (
    <div className="min-h-screen bg-beige-50">
      <header className="bg-white border-b border-beige-200 px-4 sm:px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/partenaire/dashboard" className="p-2 rounded-xl hover:bg-beige-50 transition-colors text-dark/50 hover:text-dark">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="text-xs text-dark/40">Espace partenaire</p>
            <h1 className="font-serif text-xl font-semibold text-dark">
              Réservation {res.confirmation_code ?? `#${res.id.slice(-8).toUpperCase()}`}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        {/* Status + arrivée */}
        <div className="flex flex-wrap gap-3 items-center">
          <span className={`text-sm font-medium px-3 py-1.5 rounded-full border ${STATUS_COLOR[res.reservation_status] ?? 'bg-beige-100 text-dark/60'}`}>
            {STATUS_LABEL[res.reservation_status] ?? res.reservation_status}
          </span>
          {res.check_in_confirmed && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
              <CheckCircle2 size={14} /> Client arrivé
            </span>
          )}
        </div>

        {/* Client */}
        <div className="bg-white rounded-2xl border border-beige-200 p-5">
          <h2 className="font-semibold text-dark mb-3 flex items-center gap-2 text-sm">
            <User size={14} className="text-gold-500" /> Client
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-dark/40 text-xs mb-0.5">Nom</p>
              <p className="font-medium text-dark">{res.guest_first_name} {res.guest_last_name}</p>
            </div>
            <div>
              <p className="text-dark/40 text-xs mb-0.5">Téléphone</p>
              <p className="text-dark">{res.guest_phone || '—'}</p>
            </div>
            {res.guest_email && (
              <div className="col-span-2">
                <p className="text-dark/40 text-xs mb-0.5">Email</p>
                <p className="text-dark">{res.guest_email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Séjour */}
        <div className="bg-white rounded-2xl border border-beige-200 p-5">
          <h2 className="font-semibold text-dark mb-3 flex items-center gap-2 text-sm">
            <Calendar size={14} className="text-gold-500" /> Séjour
          </h2>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-dark/40 text-xs mb-0.5">Arrivée</p>
              <p className="font-medium text-dark">{formatDate(res.check_in, 'dd/MM/yyyy')}</p>
            </div>
            <div>
              <p className="text-dark/40 text-xs mb-0.5">Départ</p>
              <p className="font-medium text-dark">{formatDate(res.check_out, 'dd/MM/yyyy')}</p>
            </div>
            <div>
              <p className="text-dark/40 text-xs mb-0.5">Voyageurs</p>
              <p className="font-medium text-dark">{res.guests} pers.</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-beige-100">
            <p className="text-dark/40 text-xs mb-0.5">Hébergement</p>
            <p className="font-medium text-dark">{res.accommodation?.name ?? res.accommodation_id}</p>
          </div>
          {res.notes && (
            <div className="mt-3 p-3 bg-beige-50 rounded-xl text-xs text-dark/60">{res.notes}</div>
          )}
        </div>

        {/* Financier */}
        <div className="bg-white rounded-2xl border border-beige-200 p-5">
          <h2 className="font-semibold text-dark mb-3 flex items-center gap-2 text-sm">
            <CreditCard size={14} className="text-gold-500" /> Paiement
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-dark/50">{res.nights} nuit{res.nights > 1 ? 's' : ''} × {formatPrice(res.price_per_night)}</span>
              <span className="text-dark">{formatPrice(res.subtotal)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t border-beige-100 pt-2">
              <span className="text-dark">Total</span>
              <span className="text-dark">{formatPrice(res.total_price)}</span>
            </div>
            <div className="flex justify-between text-xs text-dark/40">
              <span>Mode</span>
              <span>{getPaymentMethodLabel(res.payment_method)}</span>
            </div>
            <div className={`mt-1 px-3 py-1.5 rounded-full text-xs font-medium inline-block ${
              res.payment_status === 'paye' ? 'bg-green-100 text-green-800' :
              res.payment_status === 'annule' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {res.payment_status === 'paye' ? 'Payé' : res.payment_status === 'annule' ? 'Annulé' : 'En attente de paiement'}
            </div>
          </div>
        </div>

        {/* QR Code — uniquement si la réservation est confirmée */}
        {res.confirmation_code && res.reservation_status === 'confirmee' && (
          <div className="bg-white rounded-2xl border border-beige-200 p-5 text-center">
            <h2 className="font-semibold text-dark mb-3 flex items-center justify-center gap-2 text-sm">
              <QrCode size={14} className="text-gold-500" /> Code & QR d&apos;arrivée
            </h2>
            <p className="font-mono text-xl font-bold text-dark tracking-widest mb-3">{res.confirmation_code}</p>
            {res.qr_code_data && (
              <div className="flex flex-col items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={res.qr_code_data} alt="QR Code" className="w-36 h-36 rounded-xl border border-beige-200" />
                <a
                  href={res.qr_code_data}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-dark/40 hover:text-dark transition-colors"
                >
                  Ouvrir le QR code
                </a>
              </div>
            )}
            {res.check_in_confirmed && (
              <div className="mt-3 flex items-center justify-center gap-1.5 text-green-700 text-xs font-medium">
                <CheckCircle2 size={13} />
                Arrivée confirmée le {res.check_in_date ? formatDate(res.check_in_date, 'dd/MM/yyyy à HH:mm') : ''}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <PartnerReservationActions reservation={res} />
      </main>
    </div>
  )
}
