'use client'

import { useState, useEffect, useTransition } from 'react'
import { X, Download, Eye, MessageCircle, Mail, CheckCircle, AlertCircle } from 'lucide-react'
import type { PartnerRow, CommissionsData } from './CommissionsWidget'
import { DEFAULT_ADMIN_PAYMENT_SETTINGS } from '@/lib/payment-settings'
import type { AdminPaymentSettings } from '@/lib/payment-settings'
import {
  getAdminPaymentSettingsForPDF,
  getPartnerForCommission,
  saveCommissionRequest,
  updateCommissionRequestStatus,
  sendCommissionEmailAction,
} from '@/actions/commission-requests'
import { generateCommissionRequestPDF } from '@/lib/generateCommissionPDF'
import type { CommissionPDFData } from '@/lib/generateCommissionPDF'

// ── Helpers ─────────────────────────────────────────────────────────────────

const MONTH_NAMES_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n))
}

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  row: PartnerRow
  months: CommissionsData['months']
  onClose: () => void
}

// ── Composant ────────────────────────────────────────────────────────────────

export default function CommissionRequestModal({ row, months, onClose }: Props) {
  // Mois disponibles (avec commissions > 0)
  const availableMonthIndices = row.months
    .map((cell, i) => ({ cell, i }))
    .filter(({ cell }) => cell && cell.amount > 0)
    .map(({ i }) => i)

  const defaultMonthIdx = availableMonthIndices[availableMonthIndices.length - 1] ?? 0

  const [selectedMonthIdx, setSelectedMonthIdx] = useState(defaultMonthIdx)
  const [paymentSettings, setPaymentSettings] = useState<AdminPaymentSettings>(DEFAULT_ADMIN_PAYMENT_SETTINGS)
  const [partnerDetails, setPartnerDetails] = useState<{
    email: string; whatsapp_number: string; plan: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSendingEmail, startEmailTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [whatsappSent, setWhatsappSent] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  useEffect(() => {
    async function load() {
      const [ps, partner] = await Promise.all([
        getAdminPaymentSettingsForPDF(),
        getPartnerForCommission(row.partnerId),
      ])
      setPaymentSettings(ps)
      if (partner) setPartnerDetails({ email: partner.email, whatsapp_number: partner.whatsapp_number, plan: partner.plan })
      setIsLoading(false)
    }
    load()
  }, [row.partnerId])

  // Données du mois sélectionné
  const selectedCell = row.months[selectedMonthIdx]
  const monthKey = months[selectedMonthIdx]?.key || ''
  const [yearStr, monthStr] = monthKey.split('-')
  const year = parseInt(yearStr || String(new Date().getFullYear()))
  const month = parseInt(monthStr || '1')
  const monthName = MONTH_NAMES_FR[month - 1] || ''
  const reservations = selectedCell?.reservations || []
  const total = selectedCell?.amount || 0
  const ref = `LLUI-COM-${year}-${String(month).padStart(2, '0')}-${row.partnerId.slice(0, 5).toUpperCase()}`

  const limitDate = new Date()
  limitDate.setDate(limitDate.getDate() + 30)
  const limitDateStr = limitDate.toLocaleDateString('fr-FR')

  const getPDFData = (): CommissionPDFData => ({
    partnerId: row.partnerId,
    partnerName: row.partnerName,
    partnerPlan: partnerDetails?.plan || row.partnerPlan,
    partnerPhone: partnerDetails?.whatsapp_number || '',
    month,
    year,
    reservations: reservations.map((r) => ({
      code: r.code,
      guestName: r.guestName,
      accommodationName: (r as any).accommodationName || '—',
      checkIn: (r as any).checkIn || '',
      checkOut: (r as any).checkOut || '',
      totalPrice: r.totalPrice,
      commissionAmount: r.commissionAmount,
    })),
    paymentSettings,
  })

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handlePreview = () => {
    const pdf = generateCommissionRequestPDF(getPDFData())
    window.open(pdf.output('bloburl') as unknown as string, '_blank')
  }

  const handleDownload = async () => {
    const pdf = generateCommissionRequestPDF(getPDFData())
    pdf.save(`Demande_Commission_${row.partnerName.replace(/\s+/g, '_')}_${monthName}_${year}.pdf`)
    await saveCommissionRequest({
      partnerId: row.partnerId,
      partnerName: row.partnerName,
      ref,
      month,
      year,
      totalAmount: total,
      reservationsCount: reservations.length,
    })
  }

  const handleWhatsApp = async () => {
    const omNumber = paymentSettings.orange_money_number || '693407964'
    const revolut = paymentSettings.revolut_link || 'https://revolut.me/olivieqf4i'
    const phone = (partnerDetails?.whatsapp_number || '').replace(/\D/g, '')
    const formattedPhone = phone.startsWith('237') ? phone : `237${phone}`

    const msg = [
      `Bonjour ${row.partnerName},`,
      '',
      `Veuillez trouver ci-joint votre demande de règlement des commissions L&Lui Signature pour le mois de ${monthName} ${year}.`,
      '',
      `Montant dû : ${formatFCFA(total)} FCFA`,
      `Référence : ${ref}`,
      `Date limite : ${limitDateStr}`,
      '',
      'Modes de paiement acceptés :',
      `📱 Orange Money : ${omNumber}`,
      `💳 Revolut : ${revolut}`,
      '',
      'Merci de votre règlement dans les délais convenus.',
      "L'équipe L&Lui Signature",
    ].join('\n')

    await saveCommissionRequest({
      partnerId: row.partnerId,
      partnerName: row.partnerName,
      ref,
      month,
      year,
      totalAmount: total,
      reservationsCount: reservations.length,
    })
    await updateCommissionRequestStatus(row.partnerId, ref, 'sent_whatsapp')
    setWhatsappSent(true)

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  const handleSendEmail = () => {
    if (!partnerDetails?.email) return
    startEmailTransition(async () => {
      const pdf = generateCommissionRequestPDF(getPDFData())
      const pdfBase64 = pdf.output('datauristring').split(',')[1]

      const result = await sendCommissionEmailAction({
        partnerEmail: partnerDetails.email,
        partnerName: row.partnerName,
        month,
        year,
        totalAmount: total,
        ref,
        limitDate: limitDateStr,
        omNumber: paymentSettings.orange_money_number || '693407964',
        revolutLink: paymentSettings.revolut_link || 'https://revolut.me/olivieqf4i',
        pdfBase64,
      })

      if (result.success) {
        await saveCommissionRequest({
          partnerId: row.partnerId,
          partnerName: row.partnerName,
          ref,
          month,
          year,
          totalAmount: total,
          reservationsCount: reservations.length,
        })
        await updateCommissionRequestStatus(row.partnerId, ref, 'sent_email')
        setEmailSent(true)
        setFeedback({ type: 'success', msg: `Email envoyé à ${partnerDetails.email}` })
      } else {
        setFeedback({ type: 'error', msg: result.error || 'Erreur lors de l\'envoi' })
      }
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-dark/50 backdrop-blur-sm" />
      <div
        className="relative bg-white w-full sm:max-w-xl sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── En-tête ── */}
        <div className="px-5 py-4 border-b border-beige-100 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="font-semibold text-dark text-sm">📄 Demande de paiement des commissions</p>
            <p className="text-xs text-dark/50">{row.partnerName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-beige-50 text-dark/40">
            <X size={16} />
          </button>
        </div>

        {/* ── Corps ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isLoading ? (
            <div className="py-8 text-center text-dark/40 text-sm">Chargement…</div>
          ) : (
            <>
              {/* Sélecteur de mois */}
              {availableMonthIndices.length > 1 && (
                <div>
                  <label className="text-xs font-semibold text-dark/60 mb-1.5 block">Mois concerné</label>
                  <select
                    value={selectedMonthIdx}
                    onChange={(e) => {
                      setSelectedMonthIdx(Number(e.target.value))
                      setFeedback(null)
                      setWhatsappSent(false)
                      setEmailSent(false)
                    }}
                    className="w-full border border-beige-200 rounded-xl px-3 py-2 text-sm text-dark bg-beige-50 focus:outline-none"
                  >
                    {availableMonthIndices.map((idx) => (
                      <option key={idx} value={idx}>{months[idx]?.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Résumé */}
              <div className="bg-beige-50 rounded-xl p-4 text-center">
                <p className="text-xs text-dark/50 mb-1">Total commissions dues — {monthName} {year}</p>
                <p className="text-3xl font-bold text-gold-600">{formatFCFA(total)} <span className="text-lg font-normal text-dark/40">FCFA</span></p>
                <p className="text-xs text-dark/40 mt-1">{reservations.length} réservation{reservations.length > 1 ? 's' : ''} · Réf : {ref}</p>
                <p className="text-xs text-dark/40">Date limite : {limitDateStr}</p>
              </div>

              {/* Boutons PDF */}
              <div>
                <p className="text-xs font-semibold text-dark/60 mb-2">Document PDF</p>
                <div className="flex gap-2">
                  <button
                    onClick={handlePreview}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm border border-beige-200 rounded-xl hover:bg-beige-50 transition-colors text-dark"
                  >
                    <Eye size={15} /> Prévisualiser
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm bg-dark text-white rounded-xl hover:bg-dark/80 transition-colors"
                  >
                    <Download size={15} /> Télécharger
                  </button>
                </div>
              </div>

              {/* WhatsApp */}
              <div>
                <p className="text-xs font-semibold text-dark/60 mb-2">Envoyer au partenaire</p>
                <button
                  onClick={handleWhatsApp}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                >
                  <MessageCircle size={15} />
                  {whatsappSent ? '✓ WhatsApp ouvert' : '📱 Envoyer via WhatsApp'}
                </button>
                {partnerDetails?.whatsapp_number && (
                  <p className="text-[10px] text-dark/40 text-center mt-1">{partnerDetails.whatsapp_number}</p>
                )}
                <div className="mt-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 text-xs text-amber-700 space-y-0.5">
                  <p className="font-semibold">Instructions :</p>
                  <p>① Téléchargez le PDF ci-dessus</p>
                  <p>② Cliquez sur "Envoyer via WhatsApp" (message pré-rempli)</p>
                  <p>③ Dans WhatsApp, joignez le PDF au message avant d'envoyer</p>
                </div>
              </div>

              {/* Email */}
              {partnerDetails?.email ? (
                <div>
                  <button
                    onClick={handleSendEmail}
                    disabled={isSendingEmail || emailSent}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                  >
                    <Mail size={15} />
                    {isSendingEmail
                      ? 'Envoi en cours…'
                      : emailSent
                      ? '✓ Email envoyé'
                      : '📧 Envoyer par email (avec PDF joint)'}
                  </button>
                  <p className="text-[10px] text-dark/40 text-center mt-1">{partnerDetails.email}</p>
                </div>
              ) : (
                <p className="text-xs text-dark/30 text-center italic">Email non disponible pour ce partenaire</p>
              )}

              {/* Feedback */}
              {feedback && (
                <div
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${
                    feedback.type === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-100'
                      : 'bg-red-50 text-red-700 border border-red-100'
                  }`}
                >
                  {feedback.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                  {feedback.msg}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
