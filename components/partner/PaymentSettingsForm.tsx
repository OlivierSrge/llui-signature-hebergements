'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { Smartphone, Building2, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react'
import { savePaymentSettings, type PaymentSettings, EMPTY_PAYMENT_SETTINGS } from '@/actions/payment-settings'

interface Props {
  partnerId: string
  initialSettings: PaymentSettings | null
}

const BANKS = ['Afriland First Bank', 'UBA', 'BICEC', 'SCB', 'Ecobank', 'CCA Bank', 'BGFI Bank', 'Société Générale', 'Autre']

export default function PaymentSettingsForm({ partnerId, initialSettings }: Props) {
  const [settings, setSettings] = useState<PaymentSettings>(initialSettings ?? EMPTY_PAYMENT_SETTINGS)
  const [saving, setSaving] = useState(false)

  const set = (key: keyof PaymentSettings, value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    const result = await savePaymentSettings(partnerId, settings)
    setSaving(false)
    if (result.success) toast.success('Paramètres sauvegardés')
    else toast.error(result.error || 'Erreur lors de la sauvegarde')
  }

  const omConfigured = !!settings.orange_money_number.trim()

  // Génère un lien WhatsApp de test pour vérifier le numéro OM
  const testOmUrl = omConfigured
    ? `https://wa.me/${settings.orange_money_number.replace(/\D/g, '')}?text=${encodeURIComponent('Test numéro Orange Money — L&Lui Signature')}`
    : null

  return (
    <div className="space-y-6">
      {/* Bannière si OM non configuré */}
      {!omConfigured && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-300 rounded-xl">
          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Numéro Orange Money non configuré</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Les paiements de vos clients seront collectés via le numéro L&Lui Signature (693407964).
              Configurez votre numéro ci-dessous pour recevoir les paiements directement.
            </p>
          </div>
        </div>
      )}

      {/* Section Orange Money */}
      <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-beige-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
            <Smartphone size={18} className="text-orange-500" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-dark text-sm">Orange Money</h2>
            <p className="text-xs text-dark/40">Numéro de réception des paiements clients</p>
          </div>
          {omConfigured ? (
            <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full">
              <CheckCircle size={11} /> Configuré
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
              <AlertTriangle size={11} /> Manquant
            </span>
          )}
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label text-xs">Numéro Orange Money principal <span className="text-red-500">*</span></label>
            <input
              type="tel"
              value={settings.orange_money_number}
              onChange={(e) => set('orange_money_number', e.target.value)}
              className="input-field text-sm"
              placeholder="+237 6XX XXX XXX"
            />
            <p className="mt-1 text-xs text-dark/40">Format : 237 suivi du numéro sans 0 initial. Ex : 237693407964</p>
          </div>
          <div>
            <label className="label text-xs">Nom du titulaire du compte OM</label>
            <input
              type="text"
              value={settings.orange_money_holder}
              onChange={(e) => set('orange_money_holder', e.target.value)}
              className="input-field text-sm"
              placeholder="Ex : Jean DUPONT"
            />
          </div>
          {testOmUrl && (
            <a
              href={testOmUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200 rounded-xl hover:bg-orange-100 transition-colors"
            >
              <ExternalLink size={12} /> Tester le numéro via WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* Section Références bancaires */}
      <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-beige-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <Building2 size={18} className="text-blue-500" />
          </div>
          <div>
            <h2 className="font-semibold text-dark text-sm">Références bancaires</h2>
            <p className="text-xs text-dark/40">Pour les virements et reversements (optionnel)</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label text-xs">Banque</label>
            <select
              value={settings.bank_name}
              onChange={(e) => set('bank_name', e.target.value)}
              className="input-field text-sm"
            >
              <option value="">Sélectionner une banque</option>
              {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label text-xs">Numéro de compte</label>
              <input
                type="text"
                value={settings.bank_account}
                onChange={(e) => set('bank_account', e.target.value)}
                className="input-field text-sm font-mono"
                placeholder="XXXXXXXXXXXXXXXXXX"
              />
            </div>
            <div>
              <label className="label text-xs">Code SWIFT/BIC (optionnel)</label>
              <input
                type="text"
                value={settings.bank_swift}
                onChange={(e) => set('bank_swift', e.target.value.toUpperCase())}
                className="input-field text-sm font-mono uppercase"
                placeholder="XXXXXXXX"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label text-xs">Titulaire du compte</label>
              <input
                type="text"
                value={settings.bank_holder}
                onChange={(e) => set('bank_holder', e.target.value)}
                className="input-field text-sm"
                placeholder="Nom complet"
              />
            </div>
            <div>
              <label className="label text-xs">Agence (optionnel)</label>
              <input
                type="text"
                value={settings.bank_branch}
                onChange={(e) => set('bank_branch', e.target.value)}
                className="input-field text-sm"
                placeholder="Ex : Agence Douala Akwa"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section MTN MoMo */}
      <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-beige-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-yellow-50 flex items-center justify-center">
            <Smartphone size={18} className="text-yellow-600" />
          </div>
          <div>
            <h2 className="font-semibold text-dark text-sm">MTN Mobile Money (optionnel)</h2>
            <p className="text-xs text-dark/40">Alternative à Orange Money</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label text-xs">Numéro MTN MoMo</label>
              <input
                type="tel"
                value={settings.mtn_momo_number}
                onChange={(e) => set('mtn_momo_number', e.target.value)}
                className="input-field text-sm"
                placeholder="+237 6XX XXX XXX"
              />
            </div>
            <div>
              <label className="label text-xs">Nom du titulaire</label>
              <input
                type="text"
                value={settings.mtn_momo_holder}
                onChange={(e) => set('mtn_momo_holder', e.target.value)}
                className="input-field text-sm"
                placeholder="Ex : Jean DUPONT"
              />
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-dark text-white rounded-2xl font-semibold hover:bg-dark/80 transition-colors disabled:opacity-50"
      >
        {saving ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            Sauvegarde en cours...
          </span>
        ) : 'Sauvegarder mes paramètres de paiement'}
      </button>
    </div>
  )
}
