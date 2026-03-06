'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle, XCircle, DollarSign, MessageCircle, ImageIcon, QrCode } from 'lucide-react'
import { updatePaymentStatus, updateReservationStatus } from '@/actions/reservations'
import { sendWhatsAppFiche } from '@/actions/whatsapp-pipeline'
import { formatDate, formatPrice, getPaymentMethodLabel } from '@/lib/utils'

interface Props {
  reservation: any
}

function buildWhatsAppMessage(res: any): string {
  const statusLabel =
    res.reservation_status === 'confirmee' ? 'Confirmée ✅'
    : res.reservation_status === 'en_attente' ? 'En attente ⏳'
    : 'Annulée ❌'

  const paymentLabel =
    res.payment_status === 'paye' ? 'Payé ✅'
    : res.payment_status === 'annule' ? 'Annulé ❌'
    : 'En attente ⏳'

  let msg = `🕊️ *L&Lui Signature* — Fiche de Réservation\n\n`
  msg += `Bonjour ${res.guest_first_name} ${res.guest_last_name} 👋\n\n`
  msg += `Voici le récapitulatif complet de votre réservation :\n\n`

  if (res.confirmation_code) {
    msg += `📋 *Référence :* ${res.confirmation_code}\n`
  }
  msg += `📊 *Statut :* ${statusLabel}\n\n`

  msg += `━━━━━━━━━━━━━━━━━━━\n`
  msg += `🏠 *Hébergement*\n`
  msg += `━━━━━━━━━━━━━━━━━━━\n`
  msg += `${res.accommodation?.name ?? res.accommodation_id}\n`
  if (res.accommodation?.location) msg += `📍 ${res.accommodation.location}\n`
  msg += `\n`

  msg += `━━━━━━━━━━━━━━━━━━━\n`
  msg += `📅 *Dates du séjour*\n`
  msg += `━━━━━━━━━━━━━━━━━━━\n`
  msg += `✈️ Arrivée : ${formatDate(res.check_in, 'dd/MM/yyyy')}\n`
  msg += `🏁 Départ  : ${formatDate(res.check_out, 'dd/MM/yyyy')}\n`
  msg += `🌙 Durée   : ${res.nights} nuit${res.nights > 1 ? 's' : ''}\n`
  msg += `👥 Voyageurs : ${res.guests} personne${res.guests > 1 ? 's' : ''}\n\n`

  msg += `━━━━━━━━━━━━━━━━━━━\n`
  msg += `💰 *Paiement*\n`
  msg += `━━━━━━━━━━━━━━━━━━━\n`
  msg += `💵 Tarif : ${formatPrice(res.price_per_night)}/nuit\n`
  msg += `💰 Total : ${formatPrice(res.total_price)}\n`
  msg += `💳 Mode  : ${getPaymentMethodLabel(res.payment_method)}\n`
  msg += `✅ Statut : ${paymentLabel}\n\n`

  if (res.confirmation_code && res.reservation_status === 'confirmee') {
    msg += `━━━━━━━━━━━━━━━━━━━\n`
    msg += `🎫 *Code d'arrivée*\n`
    msg += `━━━━━━━━━━━━━━━━━━━\n`
    msg += `*${res.confirmation_code}*\n`
    if (res.qr_code_data) {
      msg += `\n📲 *Votre QR Code :*\n${res.qr_code_data}\n`
    }
    msg += `_(À présenter à votre arrivée)_\n\n`
  }

  if (res.notes) {
    msg += `━━━━━━━━━━━━━━━━━━━\n`
    msg += `📝 *Notes*\n`
    msg += `━━━━━━━━━━━━━━━━━━━\n`
    msg += `${res.notes}\n\n`
  }

  msg += `━━━━━━━━━━━━━━━━━━━\n`
  msg += `📞 *L&Lui Signature*\n`
  msg += `Kribi — Cameroun\n`
  msg += `☎️ 693 407 964\n`
  msg += `🌐 https://letlui-signature.netlify.app/\n`
  msg += `━━━━━━━━━━━━━━━━━━━`

  return msg
}

function formatPhoneForWhatsApp(phone: string | undefined): string {
  if (!phone) return ''
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '')
  if (!cleaned.startsWith('237') && (cleaned.startsWith('6') || cleaned.startsWith('2'))) {
    cleaned = '237' + cleaned
  }
  return cleaned
}

