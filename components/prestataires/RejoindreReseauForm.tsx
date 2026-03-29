'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

const CATEGORIES = [
  { id: 'restauration', label: 'Restauration / Traiteur' },
  { id: 'photo_video', label: 'Photo & Vidéo' },
  { id: 'decoration', label: 'Décoration' },
  { id: 'son_animation', label: 'Son & Animation / DJ' },
  { id: 'beaute_bienetre', label: 'Beauté & Bien-être' },
  { id: 'experiences', label: 'Expériences & Activités' },
  { id: 'mariage_evenements', label: 'Mariage & Événements' },
]

const AVANTAGES = [
  { emoji: '🏅', titre: 'Badge Certifié L&Lui Signature', desc: 'Augmentez votre crédibilité' },
  { emoji: '👁️', titre: 'Visibilité maximale', desc: 'Sur /prestataires et /kribi' },
  { emoji: '💍', titre: 'Clients mariages & touristes', desc: 'Accédez à notre réseau premium' },
  { emoji: '📱', titre: 'Réservations intégrées', desc: 'Système de booking automatique' },
  { emoji: '💰', titre: 'Commission sur bookings uniquement', desc: 'Aucun abonnement mensuel' },
]

export default function RejoindreReseauForm() {
  const [form, setForm] = useState({
    nom: '', categorie: '', description: '', localisation: 'Kribi',
    telephone: '', whatsapp: '', services_proposes: '',
    experience: '', message: '',
  })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nom || !form.categorie || !form.telephone) return
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/rejoindre-reseau', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setSent(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center py-16 px-4">
        <CheckCircle2 size={48} className="mx-auto mb-4 text-[#C9A84C]" />
        <h2 className="font-serif text-2xl font-semibold text-[#1A1A1A] mb-2">Candidature envoyée !</h2>
        <p className="text-[#1A1A1A]/60 text-sm max-w-sm mx-auto">
          L&apos;équipe L&amp;Lui Signature examinera votre dossier et vous contactera sur WhatsApp sous 48h.
        </p>
      </div>
    )
  }

  const inputCls = "w-full px-4 py-3 rounded-xl border border-[#1A1A1A]/15 text-sm bg-white focus:outline-none focus:border-[#C9A84C] transition-colors"

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Avantages */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
        {AVANTAGES.map((a) => (
          <div key={a.emoji} className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-[#1A1A1A]/8">
            <span className="text-2xl flex-shrink-0">{a.emoji}</span>
            <div>
              <p className="font-semibold text-sm text-[#1A1A1A]">{a.titre}</p>
              <p className="text-xs text-[#1A1A1A]/50 mt-0.5">{a.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-[#1A1A1A]/60 mb-1.5 uppercase tracking-wide">
            Nom complet / Nom de l&apos;activité *
          </label>
          <input required value={form.nom} onChange={(e) => set('nom', e.target.value)} placeholder="Studio Kamer Photo" className={inputCls} />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1A1A1A]/60 mb-1.5 uppercase tracking-wide">Catégorie *</label>
          <select required value={form.categorie} onChange={(e) => set('categorie', e.target.value)} className={inputCls}>
            <option value="">Choisissez votre catégorie</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1A1A1A]/60 mb-1.5 uppercase tracking-wide">Description de vos services</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Décrivez votre activité, votre style, votre expérience..."
            className={`${inputCls} resize-none`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#1A1A1A]/60 mb-1.5 uppercase tracking-wide">Localisation</label>
            <input value={form.localisation} onChange={(e) => set('localisation', e.target.value)} placeholder="Kribi" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1A1A1A]/60 mb-1.5 uppercase tracking-wide">Téléphone WhatsApp *</label>
            <input required type="tel" value={form.telephone} onChange={(e) => set('telephone', e.target.value)} placeholder="+237 6XX XXX XXX" className={inputCls} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1A1A1A]/60 mb-1.5 uppercase tracking-wide">Services proposés & tarifs indicatifs</label>
          <textarea
            rows={3}
            value={form.services_proposes}
            onChange={(e) => set('services_proposes', e.target.value)}
            placeholder="Ex: Reportage mariage — 150 000 FCFA / Séance photo — 35 000 FCFA..."
            className={`${inputCls} resize-none`}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1A1A1A]/60 mb-1.5 uppercase tracking-wide">Années d&apos;expérience</label>
          <input value={form.experience} onChange={(e) => set('experience', e.target.value)} placeholder="Ex: 5 ans" className={inputCls} />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1A1A1A]/60 mb-1.5 uppercase tracking-wide">Message libre</label>
          <textarea
            rows={2}
            value={form.message}
            onChange={(e) => set('message', e.target.value)}
            placeholder="Quelque chose à ajouter ?"
            className={`${inputCls} resize-none`}
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={sending}
          className="w-full py-4 rounded-2xl font-semibold text-base transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: '#C9A84C', color: '#1A1A1A' }}
        >
          {sending ? 'Envoi en cours...' : 'Envoyer ma candidature →'}
        </button>
        <p className="text-center text-xs text-[#1A1A1A]/40">
          Commission uniquement sur les réservations effectuées via la plateforme.
        </p>
      </form>
    </div>
  )
}
