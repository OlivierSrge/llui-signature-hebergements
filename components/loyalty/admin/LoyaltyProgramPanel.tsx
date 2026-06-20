'use client'

import { useState, useEffect, useCallback } from 'react'

// ── Types locaux (évite tout import depuis actions/ ou lib/) ──────────────────

interface Niveau {
  id: string
  nom: string
  emoji: string
  couleur: string
  seuil_points: number
  prix_fcfa?: number
  duree_validite_mois?: number
  avantages: string[]
}

interface LoyaltyProgram {
  program_id: string
  partenaire_id: string
  partenaire_name?: string
  nom: string
  description?: string
  prix_fcfa: number
  duree_validite_mois: number
  commission_lui_percent: number
  commission_partner_percent: number
  taux_fcfa_par_point?: number
  statut: 'DRAFT' | 'ACTIVE' | 'PAUSED'
  niveaux: Niveau[]
}

const DEFAULT_NIVEAUX: Niveau[] = [
  { id: 'bronze', nom: 'Bronze', emoji: '🤍', couleur: '#888888', seuil_points: 0, avantages: [] },
  { id: 'argent', nom: 'Argent', emoji: '🩷', couleur: '#A8A9AD', seuil_points: 500, avantages: [] },
  { id: 'or', nom: 'Or', emoji: '💎', couleur: '#C9A84C', seuil_points: 1000, avantages: [] },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function statutBadge(statut: LoyaltyProgram['statut']) {
  if (statut === 'ACTIVE') return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">ACTIVE</span>
  if (statut === 'PAUSED') return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">PAUSED</span>
  return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">DRAFT</span>
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ── Sous-composant : éditeur de niveau ───────────────────────────────────────

interface NiveauEditorProps {
  niveau: Niveau
  programPrixFcfa: number
  onSave: (updated: Niveau) => Promise<void>
  onDelete: () => void
  saving: boolean
}

function NiveauEditor({ niveau, programPrixFcfa, onSave, onDelete, saving }: NiveauEditorProps) {
  const [local, setLocal] = useState<Niveau>({ ...niveau })
  const [newAvantage, setNewAvantage] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => { setLocal({ ...niveau }) }, [niveau])

  const set = <K extends keyof Niveau>(key: K, val: Niveau[K]) => setLocal((p) => ({ ...p, [key]: val }))

  const addAvantage = () => {
    if (!newAvantage.trim()) return
    set('avantages', [...local.avantages, newAvantage.trim()])
    setNewAvantage('')
  }

  const removeAvantage = (idx: number) => set('avantages', local.avantages.filter((_, i) => i !== idx))

  return (
    <div className="bg-[#F5F0E8]/60 border border-[#C9A84C]/20 rounded-xl p-3 mt-2 space-y-3">
      {/* Ligne 1 : id, nom, emoji, couleur */}
      <div className="grid grid-cols-4 gap-2">
        <div>
          <label className="text-[10px] text-[#1A1A1A]/50 mb-0.5 block">ID unique</label>
          <input
            type="text"
            value={local.id}
            onChange={(e) => set('id', e.target.value)}
            className="w-full border border-[#F5F0E8] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#C9A84C]"
          />
        </div>
        <div>
          <label className="text-[10px] text-[#1A1A1A]/50 mb-0.5 block">Nom</label>
          <input
            type="text"
            value={local.nom}
            onChange={(e) => set('nom', e.target.value)}
            className="w-full border border-[#F5F0E8] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#C9A84C]"
          />
        </div>
        <div>
          <label className="text-[10px] text-[#1A1A1A]/50 mb-0.5 block">Emoji</label>
          <input
            type="text"
            value={local.emoji}
            onChange={(e) => set('emoji', e.target.value)}
            className="w-full border border-[#F5F0E8] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#C9A84C]"
          />
        </div>
        <div>
          <label className="text-[10px] text-[#1A1A1A]/50 mb-0.5 block">Couleur</label>
          <div className="flex gap-1">
            <input
              type="color"
              value={local.couleur}
              onChange={(e) => set('couleur', e.target.value)}
              className="w-8 h-7 rounded border border-[#F5F0E8] cursor-pointer"
            />
            <input
              type="text"
              value={local.couleur}
              onChange={(e) => set('couleur', e.target.value)}
              className="flex-1 border border-[#F5F0E8] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#C9A84C]"
            />
          </div>
        </div>
      </div>

      {/* Ligne 2 : seuil, prix optionnel, durée optionnelle */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] text-[#1A1A1A]/50 mb-0.5 block">Seuil points</label>
          <input
            type="number"
            min={0}
            value={local.seuil_points}
            onChange={(e) => set('seuil_points', Number(e.target.value))}
            className="w-full border border-[#F5F0E8] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#C9A84C]"
          />
        </div>
        <div>
          <label className="text-[10px] text-[#1A1A1A]/50 mb-0.5 block">
            Prix FCFA <span className="text-[#C9A84C]/60">(vide = global {programPrixFcfa.toLocaleString('fr-FR')})</span>
          </label>
          <input
            type="number"
            min={0}
            value={local.prix_fcfa ?? ''}
            onChange={(e) => set('prix_fcfa', e.target.value === '' ? undefined : Number(e.target.value))}
            placeholder={`défaut: ${programPrixFcfa.toLocaleString('fr-FR')}`}
            className="w-full border border-[#F5F0E8] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#C9A84C] placeholder-[#1A1A1A]/20"
          />
        </div>
        <div>
          <label className="text-[10px] text-[#1A1A1A]/50 mb-0.5 block">
            Durée (mois) <span className="text-[#C9A84C]/60">(vide = globale)</span>
          </label>
          <input
            type="number"
            min={1}
            max={120}
            value={local.duree_validite_mois ?? ''}
            onChange={(e) => set('duree_validite_mois', e.target.value === '' ? undefined : Number(e.target.value))}
            placeholder="défaut global"
            className="w-full border border-[#F5F0E8] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#C9A84C] placeholder-[#1A1A1A]/20"
          />
        </div>
      </div>

      {/* Avantages */}
      <div>
        <label className="text-[10px] text-[#1A1A1A]/50 mb-1 block">Avantages ({local.avantages.length})</label>
        <div className="space-y-1 mb-1.5">
          {local.avantages.map((av, idx) => (
            <div key={idx} className="flex items-center gap-1.5 bg-white rounded-lg px-2 py-1 border border-[#F5F0E8]">
              <span className="flex-1 text-[11px] text-[#1A1A1A]">• {av}</span>
              <button
                onClick={() => removeAvantage(idx)}
                className="text-[10px] text-red-400 hover:text-red-600"
              >✕</button>
            </div>
          ))}
        </div>
        <div className="flex gap-1">
          <input
            type="text"
            value={newAvantage}
            onChange={(e) => setNewAvantage(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAvantage() } }}
            placeholder="Ajouter un avantage..."
            className="flex-1 border border-[#F5F0E8] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#C9A84C] placeholder-[#1A1A1A]/30"
          />
          <button
            onClick={addAvantage}
            className="text-xs px-2 py-1.5 bg-[#C9A84C]/10 text-[#C9A84C] rounded-lg hover:bg-[#C9A84C]/20 transition-colors"
          >+ Ajouter</button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave(local)}
          disabled={saving}
          className="flex-1 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg disabled:opacity-60 hover:bg-indigo-700 transition-colors"
        >
          {saving ? '...' : '💾 Sauvegarder niveau'}
        </button>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-3 py-1.5 bg-red-50 text-red-500 text-xs rounded-lg hover:bg-red-100 transition-colors"
          >🗑️</button>
        ) : (
          <div className="flex gap-1">
            <button
              onClick={onDelete}
              className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg"
            >Supprimer</button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 bg-[#F5F0E8] text-[#1A1A1A]/60 text-xs rounded-lg"
            >Annuler</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sous-composant : carte niveau (affichage compact) ─────────────────────────

interface NiveauCardProps {
  niveau: Niveau
  programPrixFcfa: number
  selected: boolean
  onClick: () => void
}

function NiveauCard({ niveau, programPrixFcfa, selected, onClick }: NiveauCardProps) {
  const bgColor = hexToRgba(niveau.couleur, 0.12)
  return (
    <button
      onClick={onClick}
      style={{ borderLeftColor: niveau.couleur, backgroundColor: selected ? hexToRgba(niveau.couleur, 0.2) : bgColor }}
      className={`w-full text-left rounded-xl p-3 border border-transparent border-l-4 transition-all ${selected ? 'ring-1 ring-indigo-300' : 'hover:opacity-90'}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{niveau.emoji}</span>
        <span className="text-xs font-bold text-[#1A1A1A]">{niveau.nom}</span>
      </div>
      <div className="text-[10px] text-[#1A1A1A]/50">
        {(niveau.prix_fcfa ?? programPrixFcfa).toLocaleString('fr-FR')} FCFA
      </div>
      <div className="text-[10px] text-[#1A1A1A]/40">
        Seuil: {niveau.seuil_points} pts
      </div>
      {niveau.duree_validite_mois !== undefined && (
        <div className="text-[10px] text-indigo-500 font-medium">
          {niveau.duree_validite_mois} mois
        </div>
      )}
      <div className="text-[10px] text-[#1A1A1A]/40">
        {niveau.avantages.length} avantage{niveau.avantages.length !== 1 ? 's' : ''}
      </div>
    </button>
  )
}

// ── Sous-composant : formulaire nouveau niveau ────────────────────────────────

interface NewNiveauFormProps {
  programPrixFcfa: number
  onAdd: (n: Niveau) => void
  onCancel: () => void
}

function NewNiveauForm({ programPrixFcfa, onAdd, onCancel }: NewNiveauFormProps) {
  const [local, setLocal] = useState<Niveau>({
    id: '',
    nom: '',
    emoji: '🏅',
    couleur: '#C9A84C',
    seuil_points: 0,
    avantages: [],
  })
  const [newAvantage, setNewAvantage] = useState('')

  const set = <K extends keyof Niveau>(key: K, val: Niveau[K]) => setLocal((p) => ({ ...p, [key]: val }))

  const addAvantage = () => {
    if (!newAvantage.trim()) return
    set('avantages', [...local.avantages, newAvantage.trim()])
    setNewAvantage('')
  }

  const handleAdd = () => {
    if (!local.id.trim() || !local.nom.trim()) return
    onAdd(local)
  }

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 space-y-3">
      <p className="text-xs font-semibold text-indigo-800">+ Nouveau niveau</p>
      <div className="grid grid-cols-4 gap-2">
        <div>
          <label className="text-[10px] text-[#1A1A1A]/50 mb-0.5 block">ID *</label>
          <input type="text" value={local.id} onChange={(e) => set('id', e.target.value)}
            placeholder="ex: platinum"
            className="w-full border border-[#F5F0E8] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-400" />
        </div>
        <div>
          <label className="text-[10px] text-[#1A1A1A]/50 mb-0.5 block">Nom *</label>
          <input type="text" value={local.nom} onChange={(e) => set('nom', e.target.value)}
            placeholder="Platine"
            className="w-full border border-[#F5F0E8] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-400" />
        </div>
        <div>
          <label className="text-[10px] text-[#1A1A1A]/50 mb-0.5 block">Emoji</label>
          <input type="text" value={local.emoji} onChange={(e) => set('emoji', e.target.value)}
            className="w-full border border-[#F5F0E8] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-400" />
        </div>
        <div>
          <label className="text-[10px] text-[#1A1A1A]/50 mb-0.5 block">Couleur</label>
          <div className="flex gap-1">
            <input type="color" value={local.couleur} onChange={(e) => set('couleur', e.target.value)}
              className="w-8 h-7 rounded border border-[#F5F0E8] cursor-pointer" />
            <input type="text" value={local.couleur} onChange={(e) => set('couleur', e.target.value)}
              className="flex-1 border border-[#F5F0E8] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-400" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] text-[#1A1A1A]/50 mb-0.5 block">Seuil points</label>
          <input type="number" min={0} value={local.seuil_points} onChange={(e) => set('seuil_points', Number(e.target.value))}
            className="w-full border border-[#F5F0E8] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-400" />
        </div>
        <div>
          <label className="text-[10px] text-[#1A1A1A]/50 mb-0.5 block">Prix FCFA <span className="text-[#C9A84C]/60">(vide = global)</span></label>
          <input type="number" min={0} value={local.prix_fcfa ?? ''}
            onChange={(e) => set('prix_fcfa', e.target.value === '' ? undefined : Number(e.target.value))}
            placeholder={`défaut: ${programPrixFcfa.toLocaleString('fr-FR')}`}
            className="w-full border border-[#F5F0E8] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-400 placeholder-[#1A1A1A]/20" />
        </div>
        <div>
          <label className="text-[10px] text-[#1A1A1A]/50 mb-0.5 block">Durée (mois) <span className="text-[#C9A84C]/60">(vide = globale)</span></label>
          <input type="number" min={1} max={120} value={local.duree_validite_mois ?? ''}
            onChange={(e) => set('duree_validite_mois', e.target.value === '' ? undefined : Number(e.target.value))}
            placeholder="défaut global"
            className="w-full border border-[#F5F0E8] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-400 placeholder-[#1A1A1A]/20" />
        </div>
      </div>
      {/* Avantages */}
      <div>
        <label className="text-[10px] text-[#1A1A1A]/50 mb-1 block">Avantages</label>
        {local.avantages.map((av, idx) => (
          <div key={idx} className="flex items-center gap-1.5 bg-white rounded px-2 py-1 mb-1 border border-[#F5F0E8]">
            <span className="flex-1 text-[11px]">• {av}</span>
            <button onClick={() => set('avantages', local.avantages.filter((_, i) => i !== idx))} className="text-[10px] text-red-400">✕</button>
          </div>
        ))}
        <div className="flex gap-1">
          <input type="text" value={newAvantage} onChange={(e) => setNewAvantage(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAvantage() } }}
            placeholder="Ajouter un avantage..."
            className="flex-1 border border-[#F5F0E8] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-400 placeholder-[#1A1A1A]/30" />
          <button onClick={addAvantage} className="text-xs px-2 py-1.5 bg-[#C9A84C]/10 text-[#C9A84C] rounded-lg hover:bg-[#C9A84C]/20">+ Ajouter</button>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={handleAdd} disabled={!local.id.trim() || !local.nom.trim()}
          className="flex-1 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg disabled:opacity-50 hover:bg-indigo-700 transition-colors">
          + Ajouter ce niveau
        </button>
        <button onClick={onCancel} className="px-4 py-1.5 bg-[#F5F0E8] text-[#1A1A1A]/60 text-xs rounded-lg">Annuler</button>
      </div>
    </div>
  )
}

// ── Sous-composant : bloc d'un programme ─────────────────────────────────────

interface ProgramBlockProps {
  program: LoyaltyProgram
  onUpdated: (updated: LoyaltyProgram) => void
}

function ProgramBlock({ program, onUpdated }: ProgramBlockProps) {
  // Settings globaux
  const [prix, setPrix] = useState(program.prix_fcfa)
  const [duree, setDuree] = useState(program.duree_validite_mois)
  const [commission, setCommission] = useState(program.commission_lui_percent)
  const [taux, setTaux] = useState(program.taux_fcfa_par_point ?? 10000)
  const [nom, setNom] = useState(program.nom)
  const [description, setDescription] = useState(program.description ?? '')
  const [savingGlobal, setSavingGlobal] = useState(false)
  const [msgGlobal, setMsgGlobal] = useState('')

  // Niveaux
  const [niveaux, setNiveaux] = useState<Niveau[]>(program.niveaux)
  const [expandedNiveauId, setExpandedNiveauId] = useState<string | null>(null)
  const [savingNiveauId, setSavingNiveauId] = useState<string | null>(null)
  const [showNewNiveau, setShowNewNiveau] = useState(false)

  // Statut
  const [statut, setStatut] = useState<LoyaltyProgram['statut']>(program.statut)
  const [savingStatut, setSavingStatut] = useState(false)

  // ── Patch helper ──────────────────────────────────────────────────────────

  const patchProgram = useCallback(async (updates: Record<string, unknown>) => {
    const res = await fetch('/api/admin/loyalty-programs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ program_id: program.program_id, ...updates }),
    })
    const data = await res.json() as { success: boolean; error?: string }
    return data
  }, [program.program_id])

  // ── Sauvegarde settings globaux ───────────────────────────────────────────

  const handleSaveGlobal = async () => {
    setSavingGlobal(true)
    setMsgGlobal('')
    const data = await patchProgram({
      nom,
      description,
      prix_fcfa: prix,
      duree_validite_mois: duree,
      commission_lui_percent: commission,
      taux_fcfa_par_point: taux,
    })
    if (data.success) {
      setMsgGlobal('✅ Sauvegardé')
      onUpdated({ ...program, nom, description, prix_fcfa: prix, duree_validite_mois: duree, commission_lui_percent: commission, commission_partner_percent: 100 - commission, taux_fcfa_par_point: taux })
    } else {
      setMsgGlobal('❌ ' + (data.error ?? 'Erreur'))
    }
    setSavingGlobal(false)
    setTimeout(() => setMsgGlobal(''), 3000)
  }

  // ── Toggle statut ─────────────────────────────────────────────────────────

  const handleToggleStatut = async (newStatut: LoyaltyProgram['statut']) => {
    setSavingStatut(true)
    const data = await patchProgram({ statut: newStatut })
    if (data.success) {
      setStatut(newStatut)
      onUpdated({ ...program, statut: newStatut })
    }
    setSavingStatut(false)
  }

  // ── Sauvegarde un niveau ──────────────────────────────────────────────────

  const handleSaveNiveau = async (idx: number, updated: Niveau) => {
    const newNiveaux = niveaux.map((n, i) => i === idx ? updated : n)
    setSavingNiveauId(updated.id)
    const data = await patchProgram({ niveaux: newNiveaux })
    if (data.success) {
      setNiveaux(newNiveaux)
      onUpdated({ ...program, niveaux: newNiveaux })
    }
    setSavingNiveauId(null)
  }

  // ── Supprimer un niveau ───────────────────────────────────────────────────

  const handleDeleteNiveau = async (idx: number) => {
    const newNiveaux = niveaux.filter((_, i) => i !== idx)
    const data = await patchProgram({ niveaux: newNiveaux })
    if (data.success) {
      setNiveaux(newNiveaux)
      setExpandedNiveauId(null)
      onUpdated({ ...program, niveaux: newNiveaux })
    }
  }

  // ── Ajouter un niveau ─────────────────────────────────────────────────────

  const handleAddNiveau = async (n: Niveau) => {
    const newNiveaux = [...niveaux, n]
    const data = await patchProgram({ niveaux: newNiveaux })
    if (data.success) {
      setNiveaux(newNiveaux)
      setShowNewNiveau(false)
      setExpandedNiveauId(n.id)
      onUpdated({ ...program, niveaux: newNiveaux })
    }
  }

  return (
    <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4 space-y-4">
      {/* En-tête programme */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="w-full text-xs font-semibold text-indigo-900 bg-transparent border-b border-transparent hover:border-indigo-200 focus:border-indigo-400 focus:outline-none py-0.5 transition-colors"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description..."
            className="w-full text-[11px] text-indigo-600/70 bg-transparent border-b border-transparent hover:border-indigo-200 focus:border-indigo-400 focus:outline-none py-0.5 transition-colors mt-0.5 placeholder-indigo-300"
          />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {statutBadge(statut)}
        </div>
      </div>

      {/* Toggle statut */}
      <div className="flex gap-1">
        {(['DRAFT', 'ACTIVE', 'PAUSED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => handleToggleStatut(s)}
            disabled={statut === s || savingStatut}
            className={`text-[10px] px-2 py-1 rounded-lg transition-colors disabled:cursor-default ${
              statut === s
                ? s === 'ACTIVE' ? 'bg-green-100 text-green-700 font-semibold'
                  : s === 'PAUSED' ? 'bg-yellow-100 text-yellow-700 font-semibold'
                  : 'bg-gray-100 text-gray-600 font-semibold'
                : 'bg-white text-[#1A1A1A]/40 hover:text-[#1A1A1A]/70 border border-[#F5F0E8]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Settings globaux */}
      <div>
        <p className="text-[10px] font-semibold text-indigo-800 uppercase tracking-wide mb-2">⚙️ Paramètres globaux</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div>
            <label className="text-[10px] text-[#1A1A1A]/50 mb-0.5 block">Prix FCFA</label>
            <input type="number" min={0} value={prix} onChange={(e) => setPrix(Number(e.target.value))}
              className="w-full border border-[#F5F0E8] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-300 bg-white" />
          </div>
          <div>
            <label className="text-[10px] text-[#1A1A1A]/50 mb-0.5 block">Durée (mois)</label>
            <input type="number" min={1} max={120} value={duree} onChange={(e) => setDuree(Number(e.target.value))}
              className="w-full border border-[#F5F0E8] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-300 bg-white" />
          </div>
          <div>
            <label className="text-[10px] text-[#1A1A1A]/50 mb-0.5 block">Commission L&amp;Lui (%)</label>
            <input type="number" min={0} max={100} value={commission} onChange={(e) => setCommission(Number(e.target.value))}
              className="w-full border border-[#F5F0E8] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-300 bg-white" />
          </div>
          <div>
            <label className="text-[10px] text-[#1A1A1A]/50 mb-0.5 block">FCFA / point</label>
            <input type="number" min={500} step={500} value={taux} onChange={(e) => setTaux(Number(e.target.value))}
              className="w-full border border-[#F5F0E8] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-300 bg-white" />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <button onClick={handleSaveGlobal} disabled={savingGlobal}
            className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg disabled:opacity-60 hover:bg-indigo-700 transition-colors">
            {savingGlobal ? '...' : '💾 Sauvegarder'}
          </button>
          {msgGlobal && (
            <span className={`text-[11px] ${msgGlobal.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{msgGlobal}</span>
          )}
          <span className="text-[10px] text-indigo-600/60 ml-auto">
            Partenaire reçoit {100 - commission}% · {prix > 0 ? Math.round(prix * (100 - commission) / 100).toLocaleString('fr-FR') + ' FCFA/carte' : '—'}
          </span>
        </div>
      </div>

      {/* Niveaux */}
      <div>
        <p className="text-[10px] font-semibold text-indigo-800 uppercase tracking-wide mb-2">🏆 Niveaux ({niveaux.length})</p>
        <div className={`grid gap-2 ${niveaux.length <= 2 ? 'grid-cols-2' : niveaux.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
          {niveaux.map((n) => (
            <NiveauCard
              key={n.id}
              niveau={n}
              programPrixFcfa={prix}
              selected={expandedNiveauId === n.id}
              onClick={() => setExpandedNiveauId(expandedNiveauId === n.id ? null : n.id)}
            />
          ))}
        </div>

        {/* Éditeur du niveau sélectionné */}
        {expandedNiveauId !== null && (() => {
          const idx = niveaux.findIndex((n) => n.id === expandedNiveauId)
          if (idx === -1) return null
          return (
            <NiveauEditor
              key={expandedNiveauId}
              niveau={niveaux[idx]}
              programPrixFcfa={prix}
              saving={savingNiveauId === niveaux[idx].id}
              onSave={(updated) => handleSaveNiveau(idx, updated)}
              onDelete={() => handleDeleteNiveau(idx)}
            />
          )
        })()}

        {/* Formulaire nouveau niveau */}
        {showNewNiveau ? (
          <NewNiveauForm
            programPrixFcfa={prix}
            onAdd={handleAddNiveau}
            onCancel={() => setShowNewNiveau(false)}
          />
        ) : (
          <button
            onClick={() => setShowNewNiveau(true)}
            className="w-full mt-2 py-1.5 border border-dashed border-indigo-200 text-[11px] text-indigo-500 rounded-lg hover:border-indigo-400 hover:text-indigo-700 transition-colors"
          >
            + Ajouter un niveau
          </button>
        )}
      </div>
    </div>
  )
}

// ── Sous-composant : formulaire nouveau programme ─────────────────────────────

interface NewProgramFormProps {
  partenaireId: string
  partenaireName: string
  onCreated: (prog: LoyaltyProgram) => void
  onCancel: () => void
}

function NewProgramForm({ partenaireId, partenaireName, onCreated, onCancel }: NewProgramFormProps) {
  const [nom, setNom] = useState('')
  const [description, setDescription] = useState('')
  const [prix, setPrix] = useState(5000)
  const [duree, setDuree] = useState(12)
  const [commission, setCommission] = useState(20)
  const [taux, setTaux] = useState(10000)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!nom.trim()) { setError('Le nom est requis'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/loyalty-programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partenaire_id: partenaireId,
          partenaire_name: partenaireName,
          nom: nom.trim(),
          description: description.trim() || undefined,
          prix_fcfa: prix,
          duree_validite_mois: duree,
          commission_lui_percent: commission,
          taux_fcfa_par_point: taux,
          niveaux: DEFAULT_NIVEAUX,
        }),
      })
      const data = await res.json() as { success: boolean; program?: LoyaltyProgram; error?: string }
      if (data.success && data.program) {
        onCreated(data.program)
      } else {
        setError(data.error ?? 'Erreur lors de la création')
      }
    } catch {
      setError('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-[#C9A84C]/5 border border-[#C9A84C]/30 rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-[#C9A84C]">✨ Nouveau programme de fidélité</p>
      {error && <p className="text-[11px] text-red-500">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="sm:col-span-2">
          <label className="text-[10px] text-[#1A1A1A]/50 mb-0.5 block">Nom du programme *</label>
          <input type="text" value={nom} onChange={(e) => setNom(e.target.value)}
            placeholder="ex: Carte Fidélité Hôtel Lagon"
            className="w-full border border-[#F5F0E8] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#C9A84C]" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-[10px] text-[#1A1A1A]/50 mb-0.5 block">Description</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="ex: Carte pour clients réguliers de l'établissement"
            className="w-full border border-[#F5F0E8] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#C9A84C]" />
        </div>
        <div>
          <label className="text-[10px] text-[#1A1A1A]/50 mb-0.5 block">Prix FCFA</label>
          <input type="number" min={0} value={prix} onChange={(e) => setPrix(Number(e.target.value))}
            className="w-full border border-[#F5F0E8] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#C9A84C]" />
        </div>
        <div>
          <label className="text-[10px] text-[#1A1A1A]/50 mb-0.5 block">Durée (mois)</label>
          <input type="number" min={1} max={120} value={duree} onChange={(e) => setDuree(Number(e.target.value))}
            className="w-full border border-[#F5F0E8] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#C9A84C]" />
        </div>
        <div>
          <label className="text-[10px] text-[#1A1A1A]/50 mb-0.5 block">Commission L&amp;Lui (%)</label>
          <input type="number" min={0} max={100} value={commission} onChange={(e) => setCommission(Number(e.target.value))}
            className="w-full border border-[#F5F0E8] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#C9A84C]" />
        </div>
        <div>
          <label className="text-[10px] text-[#1A1A1A]/50 mb-0.5 block">FCFA par point</label>
          <input type="number" min={500} step={500} value={taux} onChange={(e) => setTaux(Number(e.target.value))}
            className="w-full border border-[#F5F0E8] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#C9A84C]" />
        </div>
      </div>

      <p className="text-[10px] text-[#1A1A1A]/40">
        3 niveaux prédéfinis seront créés : Bronze 🤍 · Argent 🩷 · Or 💎 — modifiables après création.
      </p>

      <div className="flex gap-2">
        <button onClick={handleCreate} disabled={saving || !nom.trim()}
          className="flex-1 py-2 bg-[#C9A84C] text-[#1A1A1A] text-xs font-bold rounded-lg disabled:opacity-50 hover:bg-[#b8963e] transition-colors">
          {saving ? '...' : '✨ Créer le programme'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 bg-[#F5F0E8] text-[#1A1A1A]/60 text-xs rounded-lg">Annuler</button>
      </div>
    </div>
  )
}

// ── Composant principal exporté ───────────────────────────────────────────────

interface LoyaltyProgramPanelProps {
  partenaireId: string
  partenaireName: string
}

export default function LoyaltyProgramPanel({ partenaireId, partenaireName }: LoyaltyProgramPanelProps) {
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showNewProgram, setShowNewProgram] = useState(false)

  const loadPrograms = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/loyalty-programs?partenaire_id=${encodeURIComponent(partenaireId)}`)
      const data = await res.json() as { programs: LoyaltyProgram[] }
      setPrograms(data.programs ?? [])
    } catch {
      setError('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [partenaireId])

  useEffect(() => {
    void loadPrograms()
  }, [loadPrograms])

  const handleUpdated = (updated: LoyaltyProgram) => {
    setPrograms((prev) => prev.map((p) => p.program_id === updated.program_id ? updated : p))
  }

  const handleCreated = (prog: LoyaltyProgram) => {
    setPrograms((prev) => [...prev, prog])
    setShowNewProgram(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-xs text-red-500 text-center py-4">
        {error} — <button onClick={() => void loadPrograms()} className="underline hover:no-underline">Réessayer</button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {programs.length === 0 && !showNewProgram && (
        <p className="text-xs text-[#1A1A1A]/40 text-center py-3">
          Aucun programme de fidélité configuré pour ce partenaire.
        </p>
      )}

      {programs.map((prog) => (
        <ProgramBlock
          key={prog.program_id}
          program={prog}
          onUpdated={handleUpdated}
        />
      ))}

      {showNewProgram ? (
        <NewProgramForm
          partenaireId={partenaireId}
          partenaireName={partenaireName}
          onCreated={handleCreated}
          onCancel={() => setShowNewProgram(false)}
        />
      ) : (
        <button
          onClick={() => setShowNewProgram(true)}
          className="w-full py-2.5 border border-dashed border-[#C9A84C]/40 text-xs text-[#C9A84C] rounded-xl hover:border-[#C9A84C] hover:bg-[#C9A84C]/5 transition-colors"
        >
          + Créer nouveau programme de fidélité
        </button>
      )}
    </div>
  )
}
