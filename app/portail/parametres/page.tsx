'use client'
// app/portail/parametres/page.tsx — Paramétrage du mariage par les mariés

import { useState, useEffect } from 'react'
import { useClientIdentity } from '@/hooks/useClientIdentity'
import UploadPhotoMariage from '@/components/portail/upload/UploadPhotoMariage'

function getUid() {
  if (typeof document === 'undefined') return ''
  return decodeURIComponent(document.cookie.match(/portail_uid=([^;]+)/)?.[1] ?? '')
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n))
}

const CATEGORIES = [
  { key: 'traiteur', label: 'Traiteur' },
  { key: 'hebergement', label: 'Hébergement' },
  { key: 'decoration', label: 'Décoration' },
  { key: 'photographie', label: 'Photographie & Vidéo' },
  { key: 'beaute', label: 'Beauté & Bien-être' },
  { key: 'technique', label: 'Technique, Son & Lumière' },
  { key: 'musique', label: 'Musique & Animation' },
  { key: 'maitre_ceremonies', label: 'Maître des cérémonies' },
  { key: 'transport', label: 'Transport & Navettes' },
  { key: 'cadeaux', label: 'Cadeaux invités' },
  { key: 'vins', label: 'Vins & Spiritueux' },
  { key: 'autres', label: 'Autres' },
]

interface BudgetCat { [key: string]: number }

const CAT_COLORS: Record<string, string> = {
  traiteur:          '#E8744A',
  hebergement:       '#4A90D9',
  decoration:        '#C96FB0',
  photographie:      '#7C9A7E',
  beaute:            '#D4A5C9',
  technique:         '#5B6FA6',
  musique:           '#F0A500',
  maitre_ceremonies: '#A0522D',
  transport:         '#6B8E8E',
  cadeaux:           '#E74C3C',
  vins:              '#8E44AD',
  autres:            '#888888',
}

