'use client'

import { useState } from 'react'
import { Save, Eye, Loader2, MessageCircle, CreditCard, CheckCircle2, FileText } from 'lucide-react'
import { saveWhatsAppTemplates } from '@/actions/whatsapp-templates'
import { previewTemplate } from '@/lib/whatsapp-utils'
import { toast } from 'react-hot-toast'

interface Templates {
  template1_proposal: string
  template2_payment: string
  template3_confirmation: string
  template4_fiche: string
}

interface Props {
  initialTemplates: Templates
}

const TEMPLATE_CONFIG = [
  {
    key: 'template1_proposal' as keyof Templates,
    num: 1,
    label: 'Étape 1 — Proposition',
    icon: MessageCircle,
    color: 'text-emerald-600',
    desc: 'Envoyé au client avec les détails du séjour et le lien de suivi',
  },
  {
    key: 'template2_payment' as keyof Templates,
    num: 2,
    label: 'Étape 2 — Demande de paiement',
    icon: CreditCard,
    color: 'text-blue-600',
    desc: 'Envoyé avec les instructions de paiement Orange Money',
  },
  {
    key: 'template3_confirmation' as keyof Templates,
    num: 3,
    label: 'Étape 3 — Confirmation de paiement',
    icon: CheckCircle2,
    color: 'text-amber-600',
    desc: 'Confirmé après réception du paiement',
  },
  {
    key: 'template4_fiche' as keyof Templates,
    num: 4,
    label: 'Étape 4 — Fiche + QR Code',
    icon: FileText,
    color: 'text-purple-600',
    desc: 'Envoyé avec la fiche d\'accueil et le QR Code de check-in',
  },
]

export default function TemplatesEditor({ initialTemplates }: Props) {
  const [templates, setTemplates] = useState<Templates>(initialTemplates)
  const [saving, setSaving] = useState(false)
  const [previewKey, setPreviewKey] = useState<keyof Templates | null>(null)

  const handleSave = async () => {
    setSaving(true)
    const result = await saveWhatsAppTemplates(templates)
    setSaving(false)
    if (!result.success) { toast.error(result.error || 'Erreur'); return }
    toast.success('Templates sauvegardés')
  }

  return (
    <div className="space-y-6">
      {TEMPLATE_CONFIG.map(({ key, num, label, icon: Icon, color, desc }) => (
        <div key={key} className="bg-white rounded-2xl border border-beige-200 p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className={`font-semibold text-dark flex items-center gap-2 ${color}`}>
                <Icon size={16} />
                {label}
              </h2>
              <p className="text-xs text-dark/50 mt-0.5">{desc}</p>
            </div>
            <button
              onClick={() => setPreviewKey(previewKey === key ? null : key)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-beige-200 text-dark/60 rounded-xl text-xs hover:bg-beige-50 transition-colors whitespace-nowrap"
            >
              <Eye size={13} /> {previewKey === key ? 'Masquer aperçu' : 'Aperçu'}
            </button>
          </div>

          <textarea
            value={templates[key]}
            onChange={(e) => setTemplates((prev) => ({ ...prev, [key]: e.target.value }))}
            rows={6}
            className="input-field text-sm font-mono resize-y w-full"
            placeholder={`Template ${num}...`}
          />

          {previewKey === key && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-xs font-semibold text-green-800 mb-2">Aperçu du message (avec données exemples)</p>
              <div className="bg-white rounded-lg p-3 border border-green-100">
                <pre className="text-xs text-dark/70 whitespace-pre-wrap leading-relaxed font-sans">
                  {previewTemplate(templates[key])}
                </pre>
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="sticky bottom-0 bg-white border-t border-beige-200 -mx-6 sm:-mx-8 px-6 sm:px-8 py-4 flex items-center justify-between gap-4">
        <p className="text-xs text-dark/40">Les templates sont sauvegardés dans Firestore /settings/whatsappTemplates</p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Enregistrer tous les templates
        </button>
      </div>
    </div>
  )
}
