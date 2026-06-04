'use client'

import { useState } from 'react'
import type { LoyaltyProgram, Niveau } from '@/types/loyalty'
import { updateLoyaltyProgram } from '@/actions/loyalty'

interface Props {
  program: LoyaltyProgram
}

export default function NiveauxConfigurator({ program }: Props) {
  const [niveaux, setNiveaux] = useState<Niveau[]>(
    program.niveaux.map((n) => ({ ...n }))
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const update = (idx: number, field: keyof Niveau, value: string | number) => {
    setNiveaux((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    const result = await updateLoyaltyProgram(program.program_id, { niveaux })
    setMessage(result.success ? '✅ Niveaux sauvegardés' : `❌ ${result.error}`)
    setSaving(false)
  }

  return (
    <div className="space-y-4">
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

      {niveaux.map((n, idx) => (
        <div
          key={idx}
          className="bg-[#0A0A0A] border border-[#C9A84C]/20 rounded-lg p-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">{n.emoji}</span>
            <span className="font-semibold text-sm" style={{ color: n.couleur }}>
              {n.nom}
            </span>
            <span className="ml-auto text-xs text-[#F5F0E8]/40">Niveau {idx + 1}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[#F5F0E8]/60 text-xs mb-1">ID</label>
              <input
                type="text"
                value={n.id}
                onChange={(e) => update(idx, 'id', e.target.value)}
                className="w-full bg-[#1A1A1A] border border-[#C9A84C]/20 text-[#F5F0E8] px-2 py-1.5 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-[#F5F0E8]/60 text-xs mb-1">Nom</label>
              <input
                type="text"
                value={n.nom}
                onChange={(e) => update(idx, 'nom', e.target.value)}
                className="w-full bg-[#1A1A1A] border border-[#C9A84C]/20 text-[#F5F0E8] px-2 py-1.5 rounded text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[#F5F0E8]/60 text-xs mb-1">Emoji</label>
              <input
                type="text"
                value={n.emoji}
                onChange={(e) => update(idx, 'emoji', e.target.value)}
                className="w-full bg-[#1A1A1A] border border-[#C9A84C]/20 text-[#F5F0E8] px-2 py-1.5 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-[#F5F0E8]/60 text-xs mb-1">Couleur (hex)</label>
              <input
                type="text"
                value={n.couleur}
                onChange={(e) => update(idx, 'couleur', e.target.value)}
                className="w-full bg-[#1A1A1A] border border-[#C9A84C]/20 text-[#F5F0E8] px-2 py-1.5 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-[#F5F0E8]/60 text-xs mb-1">Seuil pts</label>
              <input
                type="number"
                value={n.seuil_points}
                onChange={(e) => update(idx, 'seuil_points', Number(e.target.value))}
                className="w-full bg-[#1A1A1A] border border-[#C9A84C]/20 text-[#F5F0E8] px-2 py-1.5 rounded text-sm"
              />
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-[#C9A84C] hover:bg-[#D4AF37] disabled:opacity-50 text-black font-semibold py-3 rounded-lg transition"
      >
        {saving ? 'Sauvegarde...' : '💾 SAUVEGARDER NIVEAUX'}
      </button>
    </div>
  )
}
