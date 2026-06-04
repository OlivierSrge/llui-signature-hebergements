'use client'

import { useState } from 'react'
import type { LoyaltyProgram } from '@/types/loyalty'
import { updateLoyaltyProgram } from '@/actions/loyalty'

interface Props {
  program: LoyaltyProgram
}

const AVANTAGES_PREDEFINIS = [
  'Café gratuit',
  '5% de réduction',
  '10% de réduction',
  '20% de réduction',
  'Dessert offert',
  'Repas offert',
  'Accès prioritaire',
  'Nuit offerte (7 achetées)',
]

export default function AvantagesConfigurator({ program }: Props) {
  // Avantages communs à tous les niveaux (affichés sur le niveau 0 comme référence)
  const [avantages, setAvantages] = useState<string[]>(
    program.niveaux[0]?.avantages ?? []
  )
  const [newAvantage, setNewAvantage] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const add = (av: string) => {
    if (av.trim() && !avantages.includes(av.trim())) {
      setAvantages((prev) => [...prev, av.trim()])
    }
  }

  const remove = (av: string) => {
    setAvantages((prev) => prev.filter((a) => a !== av))
  }

  const handleAddCustom = () => {
    add(newAvantage)
    setNewAvantage('')
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    // Applique la même liste d'avantages à tous les niveaux
    const niveauxUpdated = program.niveaux.map((n) => ({ ...n, avantages }))
    const result = await updateLoyaltyProgram(program.program_id, {
      niveaux: niveauxUpdated,
    })
    setMessage(result.success ? '✅ Avantages sauvegardés' : `❌ ${result.error}`)
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

      {/* Avantages actuels */}
      <div>
        <h3 className="text-[#C9A84C] font-semibold text-sm mb-3">Avantages actuels</h3>
        {avantages.length === 0 ? (
          <p className="text-[#F5F0E8]/40 text-sm italic">Aucun avantage configuré.</p>
        ) : (
          <div className="space-y-2">
            {avantages.map((av) => (
              <div
                key={av}
                className="flex items-center justify-between bg-[#0A0A0A] border border-[#C9A84C]/10 rounded-lg px-4 py-2.5"
              >
                <span className="text-[#F5F0E8] text-sm">• {av}</span>
                <button
                  onClick={() => remove(av)}
                  className="text-red-400/60 hover:text-red-400 text-xs ml-4"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Avantages prédéfinis */}
      <div>
        <h3 className="text-[#C9A84C] font-semibold text-sm mb-3">Ajouter prédéfini</h3>
        <div className="grid grid-cols-2 gap-2">
          {AVANTAGES_PREDEFINIS.map((av) => (
            <button
              key={av}
              onClick={() => add(av)}
              disabled={avantages.includes(av)}
              className="bg-[#0A0A0A] hover:bg-[#1A1A1A] disabled:opacity-40 border border-[#C9A84C]/20 text-[#F5F0E8]/80 text-xs px-3 py-2 rounded-lg text-left transition"
            >
              + {av}
            </button>
          ))}
        </div>
      </div>

      {/* Avantage custom */}
      <div className="border-t border-[#C9A84C]/10 pt-5">
        <h3 className="text-[#C9A84C] font-semibold text-sm mb-3">Avantage personnalisé</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newAvantage}
            onChange={(e) => setNewAvantage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
            placeholder="Ex : Accès piscine gratuit"
            className="flex-1 bg-[#0A0A0A] border border-[#C9A84C]/30 text-[#F5F0E8] px-3 py-2 rounded-lg text-sm placeholder-[#F5F0E8]/30"
          />
          <button
            onClick={handleAddCustom}
            className="bg-[#C9A84C] hover:bg-[#D4AF37] text-black font-semibold px-4 py-2 rounded-lg text-sm transition"
          >
            + Ajouter
          </button>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-[#C9A84C] hover:bg-[#D4AF37] disabled:opacity-50 text-black font-semibold py-3 rounded-lg transition"
      >
        {saving ? 'Sauvegarde...' : '💾 SAUVEGARDER AVANTAGES'}
      </button>
    </div>
  )
}
