'use client'

import { useState } from 'react'
import { saveLoyaltyConfig, saveLoyaltyLevelsConfig } from '@/actions/fidelite'
import type { LoyaltyConfig } from '@/lib/loyaltyDefaults'

interface AuditEntry {
  id: string
  section: string
  field: string
  old_value: string
  new_value: string
  admin_id: string
  created_at: string
}

interface LevelData {
  minStays: number
  maxStays: number | null
  discountAccommodation: number
  discountBoutique: number
  label: string
  emoji: string
  promoValidityDays: number
  upgradeMessage: string
}

interface LevelsConfig {
  novice: LevelData
  explorateur: LevelData
  ambassadeur: LevelData
  excellence: LevelData
}

interface Props {
  config: LoyaltyConfig
  levelsConfig: LevelsConfig
  auditLog: AuditEntry[]
}

const TABS = [
  { id: 'points', label: 'Règles de points' },
  { id: 'levels', label: 'Niveaux & remises' },
  { id: 'promo', label: 'Codes promo' },
  { id: 'audit', label: 'Journal des modifications' },
]

export default function FideliteParametresTabs({ config, levelsConfig, auditLog }: Props) {
  const [activeTab, setActiveTab] = useState('points')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // État local config points
  const [pointsForm, setPointsForm] = useState({
    pointsFirstBooking: config.pointsFirstBooking,
    pointsPerNight: config.pointsPerNight,
    pointsEarlyPayment: config.pointsEarlyPayment,
    pointsReferral: config.pointsReferral,
    pointsReview: config.pointsReview,
    pointsAnniversary: config.pointsAnniversary,
    pointsStayAnniversary: config.pointsStayAnniversary,
    pointsPerBoutiqueSpend: config.pointsPerBoutiqueSpend,
  })

  // État local config niveaux
  const [levelsForm, setLevelsForm] = useState<LevelsConfig>(levelsConfig)

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const handleSavePoints = async () => {
    setSaving(true)
    const res = await saveLoyaltyConfig(pointsForm)
    setSaving(false)
    showMessage(res.success ? 'success' : 'error', res.success ? 'Règles de points sauvegardées' : (res.error || 'Erreur'))
  }

  const handleSaveLevels = async () => {
    setSaving(true)
    const res = await saveLoyaltyLevelsConfig(levelsForm)
    setSaving(false)
    showMessage(res.success ? 'success' : 'error', res.success ? 'Niveaux sauvegardés' : (res.error || 'Erreur'))
  }

  const updateLevel = (niveau: keyof LevelsConfig, field: keyof LevelData, value: any) => {
    setLevelsForm((prev) => ({
      ...prev,
      [niveau]: { ...prev[niveau], [field]: value },
    }))
  }

  return (
    <div className="space-y-4">
      {/* Onglets */}
      <div className="flex gap-1 bg-beige-50 p-1 rounded-2xl border border-beige-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 text-sm px-3 py-2 rounded-xl font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-dark shadow-sm border border-beige-200'
                : 'text-dark/50 hover:text-dark/70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Message feedback */}
      {message && (
        <div className={`px-4 py-2 rounded-xl text-sm font-medium ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? '✅' : '❌'} {message.text}
        </div>
      )}

      {/* TAB 1 — Règles de points */}
      {activeTab === 'points' && (
        <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-5">
          <div>
            <h3 className="font-semibold text-dark mb-1">Règles d'attribution des points</h3>
            <p className="text-xs text-dark/40">Ces valeurs sont utilisées lors des actions clients (réservations, avis, parrainages…)</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              { key: 'pointsFirstBooking', label: 'Première réservation', desc: 'Points offerts lors du 1er séjour' },
              { key: 'pointsPerNight', label: 'Par nuit de séjour', desc: 'Points par nuitée confirmée' },
              { key: 'pointsEarlyPayment', label: 'Paiement anticipé', desc: 'Bonus si paiement avant 72h' },
              { key: 'pointsReferral', label: 'Parrainage', desc: 'Points par parrainage validé' },
              { key: 'pointsReview', label: 'Avis client', desc: 'Points pour avis déposé' },
              { key: 'pointsAnniversary', label: 'Anniversaire client', desc: 'Points offerts pour l\'anniversaire' },
              { key: 'pointsStayAnniversary', label: 'Anniversaire de séjour', desc: 'Points 1 an après le premier séjour' },
              { key: 'pointsPerBoutiqueSpend', label: 'Par € boutique', desc: 'Points par euro dépensé en boutique' },
            ] as { key: keyof typeof pointsForm; label: string; desc: string }[]).map(({ key, label, desc }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-dark mb-1">{label}</label>
                <p className="text-xs text-dark/40 mb-1.5">{desc}</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={pointsForm[key]}
                    onChange={(e) => setPointsForm((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                    className="w-28 px-3 py-2 text-sm border border-beige-200 rounded-xl focus:outline-none focus:border-gold-400 font-semibold text-dark"
                  />
                  <span className="text-sm text-dark/40">pts</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-beige-100">
            <button
              onClick={handleSavePoints}
              disabled={saving}
              className="px-5 py-2.5 bg-dark text-white text-sm font-medium rounded-xl hover:bg-dark/90 disabled:opacity-50"
            >
              {saving ? 'Sauvegarde...' : 'Sauvegarder les règles'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2 — Niveaux & remises */}
      {activeTab === 'levels' && (
        <div className="space-y-4">
          {(['novice', 'explorateur', 'ambassadeur', 'excellence'] as const).map((niveau) => {
            const lvl = levelsForm[niveau]
            return (
              <div key={niveau} className="bg-white rounded-2xl border border-beige-200 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{lvl.emoji}</span>
                  <h3 className="font-semibold text-dark">{lvl.label}</h3>
                  <span className="text-xs text-dark/40 ml-auto">
                    {lvl.minStays} séjours
                    {lvl.maxStays !== null ? ` → ${lvl.maxStays}` : '+'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-dark/50 mb-1">Remise hébergement</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number" min={0} max={100}
                        value={lvl.discountAccommodation}
                        onChange={(e) => updateLevel(niveau, 'discountAccommodation', Number(e.target.value))}
                        className="w-20 px-2 py-1.5 text-sm border border-beige-200 rounded-lg focus:outline-none focus:border-gold-400"
                      />
                      <span className="text-xs text-dark/40">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-dark/50 mb-1">Remise boutique</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number" min={0} max={100}
                        value={lvl.discountBoutique}
                        onChange={(e) => updateLevel(niveau, 'discountBoutique', Number(e.target.value))}
                        className="w-20 px-2 py-1.5 text-sm border border-beige-200 rounded-lg focus:outline-none focus:border-gold-400"
                      />
                      <span className="text-xs text-dark/40">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-dark/50 mb-1">Validité code (jours)</label>
                    <input
                      type="number" min={1}
                      value={lvl.promoValidityDays}
                      onChange={(e) => updateLevel(niveau, 'promoValidityDays', Number(e.target.value))}
                      className="w-20 px-2 py-1.5 text-sm border border-beige-200 rounded-lg focus:outline-none focus:border-gold-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-dark/50 mb-1">Message WhatsApp de montée de niveau</label>
                  <textarea
                    rows={4}
                    value={lvl.upgradeMessage}
                    onChange={(e) => updateLevel(niveau, 'upgradeMessage', e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-beige-200 rounded-xl focus:outline-none focus:border-gold-400 resize-none text-dark/80"
                  />
                  <p className="text-[10px] text-dark/30 mt-1">
                    Variables : {'{{NOM_CLIENT}}'} {'{{NIVEAU}}'} {'{{REDUCTION_HEBERGEMENT}}'} {'{{REDUCTION_BOUTIQUE}}'} {'{{CODE_PROMO}}'}
                  </p>
                </div>
              </div>
            )
          })}

          <div className="flex justify-end pt-1">
            <button
              onClick={handleSaveLevels}
              disabled={saving}
              className="px-5 py-2.5 bg-dark text-white text-sm font-medium rounded-xl hover:bg-dark/90 disabled:opacity-50"
            >
              {saving ? 'Sauvegarde...' : 'Sauvegarder les niveaux'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 3 — Codes promo */}
      {activeTab === 'promo' && (
        <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-5">
          <div>
            <h3 className="font-semibold text-dark mb-1">Configuration des codes promo boutique</h3>
            <p className="text-xs text-dark/40">
              Les codes sont générés automatiquement lors des montées de niveau.
              Format : <span className="font-mono">PREFIX + identifiant aléatoire</span>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(['novice', 'explorateur', 'ambassadeur', 'excellence'] as const).map((niveau) => {
              const lvl = levelsForm[niveau]
              return (
                <div key={niveau} className="border border-beige-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span>{lvl.emoji}</span>
                    <span className="text-sm font-medium text-dark">{lvl.label}</span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-dark/50 mb-1">Validité des codes (jours)</label>
                      <input
                        type="number" min={1}
                        value={lvl.promoValidityDays}
                        onChange={(e) => updateLevel(niveau, 'promoValidityDays', Number(e.target.value))}
                        className="w-24 px-2 py-1.5 text-sm border border-beige-200 rounded-lg focus:outline-none focus:border-gold-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-dark/50 mb-1">Remise boutique appliquée</label>
                      <p className="text-sm font-semibold text-gold-600">{lvl.discountBoutique}%</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="bg-beige-50 rounded-xl p-4 text-xs text-dark/50 space-y-1">
            <p className="font-medium text-dark/70">Fonctionnement</p>
            <p>• Un code est généré lors de chaque montée de niveau</p>
            <p>• Le code peut être envoyé manuellement par WhatsApp depuis la fiche client</p>
            <p>• L'expiration peut être prolongée depuis la fiche client</p>
            <p>• Les codes expirés non utilisés apparaissent dans le panneau des actions requises</p>
          </div>

          <div className="pt-2 border-t border-beige-100">
            <button
              onClick={handleSaveLevels}
              disabled={saving}
              className="px-5 py-2.5 bg-dark text-white text-sm font-medium rounded-xl hover:bg-dark/90 disabled:opacity-50"
            >
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 4 — Journal d'audit */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-beige-100">
            <h3 className="text-sm font-medium text-dark">Journal des modifications (50 dernières)</h3>
          </div>
          {auditLog.length === 0 ? (
            <p className="text-sm text-dark/40 px-5 py-8 text-center">Aucune modification enregistrée</p>
          ) : (
            <div className="divide-y divide-beige-50">
              {auditLog.map((entry) => (
                <div key={entry.id} className="px-5 py-3 flex items-start gap-4 text-sm">
                  <div className="text-xs text-dark/30 font-mono whitespace-nowrap pt-0.5">
                    {new Date(entry.created_at).toLocaleString('fr-FR', {
                      day: '2-digit', month: '2-digit', year: '2-digit',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-beige-100 text-dark/50 text-xs rounded font-mono">{entry.section}</span>
                      <span className="text-dark/70 text-xs">{entry.field}</span>
                    </div>
                    {(entry.old_value || entry.new_value) && (
                      <div className="flex items-center gap-2 mt-1 text-xs">
                        {entry.old_value && (
                          <span className="text-red-500 line-through truncate max-w-40">{entry.old_value}</span>
                        )}
                        {entry.old_value && entry.new_value && <span className="text-dark/30">→</span>}
                        {entry.new_value && (
                          <span className="text-green-600 truncate max-w-40">{entry.new_value}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-dark/30">{entry.admin_id}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
