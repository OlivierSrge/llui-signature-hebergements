'use client'
// components/mariage-traditionnel/MariageTraditionnelClient.tsx — #64 Module dot/mariage coutumier

import { useState } from 'react'

interface DotItem {
  id: string
  label: string
  quantite?: string
  categorie: 'vivres' | 'tissus' | 'boissons' | 'argent' | 'autres'
  fourni: boolean
  note?: string
}

interface Props {
  marie_uid: string
  noms_maries: string
  date_mariage: string
  lieu: string
  traditionnel: Record<string, unknown>
}

type TabId = 'dot' | 'civil' | 'religieux'

const DOT_DEFAULTS: DotItem[] = [
  { id: 'd1', label: 'Pagnes de luxe (pour la belle-mère)', quantite: '5 pièces', categorie: 'tissus', fourni: false },
  { id: 'd2', label: 'Pagnes pour les tantes et sœurs', quantite: '10 pièces', categorie: 'tissus', fourni: false },
  { id: 'd3', label: 'Sacs à main (femmes de la famille)', quantite: '5 pièces', categorie: 'autres', fourni: false },
  { id: 'd4', label: 'Chaussures (femmes de la famille)', quantite: '5 paires', categorie: 'autres', fourni: false },
  { id: 'd5', label: 'Vin rouge (bouteilles)', quantite: '12 bouteilles', categorie: 'boissons', fourni: false },
  { id: 'd6', label: 'Whisky (bouteilles)', quantite: '6 bouteilles', categorie: 'boissons', fourni: false },
  { id: 'd7', label: 'Bières (caisses)', quantite: '4 caisses', categorie: 'boissons', fourni: false },
  { id: 'd8', label: 'Sac de riz (50kg)', quantite: '2 sacs', categorie: 'vivres', fourni: false },
  { id: 'd9', label: 'Huile de palme (5L)', quantite: '5 bidons', categorie: 'vivres', fourni: false },
  { id: 'd10', label: 'Sucre (5kg)', quantite: '5 paquets', categorie: 'vivres', fourni: false },
  { id: 'd11', label: 'Macabo / ignames', quantite: '2 paniers', categorie: 'vivres', fourni: false },
  { id: 'd12', label: 'Dot en argent (négociée)', quantite: 'À définir', categorie: 'argent', fourni: false },
  { id: 'd13', label: 'Tailleur pour le beau-père', quantite: '1 pièce', categorie: 'tissus', fourni: false },
  { id: 'd14', label: 'Valise avec effets personnels', quantite: '1 valise', categorie: 'autres', fourni: false },
]

const CIVIL_STEPS = [
  { step: 1, label: 'Réunion familles — présentation officielle', detail: 'Les deux familles se rencontrent formellement', done: false },
  { step: 2, label: 'Remise de la liste de dot', detail: "La famille de la mariée communique la liste à la famille du marié", done: false },
  { step: 3, label: 'Négociation et accord sur la dot', detail: 'Discussion entre les deux familles — durée variable', done: false },
  { step: 4, label: 'Cérémonie de dot officielle', detail: 'Remise des biens et de la dot en présence des deux familles', done: false },
  { step: 5, label: 'Bénédictions et libations', detail: 'Rites traditionnels selon la culture (prière ancêtres, libation eau/vin)', done: false },
  { step: 6, label: "Remise de la mariée à l'époux", detail: 'Symbole de l\'union entre les deux familles', done: false },
]

const RELIGIEUX_STEPS = [
  { step: 1, label: 'Publication des bans (×3 dimanches)', detail: 'Annonce officielle à la paroisse', done: false },
  { step: 2, label: 'Cours de préparation au mariage', detail: '6 séances minimum (selon la paroisse)', done: false },
  { step: 3, label: 'Certificat de baptême (moins de 3 mois)', detail: 'Les deux époux', done: false },
  { step: 4, label: 'Acte de mariage civil (pré-requis)', detail: 'Le mariage religieux nécessite le civil en amont', done: false },
  { step: 5, label: "Répétition de la cérémonie (J-1 ou J-3)", detail: 'Avec le prêtre/pasteur et les témoins', done: false },
  { step: 6, label: 'Cérémonie religieuse', detail: 'Échange des vœux, bénédiction nuptiale, signature des registres', done: false },
]

