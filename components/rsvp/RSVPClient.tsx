'use client'
// components/rsvp/RSVPClient.tsx — #42 RSVP formulaire dynamique

import { useState } from 'react'

interface Props {
  marie_uid: string
  noms_maries: string
  date_mariage: string
  lieu: string
}

const REGIMES = [
  { key: 'normal', label: 'Standard', emoji: '🍽️' },
  { key: 'vegetarien', label: 'Végétarien', emoji: '🥗' },
  { key: 'vegan', label: 'Vegan', emoji: '🌱' },
  { key: 'sans_gluten', label: 'Sans gluten', emoji: '🌾' },
  { key: 'halal', label: 'Halal', emoji: '🥩' },
  { key: 'sans_porc', label: 'Sans porc', emoji: '🚫' },
]

function formatDateLong(iso: string) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return iso }
}

export default function RSVPClient({ marie_uid, noms_maries, date_mariage, lieu }: Props) {
  const [step, setStep] = useState<'form' | 'success' | 'error'>('form')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    prenom: '', nom: '', email: '', tel: '',
    nb_adultes: '1', nb_enfants: '0',
    regimes: ['normal'] as string[],
    allergies: '',
    pmr: false,
    besoin_hebergement: false,
    message: '',
    presence: 'oui' as 'oui' | 'non' | 'peut_etre',
  })

  function toggleRegime(key: string) {
    setForm(f => ({
      ...f,
      regimes: f.regimes.includes(key) ? f.regimes.filter(r => r !== key) : [...f.regimes, key],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.prenom || !form.nom) return
    setLoading(true)
    try {
      const res = await fetch(`/api/rsvp/${marie_uid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) setStep('success')
      else setStep('error')
    } catch {
      setStep('error')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'success') return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#FAF6EE' }}>
      <div className="max-w-sm w-full text-center bg-white rounded-3xl shadow-xl p-8">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-serif text-[#1A1A1A] mb-3">Merci !</h2>
        <p className="text-sm text-[#888] mb-2">Votre réponse a bien été transmise à</p>
        <p className="font-semibold text-[#1A1A1A] mb-6">{noms_maries}</p>
        {form.presence === 'oui' && (
          <div className="p-4 rounded-2xl mb-4" style={{ background: '#7C9A7E15', border: '1px solid #7C9A7E30' }}>
            <p className="text-sm text-[#7C9A7E] font-semibold">✅ À bientôt le {formatDateLong(date_mariage)} à {lieu} !</p>
          </div>
        )}
        {form.presence === 'non' && (
          <p className="text-sm text-[#888]">Dommage de ne pas pouvoir vous compter parmi nous 💛</p>
        )}
      </div>
    </div>
  )

  if (step === 'error') return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#FAF6EE' }}>
      <div className="max-w-sm w-full text-center bg-white rounded-3xl shadow-xl p-8">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="text-xl font-semibold text-[#1A1A1A] mb-3">Une erreur s'est produite</h2>
        <button onClick={() => setStep('form')} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#C9A84C' }}>
          Réessayer
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen px-4 py-10" style={{ background: '#FAF6EE' }}>
      <div className="max-w-sm mx-auto">
        {/* En-tête */}
        <div className="text-center mb-6">
          <p className="text-xs tracking-[0.3em] uppercase text-[#C9A84C] mb-2">RSVP</p>
          <h1 className="text-2xl font-serif text-[#1A1A1A]">Mariage de<br />{noms_maries || 'Les Mariés'}</h1>
          <p className="text-sm text-[#888] mt-2">{formatDateLong(date_mariage)} · {lieu}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Présence */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
            <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-3">Serez-vous présent(e) ?</p>
            <div className="flex gap-2">
              {[
                { key: 'oui', label: '✅ Oui', color: '#7C9A7E' },
                { key: 'non', label: '❌ Non', color: '#C0392B' },
                { key: 'peut_etre', label: '🤔 Peut-être', color: '#C9A84C' },
              ].map(({ key, label, color }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, presence: key as typeof f.presence }))}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: form.presence === key ? color : color + '15',
                    color: form.presence === key ? 'white' : color,
                    border: `1px solid ${color}33`,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Identité */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
            <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-3">Vos informations</p>
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[#888] block mb-1">Prénom *</label>
                  <input required value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]" placeholder="Marie" />
                </div>
                <div>
                  <label className="text-[10px] text-[#888] block mb-1">Nom *</label>
                  <input required value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]" placeholder="Dupont" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-[#888] block mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]" placeholder="email@exemple.com" />
              </div>
              <div>
                <label className="text-[10px] text-[#888] block mb-1">Téléphone</label>
                <input type="tel" value={form.tel} onChange={e => setForm(f => ({ ...f, tel: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]" placeholder="+237 6XX XXX XXX" />
              </div>
            </div>
          </div>

          {form.presence !== 'non' && (
            <>
              {/* Nombre de personnes */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
                <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-3">Votre groupe</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-[#888] block mb-1">Adultes</label>
                    <input type="number" min="1" max="20" value={form.nb_adultes}
                      onChange={e => setForm(f => ({ ...f, nb_adultes: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:border-[#C9A84C]" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#888] block mb-1">Enfants</label>
                    <input type="number" min="0" max="20" value={form.nb_enfants}
                      onChange={e => setForm(f => ({ ...f, nb_enfants: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:border-[#C9A84C]" />
                  </div>
                </div>
              </div>

              {/* Régime alimentaire */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
                <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-3">Régime alimentaire</p>
                <div className="flex flex-wrap gap-2">
                  {REGIMES.map(r => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => toggleRegime(r.key)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                      style={{
                        background: form.regimes.includes(r.key) ? '#C9A84C' : '#F5F0E8',
                        color: form.regimes.includes(r.key) ? 'white' : '#888',
                      }}
                    >
                      {r.emoji} {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Santé & Accessibilité */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
                <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-3">🏥 Santé & accessibilité</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-[#888] block mb-1">Allergies alimentaires ou médicaments</label>
                    <input
                      type="text"
                      value={form.allergies}
                      onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))}
                      placeholder="Ex : arachides, lactose, pénicilline…"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#1A1A1A]">Personne à mobilité réduite (PMR)</p>
                      <p className="text-[10px] text-[#888] mt-0.5">Accès facilité requis (rampe, place réservée…)</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, pmr: !f.pmr }))}
                      className="w-12 h-6 rounded-full transition-all relative flex-shrink-0"
                      style={{ background: form.pmr ? '#5B8FBF' : '#E5E7EB' }}
                    >
                      <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow"
                        style={{ left: form.pmr ? '1.5rem' : '0.125rem' }} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Hébergement */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A]">Besoin d'hébergement ?</p>
                    <p className="text-[10px] text-[#888] mt-0.5">Nous pouvons vous aider à trouver</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, besoin_hebergement: !f.besoin_hebergement }))}
                    className="w-12 h-6 rounded-full transition-all relative"
                    style={{ background: form.besoin_hebergement ? '#C9A84C' : '#E5E7EB' }}
                  >
                    <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow"
                      style={{ left: form.besoin_hebergement ? '1.5rem' : '0.125rem' }} />
                  </button>
                </div>
              </div>

              {/* Message */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
                <label className="text-xs font-semibold text-[#888] uppercase tracking-wide block mb-2">Message pour les mariés</label>
                <textarea
                  rows={3}
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Un mot doux pour les futurs mariés... 💛"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#C9A84C]"
                />
              </div>
            </>
          )}

          {/* Soumettre */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl font-bold text-white text-sm disabled:opacity-50 transition-opacity"
            style={{ background: 'linear-gradient(90deg, #C9A84C, #E8C87A)' }}
          >
            {loading ? 'Envoi en cours…' : '💌 Confirmer ma réponse'}
          </button>
        </form>
      </div>
    </div>
  )
}
