export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { db } from '@/lib/firebase'
import Link from 'next/link'
import { ArrowLeft, QrCode, CheckCircle2, User, Calendar, CreditCard, Handshake } from 'lucide-react'
import { formatDate, formatPrice, getPaymentMethodLabel } from '@/lib/utils'
import WhatsAppPipeline from '@/components/admin/WhatsAppPipeline'
import PartnerQrPipeline from '@/components/partner/PartnerQrPipeline'
import PartnerNotesForm from '@/components/partner/PartnerNotesForm'
import ConfirmerPaiementButton from './ConfirmerPaiementButton'

async function getReservation(id: string, partnerId: string) {
  const doc = await db.collection('reservations').doc(id).get()
  if (!doc.exists) return null
  const data = doc.data()!

  // Autoriser : réservations du partenaire OU réservations de ses hébergements
  let allowed = data.partner_id === partnerId
  if (!allowed) {
    const accDoc = await db.collection('hebergements').doc(data.accommodation_id).get()
    if (accDoc.exists && accDoc.data()?.partner_id === partnerId) allowed = true
  }
  if (!allowed) return null

  // Règle absolue llui_site : visible uniquement si confirmée + payée
  // Exception : le partenaire qui a créé la réservation (sourcePartnerId) peut toujours la voir
  if ((data.source === 'llui_site' || data.source === 'direct') && data.visiblePartenaire !== true) {
    const isAuthor = data.sourcePartnerId === partnerId
    if (!isAuthor && !(data.reservation_status === 'confirmee' && data.payment_status === 'paye')) return null
  }

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
        {/* Bannière lecture seule — réservations L&Lui Signature */}
        {(res.source === 'llui_site' || (!res.source && res.partner_id !== partnerId)) && (
          <div className="bg-gold-50 border border-gold-200 rounded-2xl p-4 text-sm text-gold-800">
            <p className="font-semibold mb-1">🏠 Réservation confirmée via L&Lui Signature</p>
            <p className="text-xs text-gold-700">
              Réservation confirmée et réglée via L&Lui Signature. Accueillez votre client selon les dates indiquées.
            </p>
            <div className="flex gap-2 mt-3">
              <a href={`https://wa.me/${(res.guest_phone || '').replace(/\D/g,'').startsWith('237') ? res.guest_phone?.replace(/\D/g,'') : '237'+(res.guest_phone || '').replace(/\D/g,'')}`}
                target="_blank" rel="noopener noreferrer"
                className="flex-1 text-center py-2 bg-green-600 text-white rounded-xl text-xs font-medium hover:bg-green-700">
                📱 Contacter le client
              </a>
            </div>
          </div>
        )}

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
          {res.source === 'direct' && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
              Via page publique
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

        {/* Financier — masqué pour llui_site */}
        {res.source !== 'llui_site' && (
        <div className="bg-white rounded-2xl border border-beige-200 p-5">
          <h2 className="font-semibold text-dark mb-3 flex items-center gap-2 text-sm">
            <CreditCard size={14} className="text-gold-500" /> Paiement
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-dark/50">{res.nights} nuit{res.nights > 1 ? 's' : ''} × {formatPrice(res.price_per_night)}</span>
              <span className="text-dark">{formatPrice(res.subtotal)}</span>
            </div>
            {res.promo_code && res.discount_amount && (
              <div className="flex justify-between text-green-700">
                <span>Code promo ({res.promo_code})</span>
                <span>-{formatPrice(res.discount_amount)}</span>
              </div>
            )}
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
        )} {/* fin masquage financier llui_site */}

        {/* QR Code — uniquement si confirmée */}
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

        {/* ── QR Prescripteur (moto-taxi) — visible si QR généré ── */}
        {res.qr_reservation_url && res.statut_prescription !== 'commission_versee' && (
          <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-5">
            <h2 className="font-semibold text-amber-800 mb-3 flex items-center gap-2 text-sm">
              🏍 QR Code Prescripteur
              <span className="text-amber-600 font-normal">(A scanner par le moto-taxi)</span>
            </h2>
            <div className="flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={res.qr_reservation_url}
                alt="QR prescripteur"
                width={120}
                height={120}
                className="rounded-xl border border-amber-200 shrink-0"
              />
              <div className="flex-1 text-sm">
                <p className="text-amber-700 text-xs mb-2">
                  Ce QR est distinct du QR d&apos;arrivee client (LLS-XXXX).<br />
                  Le moto-taxi doit scanner CE QR apres confirmation du paiement.
                </p>
                {res.code_manuel_prescripteur && (
                  <div className="mb-2">
                    <p className="text-xs text-amber-700 font-semibold">Code manuel :</p>
                    <p className="font-mono text-xl font-bold text-dark tracking-[0.2em]">
                      {String(res.code_manuel_prescripteur).slice(0, 3)} {String(res.code_manuel_prescripteur).slice(3)}
                    </p>
                    <p className="text-xs text-amber-600">A dicter si scan impossible</p>
                  </div>
                )}
                <div className="mt-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    res.statut_prescription === 'paiement_confirme'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {res.statut_prescription === 'paiement_confirme'
                      ? '✅ Pret — le moto-taxi peut scanner'
                      : '⏳ En attente de confirmation paiement'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Bandeau prescripteur ── */}
        {(res.statut_prescription === 'disponibilite_confirmee' || res.statut_prescription === 'prescripteur_present') && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">⏳</span>
              <div>
                <p className="font-semibold text-amber-800">En attente de confirmation paiement</p>
                <p className="text-amber-700 text-sm">Moto-taxi present — en attente du paiement client</p>
              </div>
            </div>
            <ConfirmerPaiementButton reservationId={res.id} />
          </div>
        )}
        {res.statut_prescription === 'paiement_confirme' && (
          <div className="rounded-2xl bg-green-50 border border-green-200 p-4 flex items-center gap-3">
            <CheckCircle2 size={20} className="text-green-500" />
            <p className="text-green-800 text-sm font-medium">Paiement confirme — En attente scan moto-taxi</p>
          </div>
        )}
        {res.statut_prescription === 'commission_versee' && (
          <div className="rounded-2xl bg-green-50 border border-green-200 p-4 flex items-center gap-3">
            <CheckCircle2 size={20} className="text-green-500" />
            <p className="text-green-800 text-sm font-medium">Commission versee au prescripteur</p>
          </div>
        )}

        {/* ── Pipeline WhatsApp — adapté selon la source ── */}
        {res.source === 'partner_qr' ? (
          <PartnerQrPipeline reservation={res} sentBy={partnerId} />
        ) : (
          // Flux L&Lui (llui_site) — lecture seule pour le partenaire
          res.source === 'llui_site' && res.visiblePartenaire === false ? (
            <div className="bg-white rounded-2xl border border-beige-200 p-5">
              <p className="text-sm text-dark/60 text-center">
                Cette réservation est gérée directement par L&Lui Signature.
              </p>
            </div>
          ) : (
            <WhatsAppPipeline reservation={res} sentBy={partnerId} />
          )
        )}

        {/* Notes internes partenaire */}
        <PartnerNotesForm reservationId={res.id} initialNotes={res.partner_notes || ''} />
      </main>
    </div>
  )
}
