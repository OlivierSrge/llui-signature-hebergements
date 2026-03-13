'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { Smartphone, Building2, ExternalLink, Globe, ToggleLeft, ToggleRight } from 'lucide-react'
import { saveAdminPaymentSettings } from '@/actions/payment-settings'
import type { AdminPaymentSettings } from '@/lib/payment-settings'

const BANKS = ['Afriland First Bank', 'UBA', 'BICEC', 'SCB', 'Ecobank', 'CCA Bank', 'BGFI Bank', 'Société Générale', 'Autre']

interface Props {
  initialSettings: AdminPaymentSettings
}

export default function AdminGlobalPaymentSettingsForm({ initialSettings }: Props) {
  const [s, setS] = useState<AdminPaymentSettings>(initialSettings)
  const [saving, setSaving] = useState(false)

  const set = (key: keyof AdminPaymentSettings, value: string | boolean) =>
    setS((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    const result = await saveAdminPaymentSettings(s)
    setSaving(false)
    if (result.success) toast.success('Paramètres sauvegardés')
    else toast.error(result.error || 'Erreur lors de la sauvegarde')
  }

  const testOmUrl = s.orange_money_number?.trim()
    ? `https://wa.me/${s.orange_money_number.replace(/\D/g, '')}?text=${encodeURIComponent('Test numéro Orange Money — L&Lui Signature')}`
    : null

  return (
    <div className="space-y-6">
      {/* Section Orange Money */}
      <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-beige-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
            <Smartphone size={18} className="text-orange-500" />
          </div>
          <div>
            <h2 className="font-semibold text-dark text-sm">Orange Money principal</h2>
            <p className="text-xs text-dark/40">Numéro par défaut si le partenaire n'en a pas configuré</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label text-xs">Numéro Orange Money par défaut</label>
            <input
              type="tel"
              value={s.orange_money_number}
              onChange={(e) => set('orange_money_number', e.target.value)}
              className="input-field text-sm"
              placeholder="693407964"
            />
          </div>
          <div>
            <label className="label text-xs">Nom du titulaire</label>
            <input
              type="text"
              value={s.orange_money_holder}
              onChange={(e) => set('orange_money_holder', e.target.value)}
              className="input-field text-sm"
              placeholder="L&Lui Signature"
            />
          </div>
          {testOmUrl && (
            <a
              href={testOmUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200 rounded-xl hover:bg-orange-100 transition-colors"
            >
              <ExternalLink size={12} /> Tester via WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* Section Revolut */}
      <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-beige-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
            <Globe size={18} className="text-purple-500" />
          </div>
          <div>
            <h2 className="font-semibold text-dark text-sm">Revolut</h2>
            <p className="text-xs text-dark/40">Paiement international par carte bancaire</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label text-xs">Lien Revolut</label>
            <input
              type="url"
              value={s.revolut_link}
              onChange={(e) => set('revolut_link', e.target.value)}
              className="input-field text-sm font-mono"
              placeholder="https://revolut.me/..."
            />
            <p className="mt-1 text-xs text-dark/40">Ce lien ne doit être modifié que depuis cette interface.</p>
          </div>
          <div>
            <label className="label text-xs">Nom affiché dans les messages</label>
            <input
              type="text"
              value={s.revolut_display_name}
              onChange={(e) => set('revolut_display_name', e.target.value)}
              className="input-field text-sm"
              placeholder="L&Lui Signature"
            />
          </div>
          <div>
            <label className="label text-xs">Message accompagnant le lien Revolut</label>
            <textarea
              value={s.revolut_message}
              onChange={(e) => set('revolut_message', e.target.value)}
              className="input-field text-sm min-h-[72px]"
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between px-4 py-3 bg-beige-50 rounded-xl border border-beige-200">
            <div>
              <p className="text-sm font-medium text-dark">Proposer Revolut par défaut</p>
              <p className="text-xs text-dark/40 mt-0.5">Revolut inclus automatiquement dans les demandes de paiement</p>
            </div>
            <button
              type="button"
              onClick={() => set('revolut_include_by_default', !s.revolut_include_by_default)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${s.revolut_include_by_default ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-100 border-gray-200 text-gray-500'}`}
            >
              {s.revolut_include_by_default
                ? <><ToggleRight size={14} /> Activé</>
                : <><ToggleLeft size={14} /> Désactivé</>}
            </button>
          </div>
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
            <p className="text-xs text-dark/40">Pour virements et reversements (optionnel)</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label text-xs">Banque</label>
            <select
              value={s.bank_name}
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
                value={s.bank_account}
                onChange={(e) => set('bank_account', e.target.value)}
                className="input-field text-sm font-mono"
                placeholder="XXXXXXXXXXXXXXXXXX"
              />
            </div>
            <div>
              <label className="label text-xs">Code SWIFT/BIC (optionnel)</label>
              <input
                type="text"
                value={s.bank_swift}
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
                value={s.bank_holder}
                onChange={(e) => set('bank_holder', e.target.value)}
                className="input-field text-sm"
                placeholder="Nom complet"
              />
            </div>
            <div>
              <label className="label text-xs">Agence (optionnel)</label>
              <input
                type="text"
                value={s.bank_branch}
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
                value={s.mtn_momo_number}
                onChange={(e) => set('mtn_momo_number', e.target.value)}
                className="input-field text-sm"
                placeholder="+237 6XX XXX XXX"
              />
            </div>
            <div>
              <label className="label text-xs">Nom du titulaire</label>
              <input
                type="text"
                value={s.mtn_momo_holder}
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
        ) : 'Sauvegarder les paramètres'}
      </button>
    </div>
  )
}
