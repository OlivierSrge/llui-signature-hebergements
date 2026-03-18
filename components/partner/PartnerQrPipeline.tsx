'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import {
  MessageCircle, CreditCard, CheckCircle2, FileText,
  Loader2, ChevronRight, RefreshCw, Clock, Banknote, Lock,
} from 'lucide-react'
import {
  prepareWhatsAppProposal,
  prepareWhatsAppPaymentRequest,
  prepareWhatsAppFiche,
  recordWhatsAppSent,
  confirmPayment,
} from '@/actions/whatsapp-pipeline'
import { formatDate, formatPrice } from '@/lib/utils'
import WhatsAppPreviewModal from '@/components/admin/WhatsAppPreviewModal'

interface Props {
  reservation: any
  sentBy?: string
}

type FicheVariant = 'complete' | 'simple'
type ModalData = {
  message: string
  url: string
  phone: string
  recipientName: string
  buttonLabel: string
  buttonNum: 1 | 2 | 4
  showFicheVariantToggle?: boolean
  ficheVariant?: FicheVariant
  messageComplete?: string
  messageSimple?: string
  urlComplete?: string
  urlSimple?: string
}

function buildAcompteWhatsApp(res: any, partnerName: string): string {
  const clientName = `${res.guest_first_name} ${res.guest_last_name}`
  const logement = res.accommodation?.name || res.accommodation_id || '—'
  const acompte = (res.acompteAmount || 0).toLocaleString('fr-FR')
  const code = res.confirmation_code || res.id.slice(-8).toUpperCase()
  const phone = (res.guest_phone || '').replace(/\D/g, '')
  const intlPhone = phone.startsWith('237') ? phone : `237${phone}`

  const msg = `Bonjour ${clientName},\n\nMerci pour votre demande de réservation pour ${logement} du ${res.check_in || '—'} au ${res.check_out || '—'}.\n\nPour confirmer votre réservation, un acompte de service est requis auprès de L&Lui Signature :\n\n💰 Montant acompte : ${acompte} FCFA\n\n📱 Orange Money : 693407964\n   Nom : L&Lui Signature\n   Référence obligatoire : ${code}\n\n💳 Revolut : https://revolut.me/olivieqf4i\n\nDès réception confirmée par L&Lui Signature, nous vous envoyons la confirmation complète et les détails de votre séjour.\n\nL'équipe L&Lui Signature & ${partnerName}`

  return `https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`
}

