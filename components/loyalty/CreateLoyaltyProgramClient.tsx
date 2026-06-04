'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createLoyaltyProgram } from '@/actions/loyalty'
import { NIVEAUX_DEFAUT } from '@/lib/loyalty-logic'
import type { PrescripteurPartenaire } from '@/actions/codes-sessions'

interface Props {
  partenaires: PrescripteurPartenaire[]
}

export default function CreateLoyaltyProgramClient({ partenaires }: Props) {
  const partenairesActifs = partenaires.filter((p) => p.statut === 'actif')
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    partenaire_id: '',
    nom: '',
    description: '',
    prix_fcfa: 25000,
    prix_eur: 38.28,
    duree_validite_mois: 12,
    commission_lui_percent: 35,
    commission_partner_percent: 65,
    niveaux: NIVEAUX_DEFAUT.map((n) => ({
      nom: n.nom,
      couleur: n.couleur,
      emoji: n.emoji,
      seuil_points: n.seuil_points,
      avantages: n.avantages,
    })),
  })

  const setCommissionLui = (v: number) =>
    setForm((f) => ({ ...f, commission_lui_percent: v, commission_partner_percent: 100 - v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await createLoyaltyProgram(form)
      if (result.success) {
        router.push('/admin/loyalty-programs')
      } else {
        setError(result.error ?? 'Erreur lors de la création')
      }
    } catch {
      setError('Erreur serveur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="text-[#F5F0E8]/40 hover:text-[#F5F0E8] text-sm"
          >
            ← Retour
          </button>
          <h1 className="text-3xl font-serif text-[#C9A84C]">
            Créer un programme de fidélité
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#1A1A1A] border border-[#C9A84C]/20 rounded-xl p-6 space-y-6">

          {/* Partenaire */}
          <div>
            <label className="block text-[#F5F0E8] text-sm mb-1.5">Partenaire *</label>
            <select
              value={form.partenaire_id}
              onChange={(e) => setForm({ ...form, partenaire_id: e.target.value })}
              className="w-full bg-[#0A0A0A] border border-[#C9A84C]/30 text-[#F5F0E8] px-3 py-2.5 rounded-lg"
              required
            >
              <option value="">— Sélectionnez un partenaire ({partenairesActifs.length} actifs) —</option>
              {partenairesActifs.map((p) => (
                <option key={p.uid} value={p.uid}>{p.nom_etablissement}</option>
              ))}
            </select>
          </div>

          {/* Nom */}
          <div>
            <label className="block text-[#F5F0E8] text-sm mb-1.5">Nom du programme *</label>
            <input
              type="text"
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              placeholder="NaNa Beach Loyalty Card"
              className="w-full bg-[#0A0A0A] border border-[#C9A84C]/30 text-[#F5F0E8] px-3 py-2.5 rounded-lg placeholder-[#F5F0E8]/30"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[#F5F0E8] text-sm mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Gagnez des points à chaque repas..."
              className="w-full bg-[#0A0A0A] border border-[#C9A84C]/30 text-[#F5F0E8] px-3 py-2.5 rounded-lg placeholder-[#F5F0E8]/30"
              rows={3}
            />
          </div>

          {/* Tarification */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#F5F0E8] text-sm mb-1.5">Prix FCFA *</label>
              <input
                type="number"
                value={form.prix_fcfa}
                onChange={(e) => setForm({ ...form, prix_fcfa: Number(e.target.value) })}
                className="w-full bg-[#0A0A0A] border border-[#C9A84C]/30 text-[#F5F0E8] px-3 py-2.5 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-[#F5F0E8] text-sm mb-1.5">Prix EUR</label>
              <input
                type="number"
                value={form.prix_eur}
                onChange={(e) => setForm({ ...form, prix_eur: Number(e.target.value) })}
                step="0.01"
                className="w-full bg-[#0A0A0A] border border-[#C9A84C]/30 text-[#F5F0E8] px-3 py-2.5 rounded-lg"
              />
            </div>
          </div>

          {/* Durée */}
          <div>
            <label className="block text-[#F5F0E8] text-sm mb-1.5">Durée de validité (mois) *</label>
            <input
              type="number"
              value={form.duree_validite_mois}
              onChange={(e) => setForm({ ...form, duree_validite_mois: Number(e.target.value) })}
              min="1"
              max="120"
              className="w-full bg-[#0A0A0A] border border-[#C9A84C]/30 text-[#F5F0E8] px-3 py-2.5 rounded-lg"
              required
            />
          </div>

          {/* Commission */}
          <div className="border-t border-[#C9A84C]/20 pt-5">
            <h3 className="text-[#C9A84C] font-semibold mb-3">Partage des revenus</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[#F5F0E8]/70 text-xs mb-1.5">L&amp;Lui %</label>
                <input
                  type="number"
                  value={form.commission_lui_percent}
                  onChange={(e) => setCommissionLui(Number(e.target.value))}
                  min="0"
                  max="100"
                  className="w-full bg-[#0A0A0A] border border-[#C9A84C]/30 text-[#F5F0E8] px-3 py-2.5 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[#F5F0E8]/70 text-xs mb-1.5">Partenaire %</label>
                <input
                  type="number"
                  value={form.commission_partner_percent}
                  readOnly
                  className="w-full bg-[#0A0A0A] border border-[#C9A84C]/30 text-[#F5F0E8]/60 px-3 py-2.5 rounded-lg"
                />
              </div>
            </div>
            <p className="text-[#F5F0E8]/40 text-xs mt-2">
              Total : {form.commission_lui_percent + form.commission_partner_percent}%
              {form.commission_lui_percent + form.commission_partner_percent !== 100 && (
                <span className="text-red-400 ml-2">⚠ Doit être 100%</span>
              )}
            </p>
          </div>

          {/* Niveaux */}
          <div className="border-t border-[#C9A84C]/20 pt-5">
            <h3 className="text-[#C9A84C] font-semibold mb-3">Niveaux de fidélité</h3>
            <div className="space-y-3">
              {form.niveaux.map((n, i) => (
                <div key={i} className="bg-[#0A0A0A] border border-[#C9A84C]/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{n.emoji}</span>
                    <span
                      className="font-semibold text-sm"
                      style={{ color: n.couleur }}
                    >
                      {n.nom}
                    </span>
                    <span className="text-[#F5F0E8]/40 text-xs ml-auto">
                      Seuil : {n.seuil_points} pts
                    </span>
                  </div>
                  <div className="space-y-1">
                    {n.avantages.map((a, j) => (
                      <p key={j} className="text-[#F5F0E8]/60 text-xs">• {a}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-500 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || form.commission_lui_percent + form.commission_partner_percent !== 100}
            className="w-full bg-[#C9A84C] hover:bg-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-lg transition"
          >
            {loading ? 'Création en cours...' : 'CRÉER LE PROGRAMME'}
          </button>
        </form>
      </div>
    </div>
  )
}
