'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { type AllianceCardTier, type GenderType, type LocationType, TIER_CONFIGS } from '@/types/alliance-privee'
import { soumettreCandidat } from '@/actions/alliance-privee'

interface Props {
  partenaireId: string
  tier: AllianceCardTier
  gender: GenderType
  location: LocationType
  paymentId: string
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

const PILIERS = [
  { key: 'vision_geo',   label: 'Vision géographique',   placeholder: 'Où souhaitez-vous construire votre vie ? Cameroun, diaspora, les deux ?' },
  { key: 'engagement',   label: 'Niveau d\'engagement',  placeholder: 'Cherchez-vous une relation sérieuse, un mariage, une complicité profonde ?' },
  { key: 'style_vie',    label: 'Style de vie',           placeholder: 'Comment décrieriez-vous votre quotidien, vos habitudes, votre rythme de vie ?' },
  { key: 'valeurs_text', label: 'Vos valeurs',            placeholder: 'Quelles valeurs sont non-négociables pour vous dans une relation ?' },
  { key: 'ambition',     label: 'Ambition personnelle',   placeholder: 'Où vous voyez-vous dans 5 ans ? Quels sont vos projets ?' },
]

export default function AllianceCandidatureClient({
  partenaireId, tier, gender, location, paymentId, nomEtablissement,
}: Props) {
  const router = useRouter()
  const config = TIER_CONFIGS[tier]
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    // Step 1
    prenom: '',
    age: '',
    email: '',
    telephone: '',
    ville: '',
    pays: '',
    profession: '',
    // Step 2 — Piliers
    vision_geo: '',
    engagement: '',
    style_vie: '',
    valeurs_text: '',
    ambition: '',
    // Step 3 — Portrait + charte
    bio: '',
    recherche: '',
    genre: (gender === 'HOMME' ? 'homme' : 'femme') as 'homme' | 'femme' | 'autre',
    genre_recherche: '' as 'homme' | 'femme' | 'les deux' | '',
    valeurs: [] as string[],
    loisirs: [] as string[],
    charte_acceptee: false,
  })

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function toggleItem(field: 'valeurs' | 'loisirs', value: string) {
    setForm((prev) => {
      const arr = prev[field]
      return { ...prev, [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] }
    })
  }

  const step1Valid = form.prenom && form.age && form.email && form.telephone && form.ville && form.profession
  const step2Valid = PILIERS.every((p) => (form as Record<string, string | boolean | string[]>)[p.key])
  const step3Valid = form.bio && form.recherche && form.genre_recherche && form.charte_acceptee

  async function handleSubmit() {
    setError('')
    if (!step3Valid) { setError('Acceptez la charte et remplissez tous les champs.'); return }
    setLoading(true)
    try {
      const bioComplet = `${form.bio}\n\n---\nVision géographique : ${form.vision_geo}\nEngagement : ${form.engagement}\nStyle de vie : ${form.style_vie}\nValeurs : ${form.valeurs_text}\nAmbition : ${form.ambition}`

      const res = await soumettreCandidat({
        partenaire_id: partenaireId,
        tier_souhaite: tier,
        gender: gender,
        location: location,
        payment_id: paymentId,
        payment_proof_verified: false,
        charte_acceptee: form.charte_acceptee,
        prenom: form.prenom,
        age: parseInt(form.age, 10),
        ville: `${form.ville}${form.pays ? ', ' + form.pays : ''}`,
        profession: form.profession,
        bio: bioComplet,
        valeurs: form.valeurs,
        loisirs: form.loisirs,
        recherche: form.recherche,
        genre: form.genre,
        genre_recherche: form.genre_recherche as 'homme' | 'femme' | 'les deux',
        telephone: form.telephone,
        email: form.email || undefined,
      })

      if (res.success && res.id) {
        router.push(`/alliance-privee/attente?application_id=${res.id}`)
      } else {
        setError(res.error ?? 'Une erreur est survenue.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-lg mx-auto px-5 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs tracking-widest uppercase mb-5">
            <span>{config.emoji}</span>
            <span>Carte {config.label}</span>
          </div>
          <h1 className="text-2xl font-serif font-light text-white mb-1">Votre Portrait de Cœur</h1>
          <p className="text-white/40 text-sm">Étape {step} sur 3</p>
        </div>

        {/* Barre de progression */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`flex-1 h-0.5 rounded-full transition-colors ${s <= step ? 'bg-amber-500' : 'bg-white/10'}`} />
          ))}
        </div>

        {/* ─── ÉTAPE 1 — Infos de base ─────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Prénom *" value={form.prenom} onChange={(v) => update('prenom', v)} placeholder="Votre prénom" />
              <Field label="Âge *" type="number" value={form.age} onChange={(v) => update('age', v)} placeholder="30" />
            </div>
            <Field label="Email *" type="email" value={form.email} onChange={(v) => update('email', v)} placeholder="votre@email.com" />
            <Field label="WhatsApp *" type="tel" value={form.telephone} onChange={(v) => update('telephone', v)} placeholder="+237 6XX XXX XXX" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Ville *" value={form.ville} onChange={(v) => update('ville', v)} placeholder="Douala, Paris..." />
              <Field label="Pays" value={form.pays} onChange={(v) => update('pays', v)} placeholder="Cameroun..." />
            </div>
            <Field label="Profession *" value={form.profession} onChange={(v) => update('profession', v)} placeholder="Ex : Entrepreneur, Médecin..." />

            <button
              onClick={() => setStep(2)}
              disabled={!step1Valid}
              className="w-full py-4 rounded-xl bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-2"
            >
              Continuer →
            </button>
          </div>
        )}

        {/* ─── ÉTAPE 2 — 5 Piliers de vie ──────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            <p className="text-white/40 text-xs leading-relaxed text-center">
              Ces 5 dimensions nous permettent de trouver des compatibilités profondes.
            </p>
            {PILIERS.map((p) => (
              <div key={p.key}>
                <label className="block text-white/50 text-xs mb-1.5 font-medium">{p.label} *</label>
                <textarea
                  value={(form as Record<string, string>)[p.key]}
                  onChange={(e) => update(p.key, e.target.value)}
                  rows={2}
                  placeholder={p.placeholder}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>
            ))}
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-4 rounded-xl border border-white/10 text-white/50 text-sm hover:border-white/20 transition-colors">← Retour</button>
              <button onClick={() => setStep(3)} disabled={!step2Valid} className="flex-1 py-4 rounded-xl bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Continuer →</button>
            </div>
          </div>
        )}

        {/* ─── ÉTAPE 3 — Portrait + Charte ─────────────────────── */}
        {step === 3 && (
          <div className="space-y-5">
            {/* Portrait narratif */}
            <div>
              <label className="block text-white/50 text-xs mb-1.5">Portrait narratif * <span className="text-white/20">(500–1000 mots)</span></label>
              <textarea
                value={form.bio}
                onChange={(e) => update('bio', e.target.value)}
                rows={5}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-amber-500/50 resize-none"
                placeholder="Décrivez-vous avec authenticité : votre caractère, votre mode de vie, vos aspirations, ce qui vous rend unique..."
              />
              <p className="text-white/20 text-[10px] mt-1">{form.bio.length} caractères</p>
            </div>

            <div>
              <label className="block text-white/50 text-xs mb-1.5">Ce que vous recherchez *</label>
              <textarea
                value={form.recherche}
                onChange={(e) => update('recherche', e.target.value)}
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-amber-500/50 resize-none"
                placeholder="Décrivez la relation et le profil que vous recherchez..."
              />
            </div>

            <div>
              <label className="block text-white/50 text-xs mb-1.5">Je recherche *</label>
              <div className="grid grid-cols-3 gap-2">
                {(['homme', 'femme', 'les deux'] as const).map((g) => (
                  <button key={g} onClick={() => update('genre_recherche', g)}
                    className={`py-2.5 rounded-xl text-xs font-medium capitalize border transition-colors ${form.genre_recherche === g ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'bg-white/5 border-white/10 text-white/50 hover:border-white/20'}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-white/50 text-xs mb-2">Vos valeurs <span className="text-white/20">(max 5)</span></label>
              <div className="flex flex-wrap gap-2">
                {VALEURS_OPTIONS.map((v) => (
                  <button key={v} onClick={() => toggleItem('valeurs', v)} disabled={!form.valeurs.includes(v) && form.valeurs.length >= 5}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${form.valeurs.includes(v) ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20 disabled:opacity-30'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-white/50 text-xs mb-2">Vos loisirs <span className="text-white/20">(max 5)</span></label>
              <div className="flex flex-wrap gap-2">
                {LOISIRS_OPTIONS.map((l) => (
                  <button key={l} onClick={() => toggleItem('loisirs', l)} disabled={!form.loisirs.includes(l) && form.loisirs.length >= 5}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${form.loisirs.includes(l) ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20 disabled:opacity-30'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* ─── CHARTE DE L'ALLIANCE ──────────────────────────── */}
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
              <h3 className="text-amber-300 font-semibold text-sm mb-4 flex items-center gap-2">
                📜 Charte de l&apos;Alliance
              </h3>
              <div className="space-y-3 mb-5">
                {[
                  { num: '1', titre: 'SINCÉRITÉ', texte: 'Votre Portrait de Cœur doit être authentique et refléter fidèlement qui vous êtes.' },
                  { num: '2', titre: 'DISCRÉTION', texte: 'Toute capture d\'écran, partage ou divulgation à des tiers est strictement interdite.' },
                  { num: '3', titre: 'MÉDIATION', texte: 'Aucun échange direct de numéros de téléphone. Les rencontres sont orchestrées exclusivement par L&Lui Signature.' },
                  { num: '4', titre: 'VALIDATION', texte: 'L\'adhésion devient active après vérification manuelle du paiement ET validation du profil par l\'équipe.' },
                ].map((item) => (
                  <div key={item.num} className="flex gap-3">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-amber-500/30 text-amber-300 text-[10px] font-bold flex items-center justify-center mt-0.5">
                      {item.num}
                    </span>
                    <div>
                      <p className="text-amber-300 text-xs font-semibold">{item.titre}</p>
                      <p className="text-white/50 text-xs mt-0.5 leading-relaxed">{item.texte}</p>
                    </div>
                  </div>
                ))}
              </div>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className={`mt-0.5 w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${form.charte_acceptee ? 'bg-amber-500 border-amber-500' : 'border-amber-500/40 bg-transparent group-hover:border-amber-500/60'}`}
                  onClick={() => update('charte_acceptee', !form.charte_acceptee)}>
                  {form.charte_acceptee && (
                    <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  )}
                </div>
                <span className="text-white/70 text-xs leading-relaxed">
                  J&apos;ai lu et j&apos;accepte la Charte de l&apos;Alliance Privée. Je comprends que mon adhésion sera conditionnée à la vérification de mon paiement et de mon profil.
                </span>
              </label>
            </div>

            {error && (
              <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-4 rounded-xl border border-white/10 text-white/50 text-sm hover:border-white/20 transition-colors">← Retour</button>
              <button
                onClick={handleSubmit}
                disabled={loading || !step3Valid}
                className="flex-1 py-4 rounded-xl bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? 'Envoi...' : 'Soumettre ✦'}
              </button>
            </div>

            <p className="text-white/20 text-xs text-center">{nomEtablissement} · Confidentialité absolue</p>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string
}) {
  return (
    <div>
      <label className="block text-white/50 text-xs mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-amber-500/50"
      />
    </div>
  )
}