const CATEGORIE_COLORS: Record<string, string> = {
  vivres: '#7C9A7E', tissus: '#9B7ED4', boissons: '#5B8FBF', argent: '#C9A84C', autres: '#C0392B'
}
const CATEGORIE_LABELS: Record<string, string> = {
  vivres: '🌾 Vivres', tissus: '👗 Tissus', boissons: '🍾 Boissons', argent: '💰 Argent', autres: '📦 Autres'
}

function formatDate(iso: string) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return iso }
}

export default function MariageTraditionnelClient({ marie_uid, noms_maries, date_mariage }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('dot')
  const [dotItems, setDotItems] = useState<DotItem[]>(DOT_DEFAULTS)
  const [civilDone, setCivilDone] = useState<Record<number, boolean>>({})
  const [religiDone, setReligiDone] = useState<Record<number, boolean>>({})
  const [dotFamille, setDotFamille] = useState<'marie' | 'mariee'>('marie')
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)

  const dotFournis = dotItems.filter(i => i.fourni).length
  const civilFait = Object.values(civilDone).filter(Boolean).length
  const religieuFait = Object.values(religiDone).filter(Boolean).length

  function toggleDot(id: string) {
    setDotItems(items => items.map(item => item.id === id ? { ...item, fourni: !item.fourni } : item))
  }

  async function sauvegarder() {
    setSaving(true)
    try {
      await fetch(`/api/portail/mariage-traditionnel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marie_uid,
          dot_items: dotItems,
          civil_done: civilDone,
          religi_done: religiDone,
        }),
      })
      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 2500)
    } catch { /* ignore */ }
    setSaving(false)
  }

  const tabs = [
    { id: 'dot' as TabId, label: 'Dot', emoji: '💍', progress: `${dotFournis}/${dotItems.length}` },
    { id: 'civil' as TabId, label: 'Civil', emoji: '🏛️', progress: `${civilFait}/${CIVIL_STEPS.length}` },
    { id: 'religieux' as TabId, label: 'Religieux', emoji: '⛪', progress: `${religieuFait}/${RELIGIEUX_STEPS.length}` },
  ]

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: '#FAF6EE' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#C9A84C] mb-2">MARIAGE TRADITIONNEL</p>
          <h1 className="text-2xl font-serif text-[#1A1A1A]">{noms_maries || 'Les Mariés'}</h1>
          <p className="text-sm text-[#888] mt-1">{formatDate(date_mariage)}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-2xl mb-5" style={{ background: '#F0EBE0' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: activeTab === tab.id ? '#1A1A1A' : 'transparent',
                color: activeTab === tab.id ? '#C9A84C' : '#888',
              }}
            >
              {tab.emoji} {tab.label}
              <span className="block text-[9px] mt-0.5 opacity-60">{tab.progress}</span>
            </button>
          ))}
        </div>

        {/* TAB DOT */}
        {activeTab === 'dot' && (
          <div className="space-y-4">
            {/* Espace famille */}
            <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: '1px solid #F5F0E8' }}>
              <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-3">Vue de la famille</p>
              <div className="flex gap-2">
                {[
                  { key: 'marie', label: "Famille du marié", detail: "Ce que nous apportons" },
                  { key: 'mariee', label: "Famille de la mariée", detail: "Ce que nous recevons" },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setDotFamille(f.key as 'marie' | 'mariee')}
                    className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold text-left transition-all"
                    style={{
                      background: dotFamille === f.key ? '#1A1A1A' : '#F5F0E8',
                      color: dotFamille === f.key ? '#C9A84C' : '#888',
                    }}
                  >
                    <div>{f.label}</div>
                    <div className="text-[9px] mt-0.5 opacity-60">{f.detail}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Progress dot */}
            <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: '1px solid #F5F0E8' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[#888]">Éléments préparés</p>
                <p className="text-xs font-bold text-[#C9A84C]">{dotFournis}/{dotItems.length}</p>
              </div>
              <div className="bg-[#F5F0E8] rounded-full h-2">
                <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${(dotFournis / dotItems.length) * 100}%`, background: '#C9A84C' }} />
              </div>
            </div>

            {/* Liste dot par catégorie */}
            {(['vivres', 'tissus', 'boissons', 'argent', 'autres'] as const).map(cat => {
              const items = dotItems.filter(i => i.categorie === cat)
              const color = CATEGORIE_COLORS[cat]
              return (
                <div key={cat} className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${color}22` }}>
                  <div className="px-4 py-2.5 text-xs font-bold" style={{ background: color + '15', color }}>
                    {CATEGORIE_LABELS[cat]} — {items.filter(i => i.fourni).length}/{items.length}
                  </div>
                  <div className="bg-white divide-y divide-[#F5F0E8]">
                    {items.map(item => (
                      <label key={item.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer">
                        <div
                          className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all"
                          style={{ borderColor: item.fourni ? color : '#DDD', background: item.fourni ? color : 'white' }}
                          onClick={() => toggleDot(item.id)}
                        >
                          {item.fourni && <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-[#1A1A1A]" style={{ textDecoration: item.fourni ? 'line-through' : 'none', opacity: item.fourni ? 0.5 : 1 }}>
                            {item.label}
                          </p>
                          {item.quantite && <p className="text-[10px] text-[#AAA]">{item.quantite}</p>}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* TAB CIVIL */}
        {activeTab === 'civil' && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm text-sm text-[#666]" style={{ border: '1px solid #F5F0E8' }}>
              <p>📋 Checklist des étapes de la dot et de la cérémonie coutumière. Cochez au fur et à mesure de l'avancement.</p>
            </div>
            {CIVIL_STEPS.map(s => (
              <label key={s.step} className="flex items-start gap-3 bg-white rounded-2xl p-4 cursor-pointer shadow-sm" style={{ border: '1px solid #F5F0E8' }}>
                <div
                  className="mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                  style={{ borderColor: civilDone[s.step] ? '#7C9A7E' : '#DDD', background: civilDone[s.step] ? '#7C9A7E' : 'white' }}
                  onClick={() => setCivilDone(prev => ({ ...prev, [s.step]: !prev[s.step] }))}
                >
                  {civilDone[s.step] && <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#C9A84C]">Étape {s.step}</span>
                  </div>
                  <p className="text-sm font-semibold text-[#1A1A1A] mt-0.5" style={{ textDecoration: civilDone[s.step] ? 'line-through' : 'none', opacity: civilDone[s.step] ? 0.5 : 1 }}>
                    {s.label}
                  </p>
                  <p className="text-[11px] text-[#888] mt-0.5">{s.detail}</p>
                </div>
              </label>
            ))}
          </div>
        )}

        {/* TAB RELIGIEUX */}
        {activeTab === 'religieux' && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm text-sm text-[#666]" style={{ border: '1px solid #F5F0E8' }}>
              <p>⛪ Checklist des démarches pour le mariage religieux (catholique / protestant). Adaptez selon votre confession.</p>
            </div>
            {RELIGIEUX_STEPS.map(s => (
              <label key={s.step} className="flex items-start gap-3 bg-white rounded-2xl p-4 cursor-pointer shadow-sm" style={{ border: '1px solid #F5F0E8' }}>
                <div
                  className="mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                  style={{ borderColor: religiDone[s.step] ? '#9B7ED4' : '#DDD', background: religiDone[s.step] ? '#9B7ED4' : 'white' }}
                  onClick={() => setReligiDone(prev => ({ ...prev, [s.step]: !prev[s.step] }))}
                >
                  {religiDone[s.step] && <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#9B7ED4]">Étape {s.step}</span>
                  </div>
                  <p className="text-sm font-semibold text-[#1A1A1A] mt-0.5" style={{ textDecoration: religiDone[s.step] ? 'line-through' : 'none', opacity: religiDone[s.step] ? 0.5 : 1 }}>
                    {s.label}
                  </p>
                  <p className="text-[11px] text-[#888] mt-0.5">{s.detail}</p>
                </div>
              </label>
            ))}
          </div>
        )}

        {/* Sauvegarder */}
        <div className="mt-5">
          <button
            onClick={sauvegarder}
            disabled={saving || savedOk}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-sm disabled:opacity-50"
            style={{ background: 'linear-gradient(90deg, #C9A84C, #E8C87A)' }}
          >
            {savedOk ? '✅ Sauvegardé !' : saving ? 'Sauvegarde…' : '💾 Sauvegarder ma progression'}
          </button>
        </div>
      </div>
    </div>
  )
}