export default function ParametresPage() {
  const [uid] = useState(() => getUid())
  const identity = useClientIdentity()
  const [nbInvites, setNbInvites] = useState('')
  const [budgetGlobal, setBudgetGlobal] = useState('')
  const [cats, setCats] = useState<BudgetCat>({})
  const [budgetReel, setBudgetReel] = useState<BudgetCat>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  // #187 Thème visuel
  const [couleurPrimaire, setCouleurPrimaire] = useState('#C9A84C')
  const [couleurSecondaire, setCouleurSecondaire] = useState('#F5F0E8')

  // Charger les données existantes
  useEffect(() => {
    if (!uid) return
    setLoading(true)
    fetch(`/api/portail/user?uid=${uid}`)
      .then(r => r.json())
      .then(d => {
        if (d.nombre_invites_prevu) setNbInvites(String(d.nombre_invites_prevu))
        if (d.budget_previsionnel) setBudgetGlobal(String(d.budget_previsionnel))
      })
      .finally(() => setLoading(false))
    // Charger budget_categories depuis un endpoint dédié
    fetch(`/api/portail/parametres?uid=${uid}`)
      .then(r => r.json())
      .then(d => {
        if (d.budget_categories) setCats(d.budget_categories)
      })
      .catch(() => {})
    // Charger budget réel (depuis prestataires)
    fetch('/api/portail/budget-reel')
      .then(r => r.json())
      .then(d => { if (d.budget_reel) setBudgetReel(d.budget_reel) })
      .catch(() => {})
  }, [uid])

  const totalAlloue = Object.values(cats).reduce((s, v) => s + (Number(v) || 0), 0)
  const budgetNum = Number(budgetGlobal) || 0
  const resteAAllouer = budgetNum - totalAlloue
  const overBudget = totalAlloue > budgetNum && budgetNum > 0

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uid) return
    setSaving(true)
    try {
      const res = await fetch('/api/portail/update-parametres', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nb_invites_prevus: Number(nbInvites) || 0,
          budget_total: Number(budgetGlobal) || 0,
          budget_categories: cats,
          couleur_primaire: couleurPrimaire,
          couleur_secondaire: couleurSecondaire,
        }),
      })
      if (res.ok) showToast('Paramètres enregistrés ✓')
      else showToast('Erreur lors de la sauvegarde')
    } catch {
      showToast('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  const setCat = (key: string, val: string) => {
    setCats(prev => ({ ...prev, [key]: Number(val) || 0 }))
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 flex justify-center items-center min-h-[200px]">
        <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 pb-20">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white text-sm px-4 py-2.5 rounded-xl shadow-lg text-center max-w-xs">
          {toast}
        </div>
      )}

      {/* Header */}
      <div>
        <a href="/portail" className="text-xs text-[#C9A84C] block mb-1">← Retour au dashboard</a>
        <h1 className="font-serif italic text-2xl text-[#1A1A1A]">Paramètres de mon mariage</h1>
        {identity.noms_maries && identity.noms_maries !== 'Mon mariage' && (
          <p className="text-sm text-[#888] mt-0.5">{identity.noms_maries}</p>
        )}
      </div>

      {/* SECTION 0 — Photo de mariage */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F5F0E8]">
        <p className="font-semibold text-sm text-[#1A1A1A] mb-1">📸 Photo de mariage</p>
        <p className="text-xs text-[#888] mb-4">
          Cette photo s&apos;affichera en arrière-plan de votre hero dashboard et en miniature dans le menu
        </p>
        <UploadPhotoMariage
          currentPhotoUrl={identity.photo_url || undefined}
          onUploaded={url => {
            // Forcer une re-lecture de l'identité pour mettre à jour le hero
            void url
          }}
        />
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* SECTION A — Informations générales */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F5F0E8]">
          <p className="font-semibold text-sm text-[#1A1A1A] mb-4">A — Informations générales</p>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[#888] block mb-1.5">Nombre d&apos;invités prévus</label>
              <input
                type="number"
                value={nbInvites}
                onChange={e => setNbInvites(e.target.value)}
                placeholder="ex: 150"
                min="0"
                className="w-full border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]"
              />
            </div>
            <div>
              <label className="text-xs text-[#888] block mb-1.5">Budget global total (FCFA)</label>
              <input
                type="number"
                value={budgetGlobal}
                onChange={e => setBudgetGlobal(e.target.value)}
                placeholder="ex: 7000000"
                min="0"
                className="w-full border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]"
              />
            </div>
          </div>
        </div>

        {/* SECTION B — Budget prévisionnel par catégorie */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F5F0E8]">
          <p className="font-semibold text-sm text-[#1A1A1A] mb-1">B — Budget prévisionnel par catégorie</p>
          <p className="text-xs text-[#888] mb-4">Répartissez votre budget global entre les postes de dépenses</p>

          {/* Barre de progression */}
          {budgetNum > 0 && (
            <div className="mb-4 p-3 rounded-xl" style={{ background: overBudget ? '#FFF1F1' : '#F5F0E8' }}>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[#888]">Total alloué</span>
                <span className="font-semibold" style={{ color: overBudget ? '#C0392B' : '#1A1A1A' }}>
                  {fmt(totalAlloue)} FCFA
                </span>
              </div>
              <div className="w-full bg-white rounded-full h-2 mb-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (totalAlloue / budgetNum) * 100)}%`,
                    background: overBudget ? '#C0392B' : '#C9A84C',
                  }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#888]">Budget total : {fmt(budgetNum)} FCFA</span>
                <span style={{ color: overBudget ? '#C0392B' : '#7C9A7E' }} className="font-medium">
                  {overBudget ? `Dépassement : ${fmt(Math.abs(resteAAllouer))} FCFA` : `Reste : ${fmt(resteAAllouer)} FCFA`}
                </span>
              </div>
              {overBudget && (
                <p className="text-[11px] text-red-600 mt-1.5">⚠️ Le total alloué dépasse votre budget global</p>
              )}
            </div>
          )}

          <div className="space-y-3">
            {CATEGORIES.map(cat => (
              <div key={cat.key} className="flex items-center gap-3">
                <label className="flex-1 text-sm text-[#1A1A1A]">{cat.label}</label>
                <div className="relative w-36">
                  <input
                    type="number"
                    value={cats[cat.key] ?? ''}
                    onChange={e => setCat(cat.key, e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C] text-right pr-14"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#888] pointer-events-none">FCFA</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION #187 — Thème visuel */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F5F0E8]">
          <p className="font-semibold text-sm text-[#1A1A1A] mb-1">🎨 Thème visuel personnalisé</p>
          <p className="text-xs text-[#888] mb-4">Choisissez les couleurs de votre espace marié</p>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs text-[#888] block mb-1.5">Couleur principale</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={couleurPrimaire}
                  onChange={e => setCouleurPrimaire(e.target.value)}
                  className="w-10 h-10 rounded-xl border border-[#E8E0D0] cursor-pointer p-0.5"
                />
                <span className="text-xs font-mono text-[#888]">{couleurPrimaire}</span>
              </div>
            </div>
            <div className="flex-1">
              <label className="text-xs text-[#888] block mb-1.5">Couleur de fond</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={couleurSecondaire}
                  onChange={e => setCouleurSecondaire(e.target.value)}
                  className="w-10 h-10 rounded-xl border border-[#E8E0D0] cursor-pointer p-0.5"
                />
                <span className="text-xs font-mono text-[#888]">{couleurSecondaire}</span>
              </div>
            </div>
          </div>
          <div className="mt-3 rounded-xl p-3 flex items-center gap-3"
            style={{ background: couleurSecondaire, border: `1px solid ${couleurPrimaire}30` }}>
            <div className="w-6 h-6 rounded-full" style={{ background: couleurPrimaire }} />
            <span className="text-xs" style={{ color: couleurPrimaire }}>Aperçu de votre thème</span>
          </div>
        </div>

        {/* Bouton enregistrer */}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
          style={{ background: '#C9A84C' }}
        >
          {saving ? 'Enregistrement…' : '✓ Enregistrer mes paramètres'}
        </button>
      </form>

      {/* SECTION C — Budget prévisionnel vs réel */}
      {(Object.keys(cats).length > 0 || Object.keys(budgetReel).length > 0) && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F5F0E8]">
          <p className="font-semibold text-sm text-[#1A1A1A] mb-1">C — Prévisionnel vs Réel</p>
          <p className="text-xs text-[#888] mb-4">Comparaison par catégorie · Or = prévisionnel · Couleur = engagé</p>

          {/* Légende */}
          <div className="flex gap-4 mb-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#C9A84C' }} />
              <span className="text-[11px] text-[#888]">Prévisionnel</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#4A90D9' }} />
              <span className="text-[11px] text-[#888]">Réel engagé</span>
            </div>
          </div>

          <div className="space-y-4">
            {CATEGORIES.map(cat => {
              const prev = Number(cats[cat.key]) || 0
              const reel = Number(budgetReel[cat.key]) || 0
              if (prev === 0 && reel === 0) return null
              const maxVal = Math.max(prev, reel, 1)
              const prevPct = Math.min(100, (prev / maxVal) * 100)
              const reelPct = Math.min(100, (reel / maxVal) * 100)
              const isOver = reel > prev * 1.10 && prev > 0
              const catColor = CAT_COLORS[cat.key] ?? '#888'

              return (
                <div key={cat.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#1A1A1A] font-medium">{cat.label}</span>
                    {isOver && (
                      <span className="text-[10px] text-red-600 font-medium">
                        ⚠️ +{fmt(Math.round(((reel / prev) - 1) * 100))}%
                      </span>
                    )}
                  </div>
                  {/* Double barre */}
                  <div className="space-y-1">
                    {prev > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-14 text-right text-[10px] text-[#888] shrink-0">{fmt(prev)}</div>
                        <div className="flex-1 bg-[#F5F0E8] rounded-full h-2 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${prevPct}%`, background: '#C9A84C' }} />
                        </div>
                      </div>
                    )}
                    {reel > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-14 text-right text-[10px] shrink-0" style={{ color: isOver ? '#C0392B' : catColor }}>
                          {fmt(reel)}
                        </div>
                        <div className="flex-1 bg-[#F5F0E8] rounded-full h-2 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${reelPct}%`, background: isOver ? '#C0392B' : catColor }} />
                        </div>
                      </div>
                    )}
                  </div>
                  {isOver && (
                    <p className="text-[10px] text-red-600 mt-0.5">
                      Dépassement de {fmt(reel - prev)} FCFA ({fmt(Math.round(((reel / prev) - 1) * 100))}% au-dessus de l&apos;estimation)
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Totaux */}
          <div className="mt-4 pt-3 border-t border-[#F5F0E8] flex justify-between text-xs">
            <span className="text-[#888]">Total prévisionnel : <strong className="text-[#C9A84C]">{fmt(totalAlloue)} FCFA</strong></span>
            <span className="text-[#888]">Total réel : <strong style={{ color: Object.values(budgetReel).reduce((s, v) => s + v, 0) > totalAlloue ? '#C0392B' : '#1A1A1A' }}>
              {fmt(Object.values(budgetReel).reduce((s, v) => s + v, 0))} FCFA
            </strong></span>
          </div>
        </div>
      )}
    </div>
  )
}
