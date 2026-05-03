'use client'

import { useState } from 'react'
import { type AllianceCardTier, TIER_CONFIGS } from '@/types/alliance-privee'
import { soumettreCandidat } from '@/actions/alliance-privee'

interface Props {
  partenaireId: string
  tier: AllianceCardTier
  nomEtablissement: string
}

const VALEURS_OPTIONS = [
  'Famille', 'Loyauté', 'Ambition', 'Discrétion', 'Voyages', 'Culture',
  'Spiritualité', 'Santé', 'Créativité', 'Indépendance', 'Générosité', 'Stabilité',
]

const LOISIRS_OPTIONS = [
  'Voyages', 'Gastronomie', 'Sport', 'Musique', 'Lecture', 'Cinéma',
  'Art', 'Danse', 'Nature', 'Photographie', 'Cuisine', 'Mode',
]

export default function AllianceCandidatureClient({ partenaireId, tier, nomEtablissement }: Props) {
  const config = TIER_CONFIGS[tier]
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    prenom: '',
    age: '',
    ville: '',
    profession: '',
    bio: '',
    genre: '' as 'homme' | 'femme' | 'autre' | '',
    genre_recherche: '' as 'homme' | 'femme' | 'les deux' | '',
    recherche: '',
    valeurs: [] as string[],
    loisirs: [] as string[],
    telephone: '',
    email: '',
  })

  function toggleItem(field: 'valeurs' | 'loisirs', value: string) {
    setForm((prev) => {
      const arr = prev[field]
      return {
        ...prev,
        [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      }
    })
  }

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    setError('')
    if (!form.prenom || !form.age || !form.ville || !form.profession || !form.bio || !form.genre || !form.genre_recherche || !form.recherche || !form.telephone) {
      setError('Veuillez remplir tous les champs obligatoires.')
      return
    }
    setLoading(true)
    try {
      const res = await soumettreCandidat({
        partenaire_id: partenaireId,
        tier_souhaite: tier,
        prenom: form.prenom,
        age: parseInt(form.age, 10),
        ville: form.ville,
        profession: form.profession,
        bio: form.bio,
        valeurs: form.valeurs,
        loisirs: form.loisirs,
        recherche: form.recherche,
        genre: form.genre as 'homme' | 'femme' | 'autre',
        genre_recherche: form.genre_recherche as 'homme' | 'femme' | 'les deux',
        telephone: form.telephone,
        email: form.email || undefined,
      })
      if (res.success) {
        setSubmitted(true)
      } else {
        setError(res.error ?? 'Une erreur est survenue.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-5">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto mb-6">
            <span className="text-amber-400 text-2xl">✦</span>
          </div>
          <h2 className="text-2xl font-serif font-light text-white mb-3">
            Candidature reçue
          </h2>
          <p className="text-white/50 text-sm leading-relaxed mb-4">
            Votre portrait sera examiné par notre équipe dans les 48 heures suivantes. Vous serez contacté(e) par WhatsApp.
          </p>
          <p className="text-white/20 text-xs">
            Discrétion absolue — Alliance Privée {nomEtablissement}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-lg mx-auto px-5 py-12">
        {/* En-tête */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs tracking-widest uppercase mb-5">
            <span>{config.emoji}</span>
            <span>Carte {config.label}</span>
          </div>
          <h1 className="text-2xl font-serif font-light text-white mb-2">Votre Portrait</h1>
          <p className="text-white/40 text-sm">Étape 2 sur 2 — Candidature</p>
        </div>

        {/* Indicateur étapes */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-0.5 rounded-full transition-colors ${s <= step ? 'bg-amber-500' : 'bg-white/10'}`}
            />
          ))}
        </div>

        {/* Step 1 — Identité */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white/50 text-xs mb-1.5">Prénom *</label>
                <input
                  type="text"
                  value={form.prenom}
                  onChange={(e) => update('prenom', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-amber-500/50"
                  placeholder="Votre prénom"
                />
              </div>
              <div>
                <label className="block text-white/50 text-xs mb-1.5">Âge *</label>
                <input
                  type="number"
                  value={form.age}
                  onChange={(e) => update('age', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-amber-500/50"
                  placeholder="30"
                  min="18"
                  max="99"
                />
              </div>
            </div>

            <div>
              <label className="block text-white/50 text-xs mb-1.5">Ville de résidence *</label>
              <input
                type="text"
                value={form.ville}
                onChange={(e) => update('ville', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-amber-500/50"
                placeholder="Ex : Kribi, Douala..."
              />
            </div>

            <div>
              <label className="block text-white/50 text-xs mb-1.5">Profession *</label>
              <input
                type="text"
                value={form.profession}
                onChange={(e) => update('profession', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-amber-500/50"
                placeholder="Ex : Entrepreneur, Médecin..."
              />
            </div>

            <div>
              <label className="block text-white/50 text-xs mb-1.5">Je suis *</label>
              <div className="grid grid-cols-3 gap-2">
                {(['homme', 'femme', 'autre'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => update('genre', g)}
                    className={`py-2.5 rounded-xl text-xs font-medium capitalize border transition-colors ${
                      form.genre === g
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-white/5 border-white/10 text-white/50 hover:border-white/20'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-white/50 text-xs mb-1.5">Je recherche *</label>
              <div className="grid grid-cols-3 gap-2">
                {(['homme', 'femme', 'les deux'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => update('genre_recherche', g)}
                    className={`py-2.5 rounded-xl text-xs font-medium capitalize border transition-colors ${
                      form.genre_recherche === g
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-white/5 border-white/10 text-white/50 hover:border-white/20'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!form.prenom || !form.age || !form.ville || !form.profession || !form.genre || !form.genre_recherche}
              className="w-full py-4 rounded-xl bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-2"
            >
              Continuer →
            </button>
          </div>
        )}

        {/* Step 2 — Portrait */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label className="block text-white/50 text-xs mb-1.5">Votre portrait en quelques mots *</label>
              <textarea
                value={form.bio}
                onChange={(e) => update('bio', e.target.value)}
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-amber-500/50 resize-none"
                placeholder="Décrivez-vous avec authenticité : votre caractère, votre mode de vie, vos aspirations..."
              />
            </div>

            <div>
              <label className="block text-white/50 text-xs mb-1.5">Ce que vous recherchez *</label>
              <textarea
                value={form.recherche}
                onChange={(e) => update('recherche', e.target.value)}
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-amber-500/50 resize-none"
                placeholder="Décrivez la relation, les qualités ou le profil que vous recherchez..."
              />
            </div>

            <div>
              <label className="block text-white/50 text-xs mb-2">Vos valeurs (sélectionnez jusqu&apos;à 5)</label>
              <div className="flex flex-wrap gap-2">
                {VALEURS_OPTIONS.map((v) => (
                  <button
                    key={v}
                    onClick={() => toggleItem('valeurs', v)}
                    disabled={!form.valeurs.includes(v) && form.valeurs.length >= 5}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      form.valeurs.includes(v)
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20 disabled:opacity-30'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-white/50 text-xs mb-2">Vos loisirs (sélectionnez jusqu&apos;à 5)</label>
              <div className="flex flex-wrap gap-2">
                {LOISIRS_OPTIONS.map((l) => (
                  <button
                    key={l}
                    onClick={() => toggleItem('loisirs', l)}
                    disabled={!form.loisirs.includes(l) && form.loisirs.length >= 5}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      form.loisirs.includes(l)
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20 disabled:opacity-30'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-4 rounded-xl border border-white/10 text-white/50 text-sm hover:border-white/20 hover:text-white/70 transition-colors"
              >
                ← Retour
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!form.bio || !form.recherche}
                className="flex-2 flex-1 py-4 rounded-xl bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continuer →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Contact */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-300/70 leading-relaxed">
              ✦ Vos coordonnées sont strictement confidentielles et ne seront jamais partagées avec d&apos;autres membres. Elles permettent uniquement à l&apos;équipe de vous contacter.
            </div>

            <div>
              <label className="block text-white/50 text-xs mb-1.5">Numéro WhatsApp *</label>
              <input
                type="tel"
                value={form.telephone}
                onChange={(e) => update('telephone', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-amber-500/50"
                placeholder="+237 6XX XXX XXX"
              />
            </div>

            <div>
              <label className="block text-white/50 text-xs mb-1.5">Email (optionnel)</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-amber-500/50"
                placeholder="votre@email.com"
              />
            </div>

            {error && (
              <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-4 rounded-xl border border-white/10 text-white/50 text-sm hover:border-white/20 hover:text-white/70 transition-colors"
              >
                ← Retour
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !form.telephone}
                className="flex-1 py-4 rounded-xl bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? 'Envoi...' : 'Soumettre ma candidature ✦'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
