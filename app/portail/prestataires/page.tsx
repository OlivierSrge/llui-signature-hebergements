'use client'
// app/portail/prestataires/page.tsx — Prestataires enrichis avec modale + WhatsApp + upload contrat

import { useState, useEffect, useRef } from 'react'

type TypePrestataire =
  | 'traiteur' | 'photographe' | 'videaste' | 'decorateur' | 'fleuriste'
  | 'musicien' | 'maitre_ceremonies' | 'beaute' | 'technique_son_lumiere'
  | 'transport' | 'wedding_planner' | 'autre'

type Statut = 'confirme' | 'en_discussion' | 'a_confirmer' | 'annule'

interface Prestataire {
  id: string
  nom: string
  type: TypePrestataire
  tel: string
  statut: Statut
  montant: number
  notes: string
  recu_url: string
  created_at?: string
}

const TYPES: TypePrestataire[] = [
  'traiteur', 'photographe', 'videaste', 'decorateur', 'fleuriste',
  'musicien', 'maitre_ceremonies', 'beaute', 'technique_son_lumiere',
  'transport', 'wedding_planner', 'autre',
]
const TYPE_LABELS: Record<TypePrestataire, string> = {
  traiteur: 'Traiteur',
  photographe: 'Photographe',
  videaste: 'Vidéaste',
  decorateur: 'Décorateur',
  fleuriste: 'Fleuriste',
  musicien: 'Musicien',
  maitre_ceremonies: 'Maître des cérémonies',
  beaute: 'Beauté & Bien-être',
  technique_son_lumiere: 'Technique, Son & Lumière',
  transport: 'Transport',
  wedding_planner: 'Wedding Planner',
  autre: 'Autre',
}

const STATUT_CONFIG: Record<Statut, { label: string; color: string; bg: string }> = {
  confirme:     { label: 'Confirmé',     color: '#7C9A7E', bg: '#7C9A7E22' },
  en_discussion:{ label: 'En discussion',color: '#3B82F6', bg: '#3B82F622' },
  a_confirmer:  { label: 'À confirmer',  color: '#C9A84C', bg: '#C9A84C22' },
  annule:       { label: 'Annulé',       color: '#C0392B', bg: '#C0392B22' },
}

const STATUTS: Statut[] = ['confirme', 'en_discussion', 'a_confirmer', 'annule']

function getUid() {
  if (typeof document === 'undefined') return ''
  return decodeURIComponent(document.cookie.match(/portail_uid=([^;]+)/)?.[1] ?? '')
}
function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

