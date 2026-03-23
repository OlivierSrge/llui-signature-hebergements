'use client'
// components/diaspora/DiasporaClient.tsx — #144 Pack diaspora clé en main

import { useState, useEffect } from 'react'

interface Props {
  marie_uid: string
  noms_maries: string
  date_mariage: string
  lieu: string
  fuseau_horaire: string
  medias_360: string[]
}

const FUSEAUX = [
  { label: 'Cameroun (WAT)', tz: 'Africa/Douala', offset: '+1' },
  { label: 'France (CET/CEST)', tz: 'Europe/Paris', offset: '+1/+2' },
  { label: 'USA Est (ET)', tz: 'America/New_York', offset: '-5/-4' },
  { label: 'USA Ouest (PT)', tz: 'America/Los_Angeles', offset: '-8/-7' },
  { label: 'Canada (ET)', tz: 'America/Toronto', offset: '-5/-4' },
  { label: 'Royaume-Uni (GMT)', tz: 'Europe/London', offset: '+0/+1' },
  { label: 'Belgique (CET)', tz: 'Europe/Brussels', offset: '+1/+2' },
  { label: 'Suisse (CET)', tz: 'Europe/Zurich', offset: '+1/+2' },
  { label: 'Gabon (WAT)', tz: 'Africa/Libreville', offset: '+1' },
  { label: "Côte d'Ivoire (GMT)", tz: 'Africa/Abidjan', offset: '+0' },
]

const CHECKLIST_DIASPORA = [
  { id: 'vol', label: 'Réserver le vol (Douala / Yaoundé)', detail: 'Yaoundé Nsimalen → 3h30 route Kribi', done: false },
  { id: 'visa', label: 'Vérifier visa / passeport valide', detail: 'Passeport valide 6 mois après le mariage', done: false },
  { id: 'billet_ret', label: "Billet retour confirmé", detail: 'Prévoir J+3 minimum pour profiter', done: false },
  { id: 'simlocale', label: 'Acheter SIM locale à l\'arrivée', detail: 'MTN ou Orange — Orange Money pour paiements', done: false },
  { id: 'change', label: 'Prévoir espèces en FCFA', detail: '1€ ≈ 655 FCFA · Retrait ATM au centre-ville', done: false },
  { id: 'vaccins', label: 'Vaccins à jour (fièvre jaune, paludisme)', detail: 'Prophylaxie antipaludéen à démarrer J-7', done: false },
  { id: 'hotel', label: 'Hébergement confirmé à Kribi', detail: 'Voir la cartographie des hébergements', done: false },
  { id: 'transport', label: 'Transport Douala → Kribi organisé', detail: 'Bus (3h), taxi ou voiture de location', done: false },
  { id: 'tenue', label: 'Tenue de mariage préparée', detail: 'Voir le dress code dans le faire-part', done: false },
  { id: 'cadeau', label: 'Cadeau / contribution planifiée', detail: 'Liste de cadeaux ou participation cagnotte', done: false },
]

function getHeureFuseau(tz: string) {
  try {
    return new Date().toLocaleTimeString('fr-FR', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch { return '--:--:--' }
}

function formatDate(iso: string) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return iso }
}

function formatDateTz(iso: string, tz: string) {
  if (!iso) return ''
  try {
    return new Date(iso + 'T09:00:00').toLocaleDateString('fr-FR', {
      timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }) + ' (heure locale)'
  } catch { return iso }
}

