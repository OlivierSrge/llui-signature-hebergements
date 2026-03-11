'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { FileSignature, Send, CheckCircle, Clock, AlertCircle, ExternalLink } from 'lucide-react'
import { sendContractToPartner } from '@/actions/contract'

interface Props {
  partnerId: string
  partnerName: string
  contractStatus: string
  contractId: string
  signedAt?: string
  pdfUrl?: string
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string; desc: string }> = {
  not_sent: {
    label: 'Non envoyé',
    icon: AlertCircle,
    className: 'bg-gray-100 text-gray-600 border-gray-200',
    desc: 'Le contrat n\'a pas encore été envoyé à ce partenaire.',
  },
  sent: {
    label: 'Envoyé',
    icon: Clock,
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    desc: 'Le contrat a été envoyé. En attente de signature.',
  },
  otp_pending: {
    label: 'OTP en cours',
    icon: Clock,
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    desc: 'Le partenaire est en train de signer (validation OTP en cours).',
  },
  signed: {
    label: 'Signé ✓',
    icon: CheckCircle,
    className: 'bg-green-50 text-green-700 border-green-200',
    desc: 'Le contrat a été signé électroniquement avec validation OTP WhatsApp.',
  },
}

export default function PartnerContractSection({
  partnerId,
  partnerName,
  contractStatus,
  contractId,
  signedAt,
  pdfUrl,
}: Props) {
  const [sending, setSending] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(contractStatus)
  const [currentId, setCurrentId] = useState(contractId)
  const [waUrl, setWaUrl] = useState('')

  const config = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.not_sent
  const Icon = config.icon

  const handleSend = async () => {
    setSending(true)
    const res = await sendContractToPartner(partnerId)
    setSending(false)

    if (!res.success) {
      toast.error(res.error || 'Erreur lors de l\'envoi')
      return
    }

    setCurrentStatus('sent')
    setCurrentId(res.contractId || '')
    toast.success('Contrat envoyé ! Cliquez sur "Ouvrir WhatsApp" pour notifier le partenaire.')

    if (res.whatsappUrl) {
      setWaUrl(res.whatsappUrl)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-beige-200 p-5 space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-beige-100">
        <FileSignature size={16} className="text-gold-500" />
        <h3 className="font-semibold text-dark">Contrat de partenariat</h3>
      </div>

      {/* Statut */}
      <div className={`flex items-start gap-3 p-3 rounded-xl border ${config.className}`}>
        <Icon size={16} className="mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium text-sm">{config.label}</p>
          <p className="text-xs mt-0.5 opacity-80">{config.desc}</p>
        </div>
      </div>

      {/* Infos contrat */}
      {currentId && (
        <div className="text-xs text-dark/50 space-y-1">
          <p>Numéro : <span className="font-mono text-dark/70">{currentId}</span></p>
          {signedAt && (
            <p>Signé le : {new Date(signedAt).toLocaleDateString('fr-FR', {
              day: 'numeric', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })}</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {currentStatus !== 'signed' && (
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-2 px-4 py-2 bg-dark text-white rounded-xl text-sm font-medium hover:bg-dark/80 disabled:opacity-50 transition-colors"
          >
            <Send size={14} />
            {sending
              ? 'Envoi…'
              : currentStatus === 'not_sent'
                ? 'Envoyer le contrat'
                : 'Renvoyer le contrat'}
          </button>
        )}

        {waUrl && (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <ExternalLink size={14} /> Ouvrir WhatsApp
          </a>
        )}

        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 border border-beige-300 text-dark/60 rounded-xl text-sm hover:bg-beige-50 transition-colors"
          >
            <FileSignature size={14} /> Voir le contrat signé
          </a>
        )}
      </div>

      {currentStatus === 'sent' && (
        <p className="text-xs text-dark/40">
          Demandez au partenaire de se connecter à{' '}
          <span className="font-mono">llui-signature-hebergements.vercel.app/partenaire/contrat</span>
          {' '}pour signer.
        </p>
      )}
    </div>
  )
}
