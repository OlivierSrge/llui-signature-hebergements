export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { db } from '@/lib/firebase'
import { formatDate, formatPrice, getReservationStatusLabel, getReservationStatusColor } from '@/lib/utils'
import { CheckCircle2, Clock, Calendar, Users, Building2, QrCode, MapPin, MessageCircle, CreditCard, FileText } from 'lucide-react'
import Image from 'next/image'

async function getReservation(id: string) {
  const doc = await db.collection('reservations').doc(id).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as any
}

export async function generateMetadata({ params }: { params: Promise<{ reservationId: string }> }) {
  const { reservationId } = await params
  const res = await getReservation(reservationId)
  if (!res) return { title: 'Réservation introuvable' }
  return {
    title: `Suivi réservation ${res.confirmation_code || reservationId.slice(-8).toUpperCase()}`,
    description: `Suivez l'état de votre réservation L&Lui Signature en temps réel`,
  }
}

const PIPELINE_STEPS = [
  { key: 'proposal', label: 'Proposition envoyée', icon: MessageCircle, color: 'emerald' },
  { key: 'payment_request', label: 'Paiement demandé', icon: CreditCard, color: 'blue' },
  { key: 'payment_confirmed', label: 'Paiement confirmé', icon: CheckCircle2, color: 'amber' },
  { key: 'fiche_sent', label: 'Confirmation envoyée', icon: FileText, color: 'purple' },
]