export default function PartnerQrPipeline({ reservation: res, sentBy = 'partner' }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentRef, setPaymentRef] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState<string>('orange_money')
  const [confirmResend, setConfirmResend] = useState<number | null>(null)
  const [modal, setModal] = useState<ModalData | null>(null)
  const [ficheVariant, setFicheVariant] = useState<FicheVariant>('complete')

  const acompteOk = res.acompteStatus === 'confirmed' || res.acompteStatus === 'waived'
  const partnerName = res.sourcePartnerName || res.partner_name || 'Partenaire'

  const step1Done = !!res.whatsapp_proposal_sent_at
  const step2Done = !!res.whatsapp_payment_request_sent_at
  const step3Done = res.payment_status === 'paye'
  const step4Done = !!res.whatsapp_confirmation_sent_at

  const isLoading = (key: string) => loading === key

  const handleProposal = async (force = false) => {
    if (step1Done && !force) { setConfirmResend(1); return }
    setConfirmResend(null)
    setLoading('proposal')
    const result = await prepareWhatsAppProposal(res.id)
    setLoading(null)
    if (!result.success) { toast.error(result.error); return }
    setModal({ message: result.message, url: result.url, phone: result.phone, recipientName: result.recipientName, buttonLabel: '1. Proposition de réservation', buttonNum: 1 })
  }

  const handlePaymentRequest = async (force = false) => {
    if (step2Done && !force) { setConfirmResend(2); return }
    setConfirmResend(null)
    setLoading('payment_request')
    const result = await prepareWhatsAppPaymentRequest(res.id, true)
    setLoading(null)
    if (!result.success) { toast.error(result.error); return }
    setModal({ message: result.message, url: result.url, phone: result.phone, recipientName: result.recipientName, buttonLabel: '2. Demande de paiement', buttonNum: 2 })
  }

  const handleConfirmPayment = async () => {
    if (!paymentRef.trim()) { toast.error('Saisissez la référence de paiement'); return }
    setLoading('confirm_payment')
    const result = await confirmPayment(res.id, paymentRef, paymentDate, sentBy, paymentMethod)
    setLoading(null)
    if (!result.success) { toast.error(result.error); return }
    toast.success('Paiement confirmé')
    setShowPaymentForm(false)
    router.refresh()
  }

  const handleFiche = async (force = false) => {
    if (step4Done && !force) { setConfirmResend(4); return }
    setConfirmResend(null)
    setLoading('fiche')
    const result = await prepareWhatsAppFiche(res.id)
    setLoading(null)
    if (!result.success) { toast.error(result.error); return }
    const activeMessage = ficheVariant === 'complete' ? result.messageComplete : result.messageSimple
    const activeUrl = ficheVariant === 'complete' ? result.urlComplete : result.urlSimple
    setModal({
      message: activeMessage, url: activeUrl, phone: result.phone, recipientName: result.recipientName,
      buttonLabel: '4. Fiche d\'accueil + QR Code', buttonNum: 4,
      showFicheVariantToggle: true, ficheVariant,
      messageComplete: result.messageComplete, messageSimple: result.messageSimple,
      urlComplete: result.urlComplete, urlSimple: result.urlSimple,
    })
  }

  const handleFicheVariantToggle = (variant: FicheVariant) => {
    setFicheVariant(variant)
    if (!modal || modal.buttonNum !== 4) return
    const msg = variant === 'complete' ? modal.messageComplete! : modal.messageSimple!
    const url = variant === 'complete' ? modal.urlComplete! : modal.urlSimple!
    setModal((prev) => prev ? { ...prev, message: msg, url, ficheVariant: variant } : null)
  }

  const handleModalSend = async (finalMessage: string) => {
    if (!modal) return
    setModal(null)
    const result = await recordWhatsAppSent(res.id, modal.buttonNum, sentBy, modal.phone, finalMessage)
    if (!result.success) toast.error(result.error)
    else toast.success('Message enregistré')
    router.refresh()
  }

  const steps = [
    { num: 1, label: 'Proposition', icon: MessageCircle, done: step1Done, sentAt: res.whatsapp_proposal_sent_at },
    { num: 2, label: 'Paiement', icon: CreditCard, done: step2Done, sentAt: res.whatsapp_payment_request_sent_at },
    { num: 3, label: 'Confirmation', icon: CheckCircle2, done: step3Done, sentAt: res.payment_date },
    { num: 4, label: 'Fiche', icon: FileText, done: step4Done, sentAt: res.whatsapp_confirmation_sent_at },
  ]

  return (
    <>
      <div className="bg-white rounded-2xl border border-beige-200 p-5 space-y-4">
        <h3 className="font-semibold text-dark flex items-center gap-2">
          <MessageCircle size={16} className="text-green-500" />
          Pipeline WhatsApp
          <span className="ml-auto text-[10px] bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full font-medium">
            📱 QR Code — Flux L&Lui requis
          </span>
        </h3>

        {/* Pipeline visuel */}
        <div className="flex items-start gap-1 overflow-x-auto pb-1">
          {steps.map((step, idx) => {
            const Icon = step.icon
            const active = acompteOk
            return (
              <div key={step.num} className="flex items-center gap-1 min-w-0">
                <div className={`flex flex-col items-center gap-1 min-w-[70px] ${!active ? 'opacity-40' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold
                    ${step.done ? 'bg-green-500' : active ? 'bg-gold-500' : 'bg-gray-300'}`}>
                    {step.done ? '✓' : step.num}
                  </div>
                  <p className="text-[10px] text-center text-dark/60 font-medium leading-tight">{step.label}</p>
                  {step.done && step.sentAt && (
                    <p className="text-[9px] text-green-600 text-center">{formatDate(step.sentAt, 'dd/MM HH:mm')}</p>
                  )}
                </div>
                {idx < steps.length - 1 && <ChevronRight size={14} className="text-dark/20 flex-shrink-0 mb-4" />}
              </div>
            )
          })}
        </div>

        {/* ── BOUTON 0 — Acompte L&Lui (TOUJOURS EN PREMIER) ── */}
        <div className="pt-2 border-t border-beige-100 space-y-2">
          {acompteOk ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2">
              <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-green-800">
                  {res.acompteStatus === 'waived' ? '⚡ Acompte dispensé par L&Lui Signature' : '✅ Acompte L&Lui confirmé'}
                </p>
                {res.acompteAmount && res.acompteStatus !== 'waived' && (
                  <p className="text-xs text-green-600 mt-0.5">
                    {(res.acompteAmount).toLocaleString('fr-FR')} FCFA reçus — Pipeline débloqué
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <a
                href={buildAcompteWhatsApp(res, partnerName)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold bg-orange-600 text-white hover:bg-orange-700 transition-colors"
              >
                <Banknote size={15} />
                💰 Demander l'acompte L&Lui — {res.acompteAmount ? (res.acompteAmount).toLocaleString('fr-FR') + ' FCFA' : ''}
              </a>
              <p className="text-[11px] text-dark/50 text-center px-2">
                L'acompte est collecté par L&Lui Signature. Vous recevrez une notification dès confirmation.
                Le pipeline complet sera débloqué.
              </p>
            </div>
          )}

          {/* Boutons 1 à 4 — grisés si acompte non confirmé */}
          {!acompteOk ? (
            <div className="space-y-2 opacity-50 pointer-events-none">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium bg-gray-100 text-gray-400 border border-gray-200">
                  <Lock size={13} /> Étape {n} — disponible après réception de l'acompte L&Lui
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {/* Bouton 1 */}
              {confirmResend === 1 ? (
                <div className="flex gap-2">
                  <button onClick={() => handleProposal(true)} className="flex-1 py-2 px-3 text-xs bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 flex items-center justify-center gap-1">
                    <RefreshCw size={12} /> Renvoyer quand même
                  </button>
                  <button onClick={() => setConfirmResend(null)} className="py-2 px-3 text-xs border border-beige-200 rounded-xl text-dark/50">Annuler</button>
                </div>
              ) : (
                <button onClick={() => handleProposal()} disabled={!!loading}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${step1Done ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                  {isLoading('proposal') ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
                  {step1Done ? <span className="flex items-center gap-1"><Clock size={12} /> Envoyé le {formatDate(res.whatsapp_proposal_sent_at, 'dd/MM à HH:mm')}</span> : '1. Envoyer la proposition'}
                </button>
              )}

              {/* Bouton 2 */}
              {confirmResend === 2 ? (
                <div className="flex gap-2">
                  <button onClick={() => handlePaymentRequest(true)} className="flex-1 py-2 px-3 text-xs bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 flex items-center justify-center gap-1">
                    <RefreshCw size={12} /> Renvoyer quand même
                  </button>
                  <button onClick={() => setConfirmResend(null)} className="py-2 px-3 text-xs border border-beige-200 rounded-xl text-dark/50">Annuler</button>
                </div>
              ) : (
                <button onClick={() => handlePaymentRequest()} disabled={!!loading || !step1Done}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${step2Done ? 'bg-blue-50 border border-blue-200 text-blue-700' : !step1Done ? 'bg-gray-100 text-gray-400 border border-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                  {isLoading('payment_request') ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                  {step2Done ? <span className="flex items-center gap-1"><Clock size={12} /> Envoyé le {formatDate(res.whatsapp_payment_request_sent_at, 'dd/MM à HH:mm')}</span> : '2. Demander le paiement'}
                </button>
              )}

              {/* Bouton 3 */}
              {step3Done ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs text-amber-800 font-medium flex items-center gap-1.5">
                    <CheckCircle2 size={12} /> Paiement confirmé le {res.payment_date ? formatDate(res.payment_date, 'dd/MM/yyyy') : ''}
                  </p>
                </div>
              ) : (
                <>
                  {showPaymentForm ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                      <p className="text-xs font-semibold text-amber-800">Confirmation de paiement</p>
                      <input type="text" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="Référence de paiement" className="input-field text-sm" />
                      <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="input-field text-sm" />
                      <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input-field text-sm">
                        <option value="orange_money">Orange Money</option>
                        <option value="revolut">Revolut</option>
                        <option value="virement">Virement bancaire</option>
                        <option value="autre">Autre</option>
                      </select>
                      <div className="flex gap-2">
                        <button onClick={handleConfirmPayment} disabled={!!loading || !paymentRef.trim()} className="flex-1 py-2 px-3 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-1">
                          {isLoading('confirm_payment') ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Confirmer
                        </button>
                        <button onClick={() => setShowPaymentForm(false)} className="py-2 px-3 border border-beige-200 rounded-lg text-xs text-dark/50">Annuler</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowPaymentForm(true)} disabled={!!loading || !step2Done}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${!step2Done ? 'bg-gray-100 text-gray-400 border border-gray-200' : 'bg-amber-600 text-white hover:bg-amber-700'}`}>
                      <CheckCircle2 size={14} /> 3. Confirmer le paiement
                    </button>
                  )}
                </>
              )}

              {/* Bouton 4 */}
              {confirmResend === 4 ? (
                <div className="flex gap-2">
                  <button onClick={() => handleFiche(true)} className="flex-1 py-2 px-3 text-xs bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 flex items-center justify-center gap-1">
                    <RefreshCw size={12} /> Renvoyer quand même
                  </button>
                  <button onClick={() => setConfirmResend(null)} className="py-2 px-3 text-xs border border-beige-200 rounded-xl text-dark/50">Annuler</button>
                </div>
              ) : (
                <button onClick={() => handleFiche()} disabled={!!loading || !step3Done}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${step4Done ? 'bg-purple-50 border border-purple-200 text-purple-700' : !step3Done ? 'bg-gray-100 text-gray-400 border border-gray-200' : 'bg-purple-600 text-white hover:bg-purple-700'}`}>
                  {isLoading('fiche') ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                  {step4Done ? <span className="flex items-center gap-1"><Clock size={12} /> Fiche envoyée le {formatDate(res.whatsapp_confirmation_sent_at, 'dd/MM à HH:mm')}</span> : '4. Envoyer fiche + QR Code'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {modal && (
        <WhatsAppPreviewModal
          isOpen={!!modal}
          message={modal.message}
          url={modal.url}
          phone={modal.phone}
          recipientName={modal.recipientName}
          buttonLabel={modal.buttonLabel}
          showFicheVariantToggle={modal.showFicheVariantToggle}
          ficheVariant={modal.ficheVariant ?? ficheVariant}
          onFicheVariantToggle={handleFicheVariantToggle}
          onSend={handleModalSend}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}