export default function DiasporaClient({ noms_maries, date_mariage, lieu, fuseau_horaire, medias_360 }: Props) {
  const [fuseauSelected, setFuseauSelected] = useState(fuseau_horaire || 'Africa/Douala')
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [heures, setHeures] = useState<Record<string, string>>({})

  // Horloge live
  useEffect(() => {
    function update() {
      const map: Record<string, string> = {}
      FUSEAUX.forEach(f => { map[f.tz] = getHeureFuseau(f.tz) })
      setHeures(map)
    }
    update()
    const i = setInterval(update, 1000)
    return () => clearInterval(i)
  }, [])

  function toggleCheck(id: string) {
    setChecked(p => ({ ...p, [id]: !p[id] }))
  }

  const done = CHECKLIST_DIASPORA.filter(i => checked[i.id]).length

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: '#FAF6EE' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#C9A84C] mb-2">PACK DIASPORA</p>
          <h1 className="text-2xl font-serif text-[#1A1A1A]">{noms_maries}</h1>
          <p className="text-sm text-[#888] mt-1">Votre guide complet pour venir depuis l'étranger 🌍</p>
        </div>

        {/* Fuseau horaire sélecteur */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm" style={{ border: '1px solid #F5F0E8' }}>
          <p className="text-xs font-bold text-[#888] uppercase tracking-wide mb-3">🌍 Votre fuseau horaire</p>
          <select value={fuseauSelected} onChange={e => setFuseauSelected(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C] mb-3">
            {FUSEAUX.map(f => <option key={f.tz} value={f.tz}>{f.label}</option>)}
          </select>
          <div className="rounded-xl p-3" style={{ background: '#C9A84C10', border: '1px solid #C9A84C20' }}>
            <p className="text-xs text-[#888] mb-1">Heure actuelle chez vous</p>
            <p className="text-2xl font-mono font-bold text-[#1A1A1A]">{heures[fuseauSelected] || '--:--:--'}</p>
            {date_mariage && (
              <p className="text-xs text-[#C9A84C] mt-2">
                📅 Le mariage aura lieu : {formatDateTz(date_mariage, fuseauSelected)}
              </p>
            )}
          </div>
        </div>

        {/* Horloge multi-fuseaux */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm" style={{ border: '1px solid #F5F0E8' }}>
          <p className="text-xs font-bold text-[#888] uppercase tracking-wide mb-3">🕐 Heures en simultané</p>
          <div className="grid grid-cols-2 gap-2">
            {FUSEAUX.slice(0, 6).map(f => (
              <div key={f.tz} className="rounded-lg p-2" style={{ background: f.tz === 'Africa/Douala' ? '#C9A84C10' : '#F9F9F9' }}>
                <p className="text-[10px] text-[#888]">{f.label}</p>
                <p className="text-sm font-mono font-bold text-[#1A1A1A]">{heures[f.tz] || '--:--'}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Informations pratiques */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm" style={{ border: '1px solid #F5F0E8' }}>
          <p className="text-xs font-bold text-[#888] uppercase tracking-wide mb-3">✈️ Infos pratiques Kribi</p>
          <div className="space-y-2">
            {[
              { emoji: '✈️', label: "Aéroport d'arrivée", detail: 'Douala (DLA) ou Yaoundé Nsimalen (NSI)' },
              { emoji: '🚗', label: 'Kribi depuis Douala', detail: '220 km · 3h de route · Bus ou taxi' },
              { emoji: '🚗', label: 'Kribi depuis Yaoundé', detail: '180 km · 3h30 de route via Ebolowa' },
              { emoji: '💰', label: 'Monnaie', detail: 'Franc CFA (XAF) · 1€ ≈ 655 FCFA' },
              { emoji: '📱', label: 'Réseau', detail: 'MTN et Orange — couverture correcte · Wi-Fi hôtels' },
              { emoji: '🌡️', label: 'Climat', detail: 'Tropical humide · 26-32°C · Prévoir léger et crème solaire' },
            ].map(i => (
              <div key={i.label} className="flex items-start gap-3">
                <span className="text-base flex-shrink-0">{i.emoji}</span>
                <div>
                  <p className="text-xs font-semibold text-[#1A1A1A]">{i.label}</p>
                  <p className="text-[11px] text-[#888]">{i.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Médias 360° */}
        {medias_360.length > 0 && (
          <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm" style={{ border: '1px solid #F5F0E8' }}>
            <p className="text-xs font-bold text-[#888] uppercase tracking-wide mb-3">🎥 Photos & vidéos 360° du lieu</p>
            <div className="grid grid-cols-2 gap-2">
              {medias_360.map((url, i) => (
                <div key={i} className="aspect-video rounded-xl overflow-hidden bg-[#F5F0E8]">
                  <img src={url} alt={`Vue 360° ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Checklist diaspora */}
        <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: '1px solid #F5F0E8' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-[#888] uppercase tracking-wide">✅ Checklist avant le départ</p>
            <span className="text-xs font-bold text-[#C9A84C]">{done}/{CHECKLIST_DIASPORA.length}</span>
          </div>
          <div className="bg-[#F5F0E8] rounded-full h-1.5 mb-3">
            <div className="h-1.5 rounded-full transition-all" style={{ width: `${(done / CHECKLIST_DIASPORA.length) * 100}%`, background: '#C9A84C' }} />
          </div>
          <div className="space-y-2">
            {CHECKLIST_DIASPORA.map(item => (
              <label key={item.id} className="flex items-start gap-3 cursor-pointer">
                <div
                  className="mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all"
                  style={{ borderColor: checked[item.id] ? '#7C9A7E' : '#DDD', background: checked[item.id] ? '#7C9A7E' : 'white' }}
                  onClick={() => toggleCheck(item.id)}
                >
                  {checked[item.id] && <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <div>
                  <p className="text-sm text-[#1A1A1A]" style={{ textDecoration: checked[item.id] ? 'line-through' : 'none', opacity: checked[item.id] ? 0.5 : 1 }}>
                    {item.label}
                  </p>
                  <p className="text-[10px] text-[#AAA]">{item.detail}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
