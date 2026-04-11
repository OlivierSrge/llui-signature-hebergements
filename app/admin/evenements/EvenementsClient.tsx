'use client'

import { useState, useTransition } from 'react'
import { toast } from 'react-hot-toast'
import {
  creerEvenementCanal2,
  modifierEvenementCanal2,
  supprimerEvenementCanal2,
  type EvenementCanal2,
  type TypeEvenement,
} from '@/actions/evenements'
import { useRouter } from 'next/navigation'

const EMOJIS = ['🎉', '🏖️', '🎵', '🍽️', '⚽', '🎭', '🌅']
const TYPES: { value: TypeEvenement; label: string }[] = [
  { value: 'mariage', label: 'Mariage' },
  { value: 'festival', label: 'Festival' },
  { value: 'sport', label: 'Sport' },
  { value: 'culturel', label: 'Culturel' },
  { value: 'gastronomie', label: 'Gastronomie' },
  { value: 'autre', label: 'Autre' },
]

const FORM_VIDE = {
  titre: '',
  description: '',
  date_debut: '',
  date_fin: '',
  lieu: '',
  type: 'autre' as TypeEvenement,
  emoji: '🎉',
  actif: true,
}

interface Props { evenements: EvenementCanal2[] }

export default function EvenementsClient({ evenements: initial }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(FORM_VIDE)

  function set<K extends keyof typeof FORM_VIDE>(k: K, v: (typeof FORM_VIDE)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function ouvrirCreation() {
    setEditId(null)
    setForm(FORM_VIDE)
    setShowForm(true)
  }

  function ouvrirEdition(ev: EvenementCanal2) {
    setEditId(ev.uid)
    setForm({
      titre: ev.titre,
      description: ev.description,
      date_debut: ev.date_debut?.slice(0, 16) ?? '',
      date_fin: ev.date_fin?.slice(0, 16) ?? '',
      lieu: ev.lieu,
      type: ev.type,
      emoji: ev.emoji,
      actif: ev.actif,
    })
    setShowForm(true)
  }

  async function handleSauvegarder() {
    if (!form.titre.trim()) return toast.error('Titre requis')
    if (!form.date_debut) return toast.error('Date de début requise')
    if (!form.lieu.trim()) return toast.error('Lieu requis')

    const payload = {
      titre: form.titre.trim(),
      description: form.description.slice(0, 200),
      date_debut: form.date_debut,
      date_fin: form.date_fin || null,
      lieu: form.lieu.trim(),
      type: form.type,
      emoji: form.emoji,
      actif: form.actif,
    }

    startTransition(async () => {
      const res = editId
        ? await modifierEvenementCanal2(editId, payload)
        : await creerEvenementCanal2(payload)
      if (res.success) {
        toast.success(editId ? '✅ Événement modifié' : '✅ Événement créé')
        setShowForm(false)
        router.refresh()
      } else {
        toast.error(res.error ?? 'Erreur')
      }
    })
  }

  async function handleSupprimer(uid: string, titre: string) {
    if (!confirm(`Supprimer "${titre}" ?`)) return
    startTransition(async () => {
      const res = await supprimerEvenementCanal2(uid)
      if (res.success) { toast.success('Supprimé'); router.refresh() }
      else toast.error(res.error ?? 'Erreur')
    })
  }

  async function handleToggle(uid: string, actif: boolean) {
    startTransition(async () => {
      const res = await modifierEvenementCanal2(uid, { actif: !actif })
      if (res.success) router.refresh()
      else toast.error(res.error ?? 'Erreur')
    })
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Entête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-[#1A1A1A]">📅 Événements Kribi</h1>
          <p className="text-sm text-[#1A1A1A]/50 mt-0.5">{initial.length} événement{initial.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={ouvrirCreation}
          className="px-4 py-2 bg-[#C9A84C] text-white text-sm font-semibold rounded-xl hover:bg-[#b8963e] transition-colors">
          + Nouvel événement
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#F5F0E8] space-y-4">
          <h2 className="text-base font-semibold text-[#1A1A1A]">
            {editId ? 'Modifier l\'événement' : 'Nouvel événement'}
          </h2>

          {/* Emoji */}
          <div>
            <p className="text-sm text-[#1A1A1A]/70 mb-2">Emoji</p>
            <div className="flex gap-2 flex-wrap">
              {EMOJIS.map((e) => (
                <button key={e} onClick={() => set('emoji', e)}
                  className={`text-2xl p-2 rounded-xl border-2 transition-colors ${form.emoji === e ? 'border-[#C9A84C] bg-[#F5F0E8]' : 'border-transparent'}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Titre */}
          <div>
            <p className="text-sm text-[#1A1A1A]/70 mb-1">Titre *</p>
            <input value={form.titre} onChange={(e) => set('titre', e.target.value)}
              placeholder="Ex: Mariage Ateba"
              className="w-full border border-[#F5F0E8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]" />
          </div>

          {/* Description */}
          <div>
            <p className="text-sm text-[#1A1A1A]/70 mb-1">Description <span className="text-[#1A1A1A]/40">(max 200 chars)</span></p>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
              maxLength={200} rows={2}
              className="w-full border border-[#F5F0E8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C] resize-none" />
            <p className="text-xs text-[#1A1A1A]/40 mt-0.5">{form.description.length}/200</p>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-sm text-[#1A1A1A]/70 mb-1">Date début *</p>
              <input type="datetime-local" value={form.date_debut}
                onChange={(e) => set('date_debut', e.target.value)}
                className="w-full border border-[#F5F0E8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]" />
            </div>
            <div>
              <p className="text-sm text-[#1A1A1A]/70 mb-1">Date fin</p>
              <input type="datetime-local" value={form.date_fin}
                onChange={(e) => set('date_fin', e.target.value)}
                className="w-full border border-[#F5F0E8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]" />
            </div>
          </div>

          {/* Lieu */}
          <div>
            <p className="text-sm text-[#1A1A1A]/70 mb-1">Lieu *</p>
            <input value={form.lieu} onChange={(e) => set('lieu', e.target.value)}
              placeholder="Ex: Plage des Cocotiers"
              className="w-full border border-[#F5F0E8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]" />
          </div>

          {/* Type */}
          <div>
            <p className="text-sm text-[#1A1A1A]/70 mb-1">Type</p>
            <select value={form.type} onChange={(e) => set('type', e.target.value as TypeEvenement)}
              className="w-full border border-[#F5F0E8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C] bg-white">
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Actif */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => set('actif', !form.actif)}
              className={`w-10 h-6 rounded-full transition-colors ${form.actif ? 'bg-[#C9A84C]' : 'bg-gray-200'} relative`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form.actif ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
            <span className="text-sm text-[#1A1A1A]">Actif</span>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button onClick={handleSauvegarder} disabled={isPending}
              className="flex-1 py-2.5 bg-[#C9A84C] text-white text-sm font-semibold rounded-xl hover:bg-[#b8963e] disabled:opacity-60 transition-colors">
              {isPending ? 'Enregistrement...' : '💾 Enregistrer'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2.5 border border-[#F5F0E8] text-[#1A1A1A]/60 text-sm rounded-xl hover:bg-[#F5F0E8] transition-colors">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {initial.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center text-[#1A1A1A]/40 shadow-sm">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-sm">Aucun événement. Créez le premier !</p>
        </div>
      ) : (
        <div className="space-y-3">
          {initial.map((ev) => (
            <div key={ev.uid} className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-2xl">{ev.emoji}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-[#1A1A1A] text-sm leading-snug">{ev.titre}</p>
                    <p className="text-xs text-[#1A1A1A]/50 mt-0.5">
                      {ev.date_formatee} — {ev.lieu}
                    </p>
                    {ev.description && (
                      <p className="text-xs text-[#1A1A1A]/40 mt-0.5 truncate">{ev.description}</p>
                    )}
                  </div>
                </div>
                <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${ev.actif ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {ev.actif ? 'Actif ✅' : 'Inactif'}
                </span>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => ouvrirEdition(ev)}
                  className="px-3 py-1.5 text-xs font-medium border border-[#C9A84C] text-[#C9A84C] rounded-lg hover:bg-[#F5F0E8] transition-colors">
                  Modifier
                </button>
                <button onClick={() => handleToggle(ev.uid, ev.actif)} disabled={isPending}
                  className="px-3 py-1.5 text-xs font-medium border border-gray-200 text-[#1A1A1A]/60 rounded-lg hover:bg-gray-50 transition-colors">
                  {ev.actif ? 'Désactiver' : 'Activer'}
                </button>
                <button onClick={() => handleSupprimer(ev.uid, ev.titre)} disabled={isPending}
                  className="px-3 py-1.5 text-xs font-medium border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
