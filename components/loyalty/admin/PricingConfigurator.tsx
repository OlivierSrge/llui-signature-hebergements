'use client'

import { useState } from 'react'
import type { LoyaltyProgram } from '@/types/loyalty'
import { updateLoyaltyProgram } from '@/actions/loyalty'

interface Props {
  program: LoyaltyProgram
}

export default function PricingConfigurator({ program }: Props) {
  const [prixFcfa, setPrixFcfa] = useState(program.prix_fcfa)
  const [prixEur, setPrixEur] = useState(program.prix_eur ?? 0)
  const [duree, setDuree] = useState(program.duree_validite_mois)
  const [commissionLui, setCommissionLui] = useState(program.commission_lui_percent)
  const [tauxFcfaParPoint, setTauxFcfaParPoint] = useState(program.taux_fcfa_par_point ?? 10000)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    const result = await updateLoyaltyProgram(program.program_id, {
      prix_fcfa: prixFcfa,
      prix_eur: prixEur,
      duree_validite_mois: duree,
      commission_lui_percent: commissionLui,
      commission_partner_percent: 100 - commissionLui,
      taux_fcfa_par_point: tauxFcfaParPoint,
    })
    setMessage(result.success ? '✅ Tarification mise à jour' : `❌ ${result.error}`)
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`px-4 py-3 rounded-lg text-sm ${
            message.startsWith('✅')
              ? 'bg-green-900/30 text-green-400'
              : 'bg-red-900/30 text-red-400'
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[#F5F0E8] text-sm mb-1.5">Prix FCFA *</label>
          <input
            type="number"
            value={prixFcfa}
            onChange={(e) => setPrixFcfa(Number(e.target.value))}
            className="w-full bg-[#0A0A0A] border border-[#C9A84C]/30 text-[#F5F0E8] px-3 py-2.5 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-[#F5F0E8] text-sm mb-1.5">Prix EUR</label>
          <input
            type="number"
            step="0.01"
            value={prixEur}
            onChange={(e) => setPrixEur(Number(e.target.value))}
            className="w-full bg-[#0A0A0A] border border-[#C9A84C]/30 text-[#F5F0E8] px-3 py-2.5 rounded-lg"
          />
        </div>
      </div>

      <div>
        <label className="block text-[#F5F0E8] text-sm mb-1.5">
          Durée de validité (mois) *
        </label>
        <input
          type="number"
          min="1"
          max="120"
          value={duree}
          onChange={(e) => setDuree(Number(e.target.value))}
          className="w-full bg-[#0A0A0A] border border-[#C9A84C]/30 text-[#F5F0E8] px-3 py-2.5 rounded-lg"
        />
      </div>

      <div>
        <label className="block text-[#F5F0E8] text-sm mb-1.5">
          Conversion points — 1 point = <span className="text-[#C9A84C] font-bold">{tauxFcfaParPoint.toLocaleString('fr-FR')} FCFA</span>
        </label>
        <input
          type="number"
          min="500"
          step="500"
          value={tauxFcfaParPoint}
          onChange={(e) => setTauxFcfaParPoint(Number(e.target.value))}
          className="w-full bg-[#0A0A0A] border border-[#C9A84C]/30 text-[#F5F0E8] px-3 py-2.5 rounded-lg"
        />
        <p className="text-[#F5F0E8]/30 text-xs mt-1">
          Exemple : 10 000 → 1 point par 10 000 FCFA dépensés · 5 000 → 2 points par 10 000 FCFA
        </p>
        {/* Preview exemples */}
        <div className="mt-2 bg-[#0A0A0A] border border-[#C9A84C]/10 rounded-lg px-3 py-2 text-xs text-[#F5F0E8]/50 space-y-0.5">
          {[10000, 25000, 50000, 100000].map((m) => (
            <p key={m}>
              {m.toLocaleString('fr-FR')} FCFA →{' '}
              <span className="text-[#C9A84C] font-semibold">
                {Math.floor(m / tauxFcfaParPoint)} pt{Math.floor(m / tauxFcfaParPoint) > 1 ? 's' : ''}
              </span>
            </p>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[#F5F0E8] text-sm mb-2">
          Partage des revenus — L&amp;Lui : <span className="text-[#C9A84C] font-bold">{commissionLui}%</span> / Partenaire :{' '}
          <span className="text-[#C9A84C] font-bold">{100 - commissionLui}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={commissionLui}
          onChange={(e) => setCommissionLui(Number(e.target.value))}
          className="w-full accent-[#C9A84C]"
        />
        <div className="flex justify-between text-xs text-[#F5F0E8]/40 mt-1">
          <span>L&amp;Lui 0%</span>
          <span>50/50</span>
          <span>L&amp;Lui 100%</span>
        </div>
      </div>

      <div className="bg-[#0A0A0A] border border-[#C9A84C]/10 rounded-lg p-4 text-sm text-[#F5F0E8]/60 space-y-1">
        <p>
          Par carte vendue à <strong className="text-[#F5F0E8]">{prixFcfa.toLocaleString('fr-FR')} FCFA</strong> :
        </p>
        <p>
          L&amp;Lui encaisse{' '}
          <span className="text-[#C9A84C] font-semibold">
            {Math.round(prixFcfa * commissionLui / 100).toLocaleString('fr-FR')} FCFA
          </span>
        </p>
        <p>
          Partenaire reçoit{' '}
          <span className="text-[#C9A84C] font-semibold">
            {Math.round(prixFcfa * (100 - commissionLui) / 100).toLocaleString('fr-FR')} FCFA
          </span>
        </p>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-[#C9A84C] hover:bg-[#D4AF37] disabled:opacity-50 text-black font-semibold py-3 rounded-lg transition"
      >
        {saving ? 'Sauvegarde...' : '💾 SAUVEGARDER TARIFICATION'}
      </button>
    </div>
  )
}
