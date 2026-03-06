'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { MessageCircle, CreditCard, CheckCircle2, FileText, Loader2, ChevronRight, RefreshCw, Clock } from 'lucide-react'
import {
  sendWhatsAppProposal,
  sendWhatsAppPaymentRequest,
  confirmPayment,
  sendWhatsAppFiche,
} from '@/actions/whatsapp-pipeline'
import type { Reservation } from '@/lib/types'
import { formatDate } from '@/lib/utils'

interface Props {
  reservation: Reservation
  sentBy?: string
}

export default function WhatsAppPipeline({ reservation: res, sentBy = 'admin' }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentRef, setPaymentRef] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [confirmResend, setConfirmResend] = useState<number | null>(null)

  const isLoading = (key: string) => loading === key

  const openUrl = (url: string) => {
    window.open(url, '_blank')
  }

  // Détermination des étapes complétées
  const step1Done = !!res.whatsapp_proposal_sent_at
  const step2Done = !!res.whatsapp_payment_request_sent_at
  const step3Done = res.payment_status === 'paye'
  const step4Done = !!res.whatsapp_confirmation_sent_at

  // ——— Bouton 1
  const handleProposal = async (force = false) => {
    if (step1Done && !force) { setConfirmResend(1); return }
    setConfirmResend(null)
    setLoading('proposal')
    const result = await sendWhatsAppProposal(res.id, sentBy)
    setLoading(null)
    if (!result.success) { toast.error(result.error); return }
    toast.success('Proposition prête — ouverture WhatsApp')
    openUrl((result as any).url)
    router.refresh()
  }

  // ——— Bouton 2
  const handlePaymentRequest = async (force = false) => {
    if (!step1Done) { toast.error('Envoyez d\'abord la proposition'); return }
    if (step2Done && !force) { setConfirmResend(2); return }
    setConfirmResend(null)
    setLoading('payment_request')
    const result = await sendWhatsAppPaymentRequest(res.id, sentBy)
    setLoading(null)
    if (!result.success) { toast.error(result.error); return }
    toast.success('Demande de paiement prête — ouverture WhatsApp')
    openUrl((result as any).url)
    router.refresh()
  }

  // ——— Bouton 3
  const handleConfirmPayment = async () => {
    if (!step2Done) { toast.error('Envoyez d\'abord la demande de paiement'); return }
    if (!paymentRef.trim()) { toast.error('Saisissez la référence de paiement'); return }
    setLoading('confirm_payment')
    const result = await confirmPayment(res.id, paymentRef, paymentDate, sentBy)
    setLoading(null)
    if (!result.success) { toast.error(result.error); return }
    toast.success('Paiement confirmé')
    setShowPaymentForm(false)
    router.refresh()
  }

  // ——— Bouton 4
  const handleFiche = async (force = false) => {
    if (!step3Done) { toast.error('Confirmez d\'abord le paiement'); return }
    if (step4Done && !force) { setConfirmResend(4); return }
    setConfirmResend(null)
    setLoading('fiche')
    const result = await sendWhatsAppFiche(res.id, sentBy)
    setLoading(null)
    if (!result.success) { toast.error(result.error); return }
    toast.success('Fiche prête — ouverture WhatsApp')
    openUrl((result as any).url)
    router.refresh()
  }

  const steps = [
    {
      num: 1,
      label: 'Proposition',
      icon: MessageCircle,
      color: 'emerald',
      done: step1Done,
      active: true,
      sentAt: res.whatsapp_proposal_sent_at,
    },
    {
      num: 2,
      label: 'Demande paiement',
      icon: CreditCard,
      color: 'blue',
      done: step2Done,
      active: step1Done,
      sentAt: res.whatsapp_payment_request_sent_at,
    },
    {
      num: 3,
      label: 'Confirmer paiement',
      icon: CheckCircle2,
      color: 'amber',
      done: step3Done,
      active: step2Done,
      sentAt: res.payment_date,
    },
    {
      num: 4,
      label: 'Envoyer fiche',
      icon: FileText,
      color: 'purple',
      done: step4Done,
      active: step3Done,
      sentAt: res.whatsapp_confirmation_sent_at,
    },
  ]

  return (
    <div className="bg-white rounded-2xl border border-beige-200 p-5 space-y-4">
      <h3 className="font-semibold text-dark flex items-center gap-2">
        <MessageCircle size={16} className="text-green-500" />
        Pipeline WhatsApp
      </h3>

      {/* Pipeline visuel horizontal */}
      <div className="flex items-start gap-1 overflow-x-auto pb-1">
        {steps.map((step, idx) => {
          const Icon = step.icon
          return (
            <div key={step.num} className="flex items-center gap-1 min-w-0">
              <div className={`flex flex-col items-center gap-1 min-w-[80px] ${!step.active ? 'opacity-40' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold
                  ${step.done ? 'bg-green-500' : step.active ? 'bg-gold-500' : 'bg-gray-300'}`}>
                  {step.done ? '✓' : step.num}
                </div>
                <p className="text-[10px] text-center text-dark/60 font-medium leading-tight">{step.label}</p>
                {step.done && step.sentAt && (
                  <p className="text-[9px] text-green-600 text-center">{formatDate(step.sentAt, 'dd/MM HH:mm')}</p>
                )}
              </div>
              {idx < steps.length - 1 && (
                <ChevronRight size={14} className="text-dark/20 flex-shrink-0 mb-4" />
              )}
            </div>
          )
        })}
      </div>

      {/* Boutons d'action */}
      <div className="space-y-2 pt-2 border-t border-beige-100">

        {/* Bouton 1 */}
        {confirmResend === 1 ? (
          <div className="flex gap-2">
            <button onClick={() => handleProposal(true)} className="flex-1 py-2 px-3 text-xs bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 flex items-center justify-center gap-1">
              <RefreshCw size={12} /> Renvoyer quand même
            </button>
            <button onClick={() => setConfirmResend(null)} className="py-2 px-3 text-xs border border-beige-200 rounded-xl text-dark/50 hover:bg-beige-50">Annuler</button>
          </div>
        ) : (
          <button
            onClick={() => handleProposal()}
            disabled={!!loading}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors disabled:opacity-50
              ${step1Done ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
          >
            {isLoading('proposal') ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
            {step1Done ? (
              <span className="flex items-center gap-1">
                <Clock size={12} /> Déjà envoyé le {res.whatsapp_proposal_sent_at ? formatDate(res.whatsapp_proposal_sent_at, 'dd/MM à HH:mm') : ''}
              </span>
            ) : '1. Envoyer la proposition'}
          </button>
        )}

        {/* Bouton 2 */}
        {confirmResend === 2 ? (
          <div className="flex gap-2">
            <button onClick={() => handlePaymentRequest(true)} className="flex-1 py-2 px-3 text-xs bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 flex items-center justify-center gap-1">
              <RefreshCw size={12} /> Renvoyer quand même
            </button>
            <button onClick={() => setConfirmResend(null)} className="py-2 px-3 text-xs border border-beige-200 rounded-xl text-dark/50 hover:bg-beige-50">Annuler</button>
          </div>
        ) : (
          <button
            onClick={() => handlePaymentRequest()}
            disabled={!!loading || !step1Done}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors disabled:opacity-50
              ${step2Done ? 'bg-blue-50 border border-blue-200 text-blue-700' : step1Done ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}
          >
            {isLoading('payment_request') ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
            {step2Done ? (
              <span className="flex items-center gap-1">
                <Clock size={12} /> Déjà envoyé le {res.whatsapp_payment_request_sent_at ? formatDate(res.whatsapp_payment_request_sent_at, 'dd/MM à HH:mm') : ''}
              </span>
            ) : '2. Demander le paiement Orange Money'}
          </button>
        )}

        {/* Bouton 3 */}
        {step3Done ? (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs text-amber-800 font-medium flex items-center gap-1.5">
              <CheckCircle2 size={12} /> Paiement confirmé le {res.payment_date ? formatDate(res.payment_date, 'dd/MM/yyyy') : ''}
              {res.payment_reference && <span className="text-amber-600"> — Réf: {res.payment_reference}</span>}
            </p>
          </div>
        ) : (
          <>
            {showPaymentForm ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-amber-800">Confirmation de paiement</p>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="Référence de paiement Orange Money"
                  className="input-field text-sm"
                />
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="input-field text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleConfirmPayment}
                    disabled={!!loading || !paymentRef.trim()}
                    className="flex-1 py-2 px-3 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {isLoading('confirm_payment') ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    Confirmer
                  </button>
                  <button onClick={() => setShowPaymentForm(false)} className="py-2 px-3 border border-beige-200 rounded-lg text-xs text-dark/50 hover:bg-beige-50">Annuler</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => step2Done ? setShowPaymentForm(true) : toast.error('Envoyez d\'abord la demande de paiement')}
                disabled={!!loading || !step2Done}
                className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors disabled:opacity-50
                  ${step2Done ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}
              >
                <CheckCircle2 size={14} />
                3. Confirmer le paiement
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
            <button onClick={() => setConfirmResend(null)} className="py-2 px-3 text-xs border border-beige-200 rounded-xl text-dark/50 hover:bg-beige-50">Annuler</button>
          </div>
        ) : (
          <button
            onClick={() => handleFiche()}
            disabled={!!loading || !step3Done}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors disabled:opacity-50
              ${step4Done ? 'bg-purple-50 border border-purple-200 text-purple-700' : step3Done ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}
          >
            {isLoading('fiche') ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            {step4Done ? (
              <span className="flex items-center gap-1">
                <Clock size={12} /> Fiche envoyée le {res.whatsapp_confirmation_sent_at ? formatDate(res.whatsapp_confirmation_sent_at, 'dd/MM à HH:mm') : ''}
              </span>
            ) : '4. Envoyer fiche + QR Code'}
          </button>
        )}
      </div>
    </div>
  )
}
