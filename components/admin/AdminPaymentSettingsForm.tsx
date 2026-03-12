'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { Smartphone, Building2, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react'
import { adminSavePaymentSettings } from '@/actions/payment-settings'
import { type PaymentSettings, EMPTY_PAYMENT_SETTINGS } from '@/lib/payment-settings'

interface Props {
  partnerId: string
  initialSettings: PaymentSettings | null
}

const BANKS = ['Afriland First Bank', 'UBA', 'BICEC', 'SCB', 'Ecobank', 'CCA Bank', 'BGFI Bank', 'Société Générale', 'Autre']

export default function AdminPaymentSettingsForm({ partnerId, initialSettings }: Props) {
  const [settings, setSettings] = useState<PaymentSettings>(initialSettings ?? EMPTY_PAYMENT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)

  const set = (key: keyof PaymentSettings, value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    const result = await adminSavePaymentSettings(partnerId, settings)
    setSaving(false)
    if (result.success) {
      toast.success('Paramètres sauvegardés')
      setEditing(false)
    } else {
      toast.error(result.error || 'Erreur lors de la sauvegarde')
    }
  }

  const omConfigured = !!settings.orange_money_number.trim()

  const testOmUrl = omConfigured
    ? `https://wa.me/${settings.orange_money_number.replace(/\D/g, '')}?text=${encodeURIComponent('Test numéro Orange Money — L&Lui Signature (admin)')}`
    : null

  if (!editing) {
    return (
      <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-beige-100 flex items-center justify-between">
          <h2 className="font-semibold text-dark text-sm flex items-center gap-2">
            <Smartphone size={14} className="text-orange-500" /> Paramètres de paiement
          </h2>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-gold-600 hover:text-gold-700 font-medium border border-gold-200 px-3 py-1.5 rounded-xl hover:bg-gold-50 transition-colors"
          >
            Modifier
          </button>
        </div>
        <div className="p-5 space-y-4 text-sm">
          {/* Orange Money */}
          <div>
            <p className="text-xs text-dark/50 font-medium mb-1 flex items-center gap-1">
              <Smartphone size={11} className="text-orange-400" /> Orange Money
            </p>
            {omConfigured ? (
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium text-dark">{settings.orange_money_number}</span>
                {settings.orange_money_holder && <span className="text-dark/50">({settings.orange_money_holder})</span>}
                <span className="flex items-center gap-0.5 text-xs text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full">
                  <CheckCircle size={10} /> Configuré
                </span>
              </div>
            ) : (
              <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg w-fit">
                <AlertTriangle size={11} /> Non configuré — fallback 693407964
              </span>
            )}
          </div>

          {/* Banque */}
          {settings.bank_name && (
            <div>
              <p className="text-xs text-dark/50 font-medium mb-1 flex items-center gap-1">
                <Building2 size={11} className="text-blue-400" /> Banque
              </p>
              <p className="text-dark">{settings.bank_name}</p>
              {settings.bank_account && <p className="text-xs font-mono text-dark/60 mt-0.5">{settings.bank_account}{settings.bank_swift ? ` · ${settings.bank_swift}` : ''}</p>}
              {settings.bank_holder && <p className="text-xs text-dark/50">{settings.bank_holder}{settings.bank_branch ? ` — ${settings.bank_branch}` : ''}</p>}
            </div>
          )}

          {/* MTN */}
          {settings.mtn_momo_number && (
            <div>
              <p className="text-xs text-dark/50 font-medium mb-1 flex items-center gap-1">
                <Smartphone size={11} className="text-yellow-500" /> MTN MoMo
              </p>
              <p className="font-mono text-dark">{settings.mtn_momo_number}</p>
              {settings.mtn_momo_holder && <p className="text-xs text-dark/50">{settings.mtn_momo_holder}</p>}
            </div>
          )}

          {!omConfigured && !settings.bank_name && !settings.mtn_momo_number && (
            <p className="text-dark/40 text-xs italic">Aucun paramètre de paiement configuré par ce partenaire.</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-dark text-sm">Modifier les paramètres de paiement</h2>
        <button onClick={() => setEditing(false)} className="text-xs text-dark/40 hover:text-dark">Annuler</button>
      </div>

      {/* Orange Money */}
      <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-beige-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center">
            <Smartphone size={16} className="text-orange-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-dark text-sm">Orange Money</h3>
            <p className="text-xs text-dark/40">Numéro de réception des paiements</p>
          </div>
          {omConfigured ? (
            <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full">
              <CheckCircle size={10} /> Configuré
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
              <AlertTriangle size={10} /> Manquant
            </span>
          )}
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label text-xs">Numéro Orange Money</label>
            <input
              type="tel"
              value={settings.orange_money_number}
              onChange={(e) => set('orange_money_number', e.target.value)}
              className="input-field text-sm"
              placeholder="+237 6XX XXX XXX"
            />
          </div>
          <div>
            <label className="label text-xs">Titulaire</label>
            <input
              type="text"
              value={settings.orange_money_holder}
              onChange={(e) => set('orange_money_holder', e.target.value)}
              className="input-field text-sm"
              placeholder="Ex : Jean DUPONT"
            />
          </div>
          {testOmUrl && (
            <a href={testOmUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200 rounded-xl hover:bg-orange-100 transition-colors">
              <ExternalLink size={12} /> Tester via WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* Banque */}
      <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-beige-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
            <Building2 size={16} className="text-blue-500" />
          </div>
          <h3 className="font-semibold text-dark text-sm">Références bancaires</h3>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label text-xs">Banque</label>
            <select value={settings.bank_name} onChange={(e) => set('bank_name', e.target.value)} className="input-field text-sm">
              <option value="">Sélectionner une banque</option>
              {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Numéro de compte</label>
              <input type="text" value={settings.bank_account} onChange={(e) => set('bank_account', e.target.value)} className="input-field text-sm font-mono" placeholder="XXXXXXXXXXXXXXXXXX" />
            </div>
            <div>
              <label className="label text-xs">Code SWIFT/BIC</label>
              <input type="text" value={settings.bank_swift} onChange={(e) => set('bank_swift', e.target.value.toUpperCase())} className="input-field text-sm font-mono uppercase" placeholder="XXXXXXXX" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Titulaire</label>
              <input type="text" value={settings.bank_holder} onChange={(e) => set('bank_holder', e.target.value)} className="input-field text-sm" placeholder="Nom complet" />
            </div>
            <div>
              <label className="label text-xs">Agence</label>
              <input type="text" value={settings.bank_branch} onChange={(e) => set('bank_branch', e.target.value)} className="input-field text-sm" placeholder="Ex : Douala Akwa" />
            </div>
          </div>
        </div>
      </div>

      {/* MTN */}
      <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-beige-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-yellow-50 flex items-center justify-center">
            <Smartphone size={16} className="text-yellow-600" />
          </div>
          <h3 className="font-semibold text-dark text-sm">MTN Mobile Money (optionnel)</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Numéro MTN MoMo</label>
              <input type="tel" value={settings.mtn_momo_number} onChange={(e) => set('mtn_momo_number', e.target.value)} className="input-field text-sm" placeholder="+237 6XX XXX XXX" />
            </div>
            <div>
              <label className="label text-xs">Titulaire</label>
              <input type="text" value={settings.mtn_momo_holder} onChange={(e) => set('mtn_momo_holder', e.target.value)} className="input-field text-sm" placeholder="Ex : Jean DUPONT" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={() => setEditing(false)} className="flex-1 py-3 px-4 border border-beige-300 text-dark/60 rounded-2xl text-sm font-medium hover:bg-beige-50 transition-colors">
          Annuler
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-3 px-4 bg-dark text-white rounded-2xl text-sm font-semibold hover:bg-dark/80 transition-colors disabled:opacity-50"
        >
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  )
}