export default function PartnerReservationActions({ reservation: res }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [paymentRef, setPaymentRef] = useState(res.payment_reference || '')
  const [showCancel, setShowCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [sharingLogo, setSharingLogo] = useState(false)
  const [sendingFiche, setSendingFiche] = useState(false)
  const [ficheUrl, setFicheUrl] = useState<string | null>(null)

  const act = async (key: string, fn: () => Promise<{ success?: boolean; error?: string }>) => {
    setLoading(key)
    try {
      const result = await fn()
      if (!result.success) toast.error(result.error || 'Erreur')
      else { toast.success('Mis à jour'); router.refresh() }
    } catch { toast.error('Erreur') }
    finally { setLoading(null) }
  }

  const isLoading = (key: string) => loading === key

  const message = buildWhatsAppMessage(res)
  const phone = formatPhoneForWhatsApp(res.guest_phone)
  const waUrl = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`

  const logoUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://llui-signature-hebergements.vercel.app'}/logo.png`

  const handleSendFiche = async () => {
    setSendingFiche(true)
    setFicheUrl(null)
    try {
      const result = await sendWhatsAppFiche(res.id)
      if (!result.success) {
        toast.error((result as any).error || 'Erreur envoi fiche')
      } else {
        toast.success('Fiche prête — appuyez sur "Ouvrir WhatsApp"')
        router.refresh()
        setFicheUrl((result as any).url || null)
      }
    } catch {
      toast.error('Erreur envoi fiche')
    } finally {
      setSendingFiche(false)
    }
  }

  const shareQrCode = async () => {
    const qrUrl = res.qr_code_data
    if (!qrUrl) return
    try {
      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
        const response = await fetch(qrUrl)
        const blob = await response.blob()
        const file = new File([blob], `qr-${res.confirmation_code || res.id}.png`, { type: blob.type })
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ title: `QR Code — ${res.confirmation_code}`, files: [file] })
          return
        }
      }
      window.open(qrUrl, '_blank')
    } catch {
      window.open(qrUrl, '_blank')
    }
  }

  const shareLogo = async () => {
    setSharingLogo(true)
    try {
      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
        const response = await fetch(logoUrl)
        const blob = await response.blob()
        const file = new File([blob], 'logo-llui.png', { type: blob.type })
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ title: 'L&Lui Signature', files: [file] })
          setSharingLogo(false)
          return
        }
      }
      window.open(logoUrl, '_blank')
    } catch {
      window.open(logoUrl, '_blank')
    } finally {
      setSharingLogo(false)
    }
  }

  if (res.reservation_status === 'annulee') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center text-sm text-red-700">
        Cette réservation a été annulée.
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* ── WhatsApp ── */}
      <div className="bg-white rounded-2xl border border-beige-200 p-5 space-y-3">
        <h2 className="font-semibold text-dark text-sm flex items-center gap-2">
          <MessageCircle size={14} className="text-green-600" /> Envoyer la fiche au client
        </h2>
        <p className="text-xs text-dark/50">
          Envoyez le récapitulatif complet de la réservation via WhatsApp, puis partagez le logo L&amp;Lui Signature.
        </p>
        <div className="bg-beige-50 rounded-xl p-3 text-xs text-dark/60 font-mono whitespace-pre-wrap max-h-52 overflow-y-auto border border-beige-100">
          {message}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <MessageCircle size={15} /> Envoyer par WhatsApp
          </a>
          <button
            type="button"
            onClick={shareLogo}
            disabled={sharingLogo}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 border border-green-300 text-green-800 rounded-xl text-sm font-medium hover:bg-green-50 transition-colors disabled:opacity-50"
          >
            {sharingLogo ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />}
            Partager le logo
          </button>
        </div>
      </div>

      {/* ── Fiche d'accueil + QR Code ── */}
      {(res.payment_status === 'paye' || res.reservation_status === 'confirmee') && (
        <div className="bg-white rounded-2xl border border-gold-200 p-5 space-y-3">
          <h2 className="font-semibold text-dark text-sm flex items-center gap-2">
            <QrCode size={14} className="text-gold-600" /> Fiche d&apos;accueil + QR Code
          </h2>
          <p className="text-xs text-dark/50">
            Confirme la réservation, génère le QR Code et ouvre WhatsApp avec la fiche d&apos;accueil prête à envoyer.
          </p>

          {res.qr_code_data && (
            <div className="flex items-center gap-3 p-3 bg-beige-50 rounded-xl border border-beige-100">
              <img
                src={res.qr_code_data}
                alt="QR Code arrivée"
                className="w-16 h-16 rounded-lg border border-beige-200 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-dark">{res.confirmation_code}</p>
                <p className="text-xs text-dark/50 mt-0.5">QR Code généré</p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {!ficheUrl ? (
              <button
                type="button"
                onClick={handleSendFiche}
                disabled={sendingFiche}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-gold-500 text-white rounded-xl text-sm font-medium hover:bg-gold-600 disabled:opacity-50 transition-colors"
              >
                {sendingFiche ? <Loader2 size={15} className="animate-spin" /> : <QrCode size={15} />}
                {sendingFiche ? 'Préparation...' : (res.reservation_status === 'confirmee' ? 'Renvoyer la fiche + QR' : 'Envoyer fiche + QR Code')}
              </button>
            ) : (
              <a
                href={ficheUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
              >
                <MessageCircle size={15} /> Ouvrir WhatsApp
              </a>
            )}
            {res.qr_code_data && (
              <button
                type="button"
                onClick={shareQrCode}
                className="flex items-center justify-center gap-2 py-2.5 px-4 border border-gold-300 text-gold-700 rounded-xl text-sm font-medium hover:bg-gold-50 transition-colors"
              >
                <ImageIcon size={15} /> Partager QR
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Actions réservation ── */}
      <div className="bg-white rounded-2xl border border-beige-200 p-5 space-y-4">
        <h2 className="font-semibold text-dark text-sm">Actions</h2>

      {/* Paiement */}
      {res.payment_status !== 'paye' && (
        <div className="space-y-2">
          <p className="text-xs text-dark/50 font-medium uppercase tracking-widest">Paiement reçu</p>
          <input
            type="text"
            value={paymentRef}
            onChange={(e) => setPaymentRef(e.target.value)}
            placeholder="Référence / numéro de transaction (optionnel)"
            className="input-field text-sm"
          />
          <button
            disabled={!!loading}
            onClick={() => act('pay', () => updatePaymentStatus(res.id, 'paye', paymentRef || undefined))}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {isLoading('pay') ? <Loader2 size={15} className="animate-spin" /> : <DollarSign size={15} />}
            Valider le paiement
          </button>
        </div>
      )}

      {res.payment_status === 'paye' && (
        <div className="flex items-center gap-2 text-green-700 text-sm bg-green-50 border border-green-200 rounded-xl p-3">
          <DollarSign size={14} />
          Paiement validé
          {res.payment_date && ` le ${new Date(res.payment_date).toLocaleDateString('fr-FR')}`}
        </div>
      )}

      {/* Réservation — confirmer si en attente */}
      {res.reservation_status === 'en_attente' && (
        <div className="space-y-2 border-t border-beige-100 pt-4">
          <p className="text-xs text-dark/50 font-medium uppercase tracking-widest">Réservation</p>
          <button
            disabled={!!loading}
            onClick={() => act('confirm', () => updateReservationStatus(res.id, 'confirmee'))}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gold-500 text-white rounded-xl text-sm font-medium hover:bg-gold-600 disabled:opacity-50 transition-colors"
          >
            {isLoading('confirm') ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
            Confirmer la réservation
          </button>

          {!showCancel ? (
            <button
              onClick={() => setShowCancel(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
            >
              <XCircle size={15} /> Annuler la réservation
            </button>
          ) : (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={2}
                placeholder="Motif d'annulation (optionnel)"
                className="input-field text-sm resize-none"
              />
              <div className="flex gap-2">
                <button
                  disabled={!!loading}
                  onClick={() => act('cancel', () => updateReservationStatus(res.id, 'annulee', undefined, cancelReason || undefined))}
                  className="flex-1 py-2 px-3 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {isLoading('cancel') ? <Loader2 size={12} className="animate-spin" /> : null}
                  Confirmer l&apos;annulation
                </button>
                <button
                  onClick={() => setShowCancel(false)}
                  className="py-2 px-3 bg-white border border-beige-200 rounded-lg text-xs text-dark/60 hover:bg-beige-50"
                >
                  Retour
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {res.reservation_status === 'confirmee' && (
        <div className="flex items-center gap-2 text-green-700 text-sm bg-green-50 border border-green-200 rounded-xl p-3">
          <CheckCircle size={14} />
          Réservation confirmée
          {res.confirmed_at && ` le ${new Date(res.confirmed_at).toLocaleDateString('fr-FR')}`}
        </div>
      )}
      </div>
    </div>
  )
}