export default async function SuiviPage({ params }: { params: Promise<{ reservationId: string }> }) {
  const { reservationId } = await params
  const res = await getReservation(reservationId)

  if (!res) notFound()

  const steps = [
    !!res.whatsapp_proposal_sent_at,
    !!res.whatsapp_payment_request_sent_at,
    res.payment_status === 'paye',
    !!res.whatsapp_confirmation_sent_at,
  ]

  const currentStep = steps.lastIndexOf(true)
  const isConfirmed = res.reservation_status === 'confirmee'
  const isCancelled = res.reservation_status === 'annulee'

  return (
    <div className="min-h-screen bg-gradient-to-b from-beige-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-beige-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="font-serif text-xl font-semibold text-dark">L&Lui Signature</p>
            <p className="text-xs text-dark/40">Suivi de réservation</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm font-bold text-gold-600">{res.confirmation_code || `#${reservationId.slice(-8).toUpperCase()}`}</p>
            <p className="text-xs text-dark/40">Code de réservation</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Statut principal */}
        <div className={`rounded-2xl p-6 text-center ${
          isConfirmed ? 'bg-green-50 border border-green-200' :
          isCancelled ? 'bg-red-50 border border-red-200' :
          'bg-beige-50 border border-beige-200'
        }`}>
          {isConfirmed ? (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={32} className="text-green-600" />
              </div>
              <h1 className="font-serif text-2xl font-semibold text-dark mb-1">Réservation confirmée</h1>
              <p className="text-green-700 text-sm">Votre séjour est validé. Bienvenue chez L&Lui Signature !</p>
            </>
          ) : isCancelled ? (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock size={32} className="text-red-400" />
              </div>
              <h1 className="font-serif text-2xl font-semibold text-dark mb-1">Réservation annulée</h1>
              <p className="text-red-600 text-sm">Cette réservation a été annulée.</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock size={32} className="text-amber-500" />
              </div>
              <h1 className="font-serif text-2xl font-semibold text-dark mb-1">
                {getReservationStatusLabel(res.reservation_status)}
              </h1>
              <p className="text-dark/60 text-sm">
                {currentStep < 0 ? 'Votre demande a été reçue. Notre équipe vous contactera bientôt.' :
                 currentStep === 0 ? 'Une proposition vous a été envoyée. En attente de paiement.' :
                 currentStep === 1 ? 'Paiement en attente. Suivez les instructions reçues par WhatsApp.' :
                 currentStep === 2 ? 'Paiement reçu ! Votre fiche d\'accueil arrive très bientôt.' : ''}
              </p>
            </>
          )}
        </div>

        {/* Pipeline visuel */}
        <div className="bg-white rounded-2xl border border-beige-200 p-6">
          <h2 className="font-semibold text-dark mb-5">Progression</h2>
          <div className="space-y-4">
            {PIPELINE_STEPS.map((step, idx) => {
              const done = steps[idx]
              const Icon = step.icon
              return (
                <div key={step.key} className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                    ${done ? 'bg-green-500 text-white' : idx === currentStep + 1 ? 'bg-gold-100 text-gold-600 border-2 border-gold-400' : 'bg-gray-100 text-gray-300'}`}>
                    {done ? <CheckCircle2 size={18} /> : <Icon size={18} />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${done ? 'text-dark' : 'text-dark/40'}`}>{step.label}</p>
                    {done && idx === 0 && res.whatsapp_proposal_sent_at && (
                      <p className="text-xs text-dark/40">{formatDate(res.whatsapp_proposal_sent_at, 'dd/MM/yyyy à HH:mm')}</p>
                    )}
                    {done && idx === 1 && res.whatsapp_payment_request_sent_at && (
                      <p className="text-xs text-dark/40">{formatDate(res.whatsapp_payment_request_sent_at, 'dd/MM/yyyy à HH:mm')}</p>
                    )}
                    {done && idx === 2 && res.payment_date && (
                      <p className="text-xs text-dark/40">{formatDate(res.payment_date, 'dd/MM/yyyy')} — Réf: {res.payment_reference || '—'}</p>
                    )}
                    {done && idx === 3 && res.whatsapp_confirmation_sent_at && (
                      <p className="text-xs text-dark/40">{formatDate(res.whatsapp_confirmation_sent_at, 'dd/MM/yyyy à HH:mm')}</p>
                    )}
                  </div>
                  {done && <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />}
                </div>
              )
            })}
          </div>
        </div>

        {/* Détails du séjour */}
        <div className="bg-white rounded-2xl border border-beige-200 p-6">
          <h2 className="font-semibold text-dark mb-4 flex items-center gap-2">
            <Calendar size={16} className="text-gold-500" /> Détails du séjour
          </h2>
          <div className="space-y-3 text-sm">
            {res.accommodation?.name && (
              <div className="flex items-start gap-3">
                <Building2 size={15} className="text-gold-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-dark">{res.accommodation.name}</p>
                  {res.accommodation.location && <p className="text-dark/50 text-xs flex items-center gap-1 mt-0.5"><MapPin size={10} />{res.accommodation.location}</p>}
                </div>
              </div>
            )}
            {res.check_in && (
              <div className="flex items-center gap-3">
                <Calendar size={15} className="text-gold-500 flex-shrink-0" />
                <p className="text-dark">
                  {formatDate(res.check_in)} → {res.check_out && formatDate(res.check_out)}
                  {res.nights && <span className="text-dark/50 ml-2">({res.nights} nuit{res.nights > 1 ? 's' : ''})</span>}
                </p>
              </div>
            )}
            {res.guests && (
              <div className="flex items-center gap-3">
                <Users size={15} className="text-gold-500 flex-shrink-0" />
                <p className="text-dark">{res.guests} personne{res.guests > 1 ? 's' : ''}</p>
              </div>
            )}
            {res.total_price && (
              <div className="flex items-center justify-between pt-3 border-t border-beige-200">
                <p className="font-semibold text-dark">Total</p>
                <p className="font-bold text-dark">{formatPrice(res.total_price)}</p>
              </div>
            )}
          </div>
        </div>

        {/* QR Code — visible uniquement si confirmé */}
        {isConfirmed && res.qr_code_data && (
          <div className="bg-white rounded-2xl border border-green-200 p-6 text-center">
            <h2 className="font-semibold text-dark mb-2 flex items-center justify-center gap-2">
              <QrCode size={16} className="text-green-500" /> Votre QR Code d&apos;arrivée
            </h2>
            <p className="text-xs text-dark/50 mb-4">Présentez ce QR Code à l&apos;accueil lors de votre arrivée</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={res.qr_code_data}
              alt="QR Code d'arrivée"
              className="w-48 h-48 mx-auto rounded-xl border border-beige-200"
            />
            <p className="font-mono text-sm font-bold text-gold-600 mt-3">{res.confirmation_code}</p>
          </div>
        )}

        {/* Contact */}
        <div className="bg-beige-50 rounded-2xl border border-beige-200 p-5 text-center">
          <p className="text-sm text-dark/60">Une question ? Contactez-nous par WhatsApp</p>
          <a
            href={`https://wa.me/237693407964?text=Bonjour, j'ai une question concernant ma réservation ${res.confirmation_code || reservationId.slice(-8).toUpperCase()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-3 px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <MessageCircle size={16} /> Contacter L&Lui Signature
          </a>
        </div>
      </div>
    </div>
  )
}
