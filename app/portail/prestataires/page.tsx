'use client'
// app/portail/prestataires/page.tsx — CRUD prestataires mariage

import { useState, useEffect } from 'react'

type Categorie = 'COORDINATION' | 'PHOTO_VIDEO' | 'TRAITEUR' | 'MUSIQUE' | 'DECORATION' | 'AUTRE'
type Statut = 'CONFIRME' | 'DEVIS_RECU' | 'A_CONFIRMER' | 'ANNULE'

interface Prestataire {
  id: string; nom: string; categorie: Categorie; statut: Statut; montant: number; notes: string
}

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}
function getUid() {
  if (typeof document === 'undefined') return ''
  return decodeURIComponent(document.cookie.match(/portail_uid=([^;]+)/)?.[1] ?? '')
}

const CATS: Categorie[] = ['COORDINATION', 'PHOTO_VIDEO', 'TRAITEUR', 'MUSIQUE', 'DECORATION', 'AUTRE']
const CAT_LABELS: Record<Categorie, string> = { COORDINATION: 'Coordination', PHOTO_VIDEO: 'Photo & Vidéo', TRAITEUR: 'Traiteur', MUSIQUE: 'Musique', DECORATION: 'Décoration', AUTRE: 'Autre' }
const STATUT_LABELS: Record<Statut, string> = { CONFIRME: 'Confirmé', DEVIS_RECU: 'Devis reçu', A_CONFIRMER: 'À confirmer', ANNULE: 'Annulé' }
const STATUT_COLOR: Record<Statut, string> = { CONFIRME: '#7C9A7E', DEVIS_RECU: '#C9A84C', A_CONFIRMER: '#888', ANNULE: '#C0392B' }

export default function PrestatairesPage() {
  const [uid] = useState(() => getUid())
  const [prestataires, setPrestataires] = useState<Prestataire[]>([])
  const [toast, setToast] = useState('')
  const [showForm, setShowForm] = useState(false)
  // Formulaire
  const [nom, setNom] = useState(''); const [cat, setCat] = useState<Categorie>('COORDINATION')
  const [statut, setStatut] = useState<Statut>('A_CONFIRMER')
  const [montant, setMontant] = useState(''); const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const apiBase = uid ? `/api/portail/prestataires?uid=${uid}` : null

  const load = () => {
    if (!apiBase) return
    fetch(apiBase).then(r => r.json()).then(d => setPrestataires(d.prestataires ?? [])).catch(() => {})
  }
  useEffect(() => { if (uid) load() }, [uid])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const handleAjouter = async (e: React.FormEvent) => {
    e.preventDefault(); if (!uid) return
    setSaving(true)
    await fetch('/api/portail/prestataires', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, nom: nom.trim(), categorie: cat, statut, montant: Number(montant) || 0, notes: notes.trim() })
    }).catch(() => {})
    setNom(''); setMontant(''); setNotes(''); setShowForm(false)
    setSaving(false); showToast('Prestataire ajouté ✓'); load()
  }

  const handleDelete = async (id: string, nomP: string) => {
    if (!confirm(`Supprimer ${nomP} ?`) || !uid) return
    await fetch(`/api/portail/prestataires/${id}?uid=${uid}`, { method: 'DELETE' }).catch(() => {})
    showToast('Supprimé ✓'); load()
  }

  // Grouper par catégorie
  const groupes = prestataires.reduce<Record<string, Prestataire[]>>((acc, p) => {
    const k = CAT_LABELS[p.categorie] ?? p.categorie
    if (!acc[k]) acc[k] = []
    acc[k].push(p)
    return acc
  }, {})

  // Résumé financier
  const confirmes = prestataires.filter(p => p.statut === 'CONFIRME').reduce((s, p) => s + p.montant, 0)
  const devisRecus = prestataires.filter(p => p.statut === 'DEVIS_RECU').reduce((s, p) => s + p.montant, 0)
  const aConfirmer = prestataires.filter(p => p.statut === 'A_CONFIRMER').reduce((s, p) => s + p.montant, 0)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white text-sm px-4 py-2 rounded-xl shadow-lg">{toast}</div>}

      <div className="flex items-center justify-between">
        <div>
          <a href="/portail" className="text-xs text-[#C9A84C] block mb-0.5">← Retour</a>
          <h1 className="font-serif italic text-2xl text-[#1A1A1A]">Mes Prestataires</h1>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: '#C9A84C' }}>
          + Ajouter
        </button>
      </div>

      {/* Formulaire ajout */}
      {showForm && (
        <form onSubmit={handleAjouter} className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8] space-y-3">
          <p className="font-semibold text-sm">Nouveau prestataire</p>
          <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom du prestataire *" required
            className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]" />
          <div className="grid grid-cols-2 gap-2">
            <select value={cat} onChange={e => setCat(e.target.value as Categorie)}
              className="border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C] bg-white">
              {CATS.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
            </select>
            <select value={statut} onChange={e => setStatut(e.target.value as Statut)}
              className="border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C] bg-white">
              {(Object.keys(STATUT_LABELS) as Statut[]).map(s => <option key={s} value={s}>{STATUT_LABELS[s]}</option>)}
            </select>
          </div>
          <input type="number" value={montant} onChange={e => setMontant(e.target.value)} placeholder="Montant (FCFA)"
            className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]" />
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optionnel)" rows={2}
            className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C] resize-none" />
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#C9A84C' }}>
              {saving ? 'Ajout…' : '+ Ajouter'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl text-sm border border-[#E8E0D0] text-[#888]">Annuler</button>
          </div>
        </form>
      )}

      {/* Liste par catégorie */}
      {Object.entries(groupes).map(([cat, items]) => (
        <div key={cat} className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
          <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-2">{cat}</p>
          <div className="space-y-2">
            {items.map(p => (
              <div key={p.id} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUT_COLOR[p.statut] }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.nom}</p>
                  {p.notes && <p className="text-[10px] text-[#AAA] truncate">{p.notes}</p>}
                </div>
                {p.montant > 0 && <p className="text-xs font-semibold text-[#888] flex-shrink-0">{formatFCFA(p.montant)}</p>}
                <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: STATUT_COLOR[p.statut] + '22', color: STATUT_COLOR[p.statut] }}>{STATUT_LABELS[p.statut]}</span>
                {p.nom !== 'L&Lui Signature' && (
                  <button onClick={() => handleDelete(p.id, p.nom)} className="text-[10px] text-red-400 flex-shrink-0">✕</button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Résumé financier */}
      {prestataires.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: '#1A1A1A' }}>
          <p className="text-xs font-semibold text-white/40 uppercase mb-3">Résumé financier</p>
          {[{ label: 'Confirmés', val: confirmes, c: '#7C9A7E' }, { label: 'Devis reçus', val: devisRecus, c: '#C9A84C' }, { label: 'À confirmer', val: aConfirmer, c: '#888' }].map(r => (
            <div key={r.label} className="flex justify-between mb-1.5">
              <span className="text-sm text-white/60">{r.label}</span>
              <span className="text-sm font-semibold" style={{ color: r.c }}>{formatFCFA(r.val)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