export default function PrestatairesPage() {
  const [uid] = useState(() => getUid())
  const [prestataires, setPrestataires] = useState<Prestataire[]>([])
  const [toast, setToast] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Prestataire | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Formulaire ajout
  const [fNom, setFNom] = useState('')
  const [fType, setFType] = useState<TypePrestataire>('traiteur')
  const [fTel, setFTel] = useState('')
  const [fStatut, setFStatut] = useState<Statut>('a_confirmer')
  const [fMontant, setFMontant] = useState('')
  const [fSaving, setFSaving] = useState(false)

  // Édition dans la modale
  const [mStatut, setMStatut] = useState<Statut>('a_confirmer')
  const [mMontant, setMMontant] = useState('')
  const [mNotes, setMNotes] = useState('')
  const [mSaving, setMSaving] = useState(false)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = () => {
    if (!uid) return
    fetch(`/api/portail/prestataires?uid=${uid}`)
      .then(r => r.json())
      .then(d => setPrestataires(d.prestataires ?? []))
      .catch(() => {})
  }
  useEffect(() => { if (uid) load() }, [uid])

  const openModal = (p: Prestataire) => {
    setSelected(p)
    setMStatut(p.statut)
    setMMontant(p.montant ? String(p.montant) : '')
    setMNotes(p.notes ?? '')
  }

  const handleAjouter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uid || !fNom.trim()) return
    setFSaving(true)
    await fetch('/api/portail/ajouter-prestataire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom: fNom.trim(), type: fType, tel: fTel.trim(), statut: fStatut, montant: Number(fMontant) || 0 }),
    }).catch(() => {})
    setFNom(''); setFTel(''); setFMontant(''); setFSaving(false); setShowForm(false)
    showToast('Prestataire ajouté ✓'); load()
  }

  const handleSaveModal = async () => {
    if (!selected || !uid) return
    setMSaving(true)
    await fetch('/api/portail/update-prestataire', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prestataire_id: selected.id,
        statut: mStatut,
        montant: Number(mMontant) || 0,
        notes: mNotes,
      }),
    }).catch(() => {})
    setMSaving(false); setSelected(null); showToast('Prestataire mis à jour ✓'); load()
  }

  const handleUploadContrat = async (file: File) => {
    if (!selected || !uid) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('path', `maries/${uid}/contrats/${selected.id}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`)
      const res = await fetch('/api/portail/upload', { method: 'POST', body: formData })
      const d = await res.json()
      if (!d.url) throw new Error(d.error ?? 'Upload échoué')
      const url = d.url as string
      await fetch('/api/portail/update-prestataire', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prestataire_id: selected.id, recu_url: url }),
      })
      setSelected(prev => prev ? { ...prev, recu_url: url } : null)
      showToast('Contrat uploadé ✓')
      load()
    } catch {
      showToast('Erreur lors de l\'upload')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (p: Prestataire) => {
    if (!confirm(`Supprimer ${p.nom} ?`) || !uid) return
    await fetch(`/api/portail/prestataires/${p.id}?uid=${uid}`, { method: 'DELETE' }).catch(() => {})
    showToast('Supprimé ✓'); load()
  }

  const totalConfirme = prestataires.filter(p => p.statut === 'confirme').reduce((s, p) => s + p.montant, 0)
  const totalGlobal = prestataires.reduce((s, p) => s + p.montant, 0)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 pb-20">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white text-sm px-4 py-2.5 rounded-xl shadow-lg max-w-xs text-center">
          {toast}
        </div>
      )}

      {/* Modale prestataire */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 space-y-4">
              {/* En-tête modale */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-serif italic text-lg text-[#1A1A1A]">{selected.nom}</p>
                  <p className="text-xs text-[#888]">{TYPE_LABELS[selected.type as TypePrestataire] ?? selected.type}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-[#888] hover:text-[#1A1A1A] text-xl leading-none p-1">✕</button>
              </div>

              {/* Contact WhatsApp */}
              {selected.tel && (
                <a
                  href={`https://wa.me/${selected.tel.replace(/\D/g, '')}?text=${encodeURIComponent(`Bonjour, je vous contacte au sujet de notre mariage. Je souhaitais vous parler de notre collaboration.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: '#25D366' }}
                >
                  <span>💬</span> Contacter sur WhatsApp → {selected.tel}
                </a>
              )}

              {/* Statut */}
              <div>
                <label className="text-xs text-[#888] block mb-1.5">Statut</label>
                <div className="flex flex-wrap gap-2">
                  {STATUTS.map(s => (
                    <button
                      key={s}
                      onClick={() => setMStatut(s)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                      style={{
                        background: mStatut === s ? STATUT_CONFIG[s].color : STATUT_CONFIG[s].bg,
                        color: mStatut === s ? 'white' : STATUT_CONFIG[s].color,
                        border: `1px solid ${STATUT_CONFIG[s].color}`,
                      }}
                    >
                      {STATUT_CONFIG[s].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Montant devis */}
              <div>
                <label className="text-xs text-[#888] block mb-1.5">Montant devis (FCFA)</label>
                <input
                  type="number"
                  value={mMontant}
                  onChange={e => setMMontant(e.target.value)}
                  placeholder="0"
                  className="w-full border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]"
                />
              </div>

              {/* Notes / Brief */}
              <div>
                <label className="text-xs text-[#888] block mb-1.5">Notes & Brief artistique</label>
                <textarea
                  value={mNotes}
                  onChange={e => setMNotes(e.target.value)}
                  placeholder="Vos notes, instructions particulières, style souhaité..."
                  rows={3}
                  className="w-full border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C] resize-none"
                />
              </div>

              {/* Upload contrat PDF */}
              <div>
                <label className="text-xs text-[#888] block mb-1.5">Contrat PDF / Document</label>
                {selected.recu_url ? (
                  <div className="flex items-center gap-2 p-3 bg-[#F5F0E8] rounded-xl">
                    <span className="text-sm">📄</span>
                    <a href={selected.recu_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#C9A84C] underline flex-1 truncate">
                      Voir le contrat
                    </a>
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="text-xs text-[#888] hover:text-[#1A1A1A]"
                    >
                      Remplacer
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="w-full py-3 rounded-xl text-sm border-2 border-dashed border-[#E8E0D0] text-[#888] hover:border-[#C9A84C] hover:text-[#C9A84C] transition-colors"
                  >
                    {uploading ? '⏳ Upload en cours…' : '📎 Uploader le contrat (PDF, image)'}
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,image/*"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadContrat(f) }}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSaveModal}
                  disabled={mSaving}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: '#C9A84C' }}
                >
                  {mSaving ? 'Enregistrement…' : '✓ Enregistrer'}
                </button>
                <button
                  onClick={() => { setSelected(null); handleDelete(selected) }}
                  className="px-4 py-3 rounded-xl text-sm text-red-500 border border-red-200 hover:bg-red-50"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <a href="/portail" className="text-xs text-[#C9A84C] block mb-0.5">← Retour</a>
          <h1 className="font-serif italic text-2xl text-[#1A1A1A]">Mes Prestataires</h1>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: '#C9A84C' }}
        >
          + Ajouter
        </button>
      </div>

      {/* Formulaire ajout */}
      {showForm && (
        <form onSubmit={handleAjouter} className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8] space-y-3">
          <p className="font-semibold text-sm">Nouveau prestataire</p>
          <input
            value={fNom}
            onChange={e => setFNom(e.target.value)}
            placeholder="Nom du prestataire *"
            required
            className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={fType}
              onChange={e => setFType(e.target.value as TypePrestataire)}
              className="border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C] bg-white"
            >
              {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
            <select
              value={fStatut}
              onChange={e => setFStatut(e.target.value as Statut)}
              className="border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C] bg-white"
            >
              {STATUTS.map(s => <option key={s} value={s}>{STATUT_CONFIG[s].label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={fTel}
              onChange={e => setFTel(e.target.value)}
              placeholder="WhatsApp (+237...)"
              className="border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]"
            />
            <input
              type="number"
              value={fMontant}
              onChange={e => setFMontant(e.target.value)}
              placeholder="Devis (FCFA)"
              className="border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={fSaving || !fNom.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#C9A84C' }}>
              {fSaving ? 'Ajout…' : '+ Ajouter'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl text-sm border border-[#E8E0D0] text-[#888]">Annuler</button>
          </div>
        </form>
      )}

      {/* Résumé financier */}
      {prestataires.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8] text-center">
            <p className="font-bold text-base text-[#7C9A7E]">{fmt(totalConfirme)}</p>
            <p className="text-[10px] text-[#888] mt-0.5">Confirmés</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8] text-center">
            <p className="font-bold text-base text-[#C9A84C]">{fmt(totalGlobal)}</p>
            <p className="text-[10px] text-[#888] mt-0.5">Total engagements</p>
          </div>
        </div>
      )}

      {/* Liste */}
      {prestataires.length === 0 && (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#F5F0E8] text-center">
          <p className="text-2xl mb-2">🤝</p>
          <p className="text-sm text-[#888]">Vos prestataires apparaîtront ici</p>
          <p className="text-xs text-[#AAA] mt-1">Ajoutez votre traiteur, photographe, décorateur…</p>
        </div>
      )}

      {/* Annuaire L&Lui */}
      <div className="rounded-2xl p-4 border border-[#C9A84C]/30" style={{ background: 'rgba(201,168,76,0.07)' }}>
        <p className="text-xs font-semibold text-[#C9A84C] uppercase tracking-wide mb-1">Annuaire certifié L&amp;Lui</p>
        <p className="text-sm text-[#1A1A1A] mb-3">
          Découvrez nos prestataires certifiés : photographes, DJ, décorateurs, beauté…
        </p>
        <a
          href="/prestataires"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#1A1A1A] transition-opacity hover:opacity-80"
          style={{ background: '#C9A84C' }}
        >
          Voir l&apos;annuaire →
        </a>
      </div>

      <div className="space-y-3">
        {prestataires.map(p => {
          const sc = STATUT_CONFIG[p.statut] ?? STATUT_CONFIG.a_confirmer
          return (
            <button
              key={p.id}
              onClick={() => openModal(p)}
              className="w-full bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8] flex items-center gap-3 text-left hover:border-[#C9A84C] transition-colors"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm" style={{ background: sc.bg }}>
                {{
                  traiteur: '🍽️', photographe: '📷', videaste: '🎬', decorateur: '🌸',
                  fleuriste: '💐', musicien: '🎵', maitre_ceremonies: '🎤', beaute: '💄',
                  technique_son_lumiere: '💡', transport: '🚌', wedding_planner: '💛', autre: '🤝',
                }[p.type] ?? '🤝'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1A1A1A] truncate">{p.nom}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px]" style={{ color: sc.color }}>{sc.label}</span>
                  {p.tel && <span className="text-[10px] text-[#888]">· {p.tel}</span>}
                  {p.recu_url && <span className="text-[10px] text-[#C9A84C]">· 📄 Contrat</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                {p.montant > 0 && <p className="text-xs font-semibold text-[#888]">{fmt(p.montant)}</p>}
                <p className="text-[10px] text-[#C9A84C] mt-0.5">Détails →</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
