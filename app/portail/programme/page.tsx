'use client'
// app/portail/programme/page.tsx — Éditeur du programme du mariage

import { useState, useEffect } from 'react'

interface Etape {
  id: string
  emoji: string
  titre: string
  description: string
  heure: string
  ordre: number
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export default function ProgrammePage() {
  const [etapes, setEtapes] = useState<Etape[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetch('/api/portail/programme')
      .then(r => r.json())
      .then(d => { if (d.programme) setEtapes(d.programme) })
      .finally(() => setLoading(false))
  }, [])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/portail/programme', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programme: etapes.map((e, i) => ({ ...e, ordre: i })) }),
      })
      if (res.ok) {
        showToast('✓ Programme enregistré')
        setEditingId(null)
      } else {
        const d = await res.json()
        showToast(d.error || 'Erreur sauvegarde')
      }
    } catch {
      showToast('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  const addEtape = () => {
    const newEtape: Etape = {
      id: genId(),
      emoji: '✨',
      titre: '',
      description: '',
      heure: '12:00',
      ordre: etapes.length,
    }
    setEtapes(prev => [...prev, newEtape])
    setEditingId(newEtape.id)
  }

  const removeEtape = (id: string) => {
    setEtapes(prev => prev.filter(e => e.id !== id))
    if (editingId === id) setEditingId(null)
  }

  const updateEtape = (id: string, field: keyof Etape, value: string) => {
    setEtapes(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
  }

  const moveUp = (idx: number) => {
    if (idx === 0) return
    setEtapes(prev => {
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
  }

  const moveDown = (idx: number) => {
    if (idx === etapes.length - 1) return
    setEtapes(prev => {
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next
    })
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 flex justify-center">
        <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-4">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg" style={{ background: '#2C1810' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div>
        <a href="/portail" className="text-xs block mb-1" style={{ color: '#D4AF37' }}>← Retour au dashboard</a>
        <h1 className="font-serif italic text-2xl text-[#1A1A1A]">Programme du mariage</h1>
        <p className="text-xs text-[#6B4F4F] mt-0.5">
          {etapes.length} étape{etapes.length > 1 ? 's' : ''} · Appuyez sur une étape pour la modifier
        </p>
      </div>

      {/* Liste des étapes */}
      <div className="space-y-2">
        {etapes.map((etape, idx) => {
          const isEditing = editingId === etape.id
          return (
            <div
              key={etape.id}
              className="rounded-2xl overflow-hidden shadow-sm"
              style={{
                background: '#F9F5F2',
                border: isEditing ? '2px solid #D4AF37' : '1px solid rgba(212,175,55,0.2)',
              }}
            >
              {/* Ligne résumé — cliquable pour éditer */}
              <button
                type="button"
                onClick={() => setEditingId(isEditing ? null : etape.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
              >
                <span className="text-lg flex-shrink-0 w-8 text-center">{etape.emoji || '✨'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1A1A1A] truncate">
                    {etape.titre || <span className="text-[#A08878] italic">Titre de l&apos;étape</span>}
                  </p>
                  {etape.description && (
                    <p className="text-[10px] text-[#6B4F4F] truncate">{etape.description}</p>
                  )}
                </div>
                <span className="text-xs font-bold flex-shrink-0" style={{ color: '#D4AF37' }}>{etape.heure}</span>
                <span className="text-[#A08878] text-xs flex-shrink-0">{isEditing ? '▲' : '▼'}</span>
              </button>

              {/* Formulaire d'édition */}
              {isEditing && (
                <div className="px-4 pb-4 space-y-3 border-t border-[#EDD5CC] pt-3">
                  {/* Emoji + Heure sur la même ligne */}
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <label className="text-[10px] text-[#6B4F4F] block mb-1">Emoji</label>
                      <input
                        type="text"
                        value={etape.emoji}
                        onChange={e => updateEtape(etape.id, 'emoji', e.target.value)}
                        maxLength={4}
                        className="w-16 border border-[#EDD5CC] rounded-xl px-2 py-2 text-center text-lg focus:outline-none focus:border-[#D4AF37]"
                        style={{ background: '#FFF9F7' }}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-[#6B4F4F] block mb-1">Heure</label>
                      <input
                        type="time"
                        value={etape.heure}
                        onChange={e => updateEtape(etape.id, 'heure', e.target.value)}
                        className="w-full border border-[#EDD5CC] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37]"
                        style={{ background: '#FFF9F7' }}
                      />
                    </div>
                  </div>

                  {/* Titre */}
                  <div>
                    <label className="text-[10px] text-[#6B4F4F] block mb-1">Titre</label>
                    <input
                      type="text"
                      value={etape.titre}
                      onChange={e => updateEtape(etape.id, 'titre', e.target.value)}
                      placeholder="Nom de l'étape"
                      className="w-full border border-[#EDD5CC] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37]"
                      style={{ background: '#FFF9F7' }}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-[10px] text-[#6B4F4F] block mb-1">Description (optionnel)</label>
                    <input
                      type="text"
                      value={etape.description}
                      onChange={e => updateEtape(etape.id, 'description', e.target.value)}
                      placeholder="Détails de cette étape"
                      className="w-full border border-[#EDD5CC] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37]"
                      style={{ background: '#FFF9F7' }}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    {/* Monter / Descendre */}
                    <button
                      type="button"
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-opacity disabled:opacity-30"
                      style={{ borderColor: '#EDD5CC', color: '#6B4F4F' }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDown(idx)}
                      disabled={idx === etapes.length - 1}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-opacity disabled:opacity-30"
                      style={{ borderColor: '#EDD5CC', color: '#6B4F4F' }}
                    >
                      ↓
                    </button>

                    <div className="flex-1" />

                    {/* Supprimer */}
                    <button
                      type="button"
                      onClick={() => removeEtape(etape.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                      style={{ background: '#FFF0EE', color: '#C0392B', border: '1px solid #F5C6C6' }}
                    >
                      🗑️ Supprimer
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Ajouter une étape */}
      <button
        type="button"
        onClick={addEtape}
        className="w-full py-3 rounded-2xl text-sm font-semibold border-2 border-dashed transition-all"
        style={{ borderColor: 'rgba(212,175,55,0.4)', color: '#D4AF37', background: 'rgba(212,175,55,0.04)' }}
      >
        ➕ Ajouter une étape
      </button>

      {/* Bouton Enregistrer fixe en bas */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 px-4 pb-4 pt-2" style={{ background: 'linear-gradient(to top, rgba(232,196,184,0.95) 0%, transparent 100%)' }}>
        <div className="max-w-2xl mx-auto">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-[#1A1A1A] shadow-lg disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #D4AF37, #F0D060)' }}
          >
            {saving ? 'Enregistrement…' : '✓ Enregistrer le programme'}
          </button>
        </div>
      </div>
    </div>
  )
}
