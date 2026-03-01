import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/firebase'
import { ChevronLeft, Calendar, Users, CreditCard, Building2, Phone, Mail } from 'lucide-react'
import {
  formatDate, formatPrice, getReservationStatusLabel, getReservationStatusColor,
  getPaymentStatusLabel, getPaymentStatusColor, getPaymentMethodLabel, resolveImageUrl,
} from '@/lib/utils'
import ReservationActions from '@/components/admin/ReservationActions'

async function getReservation(id: string) {
  const doc = await db.collection('reservations').doc(id).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as any
}

export const metadata = { title: 'Détail réservation' }

export default async function AdminReservationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const res = await getReservation(id)
  if (!res) notFound()

  const acc = res.accommodation
  const partner = acc?.partner

  return (
    <div className="p-6 sm:p-8 mt-14 lg:mt-0">
      <div className="mb-6">
        <Link href="/admin/reservations" className="inline-flex items-center gap-1.5 text-sm text-dark/50 hover:text-dark mb-4 transition-colors">
          <ChevronLeft size={16} /> Retour aux réservations
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-dark">Réservation #{res.id.slice(-8).toUpperCase()}</h1>
            <p className="text-dark/50 text-sm mt-1">Créée le {formatDate(res.created_at, 'dd MMMM yyyy à HH:mm')}</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <span className={`badge text-sm px-4 py-2 ${getReservationStatusColor(res.reservation_status)}`}>{getReservationStatusLabel(res.reservation_status)}</span>
            <span className={`badge text-sm px-4 py-2 ${getPaymentStatusColor(res.payment_status)}`}>{getPaymentStatusLabel(res.payment_status)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <Section title="Informations client" icon={Users}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoItem label="Nom complet" value={`${res.guest_first_name} ${res.guest_last_name}`} />
              <InfoItem label="Email" value={res.guest_email} icon={Mail} />
              <InfoItem label="Téléphone" value={res.guest_phone} icon={Phone} />
              <InfoItem label="Voyageurs" value={`${res.guests} personne${res.guests > 1 ? 's' : ''}`} />
            </div>
          </Section>

          <Section title="Détails du séjour" icon={Calendar}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <InfoItem label="Arrivée" value={formatDate(res.check_in)} />
              <InfoItem label="Départ" value={formatDate(res.check_out)} />
              <InfoItem label="Durée" value={`${res.nights} nuit${(res.nights ?? 0) > 1 ? 's' : ''}`} />
            </div>
            {res.notes && (
              <div className="mt-4 p-3 bg-beige-50 rounded-xl border border-beige-200">
                <p className="text-xs text-dark/50 font-medium mb-1">Message du client</p>
                <p className="text-sm text-dark/70">{res.notes}</p>
              </div>
            )}
          </Section>

          <Section title="Hébergement" icon={Building2}>
            <div className="flex items-start gap-4">
              {acc?.images?.[0] && (
                <img src={resolveImageUrl(acc.images[0])} alt={acc.name} className="w-20 h-16 rounded-xl object-cover flex-shrink-0" />
              )}
              <div>
                <p className="font-semibold text-dark">{acc?.name}</p>
                <p className="text-sm text-dark/60">{partner?.name}</p>
                <p className="text-xs text-dark/40 mt-0.5">{acc?.location}</p>
                {acc?.slug && (
                  <Link href={`/hebergements/${acc.slug}`} target="_blank" className="text-xs text-gold-600 hover:underline mt-1 inline-block">
                    Voir la page →
                  </Link>
                )}
              </div>
            </div>
          </Section>

          {res.admin_notes && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs font-semibold text-amber-800 mb-1">Notes admin</p>
              <p className="text-sm text-amber-700">{res.admin_notes}</p>
            </div>
          )}
          {res.cancellation_reason && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-xs font-semibold text-red-800 mb-1">Motif d&apos;annulation</p>
              <p className="text-sm text-red-700">{res.cancellation_reason}</p>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-beige-200 p-5">
            <h3 className="font-semibold text-dark mb-4 flex items-center gap-2">
              <CreditCard size={16} className="text-gold-500" /> Détail financier
            </h3>
            <div className="space-y-3 text-sm">
              <Row label="Prix / nuit" value={formatPrice(res.price_per_night)} />
              <Row label={`× ${res.nights} nuit${(res.nights ?? 0) > 1 ? 's' : ''}`} value={formatPrice(res.subtotal)} />
              {res.promo_code && res.discount_amount && (
                <div className="flex justify-between items-center text-green-700">
                  <span className="font-medium flex items-center gap-1">
                    Code <span className="font-mono font-bold">{res.promo_code}</span>
                  </span>
                  <span className="font-bold">-{formatPrice(res.discount_amount)}</span>
                </div>
              )}
              <div className="border-t border-beige-200 pt-3 mt-3">
                <Row label="Total client" value={formatPrice(res.total_price)} bold />
              </div>
              <div className="border-t border-beige-200 pt-3 mt-3 bg-gold-50 -mx-1 px-1 py-2 rounded-lg">
                <Row label={`Commission L&Lui (${res.commission_rate}%)`} value={formatPrice(res.commission_amount)} highlight />
                <Row label="Revenu partenaire" value={formatPrice(res.total_price - res.commission_amount)} />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-beige-200">
              <p className="text-xs text-dark/50 mb-2 font-medium">Mode de paiement</p>
              <p className="text-sm font-medium text-dark">{getPaymentMethodLabel(res.payment_method)}</p>
              {res.payment_reference && <p className="text-xs text-dark/50 mt-1">Réf: {res.payment_reference}</p>}
              {res.payment_date && <p className="text-xs text-dark/50">Payé le {formatDate(res.payment_date)}</p>}
            </div>
          </div>
          <ReservationActions reservation={res} />
        </div>
      </div>
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-beige-200 p-5">
      <h3 className="font-semibold text-dark mb-4 flex items-center gap-2"><Icon size={16} className="text-gold-500" />{title}</h3>
      {children}
    </div>
  )
}

function InfoItem({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ElementType }) {
  return (
    <div>
      <p className="text-xs text-dark/50 font-medium mb-0.5">{label}</p>
      <p className="text-sm font-medium text-dark flex items-center gap-1.5">
        {Icon && <Icon size={12} className="text-gold-500" />}{value}
      </p>
    </div>
  )
}

function Row({ label, value, bold, highlight }: { label: string; value: string; bold?: boolean; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className={`${bold ? 'font-semibold' : ''} ${highlight ? 'text-gold-700 font-semibold' : 'text-dark/60'}`}>{label}</span>
      <span className={`${bold ? 'font-bold text-dark' : ''} ${highlight ? 'text-gold-700 font-bold' : ''}`}>{value}</span>
    </div>
  )
}
