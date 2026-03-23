'use client'
// components/evjf-evg/EvjfEvgClient.tsx — #146 Offre EVJF/EVG Kribi

import { useState } from 'react'

type TypeEvent = 'evjf' | 'evg'

interface Package {
  id: string
  titre: string
  prix_par_pers: number
  min_pers: number
  max_pers: number
  duree: string
  activites: string[]
  inclus: string[]
  emoji: string
}

const PACKAGES_EVJF: Package[] = [
  {
    id: 'evjf_escape',
    titre: 'Weekend Plage & Détente',
    prix_par_pers: 65000,
    min_pers: 4, max_pers: 8,
    duree: '2 jours / 1 nuit',
    emoji: '🌸',
    activites: ['Spa & massages en groupe', 'Shooting photo plage au coucher du soleil', 'Dîner homard & crevettes géantes', 'Soirée cocktails & musique'],
    inclus: ['Hébergement villa partagée', 'Transfert Kribi', 'Petit-déjeuner buffet', 'Animatrice EVJF L&Lui'],
  },
  {
    id: 'evjf_premium',
    titre: 'EVJF Prestige Kribi',
    prix_par_pers: 120000,
    min_pers: 6, max_pers: 12,
    duree: '3 jours / 2 nuits',
    emoji: '👑',
    activites: ['Excursion pirogue Chutes de la Lobé', 'Séance yoga plage au lever du soleil', 'Atelier cuisine camerounaise', 'Spa journée complète', 'Dîner gastronomique', 'Soirée dansante privée'],
    inclus: ['Villa exclusive avec piscine', 'Transfert VIP', 'Demi-pension', 'Photographe professionnel', 'Décoration EVJF personnalisée', 'Bouteille champagne offerte'],
  },
]

const PACKAGES_EVG: Package[] = [
  {
    id: 'evg_sport',
    titre: 'Weekend Sport & Mer',
    prix_par_pers: 70000,
    min_pers: 4, max_pers: 8,
    duree: '2 jours / 1 nuit',
    emoji: '🏄',
    activites: ['Surf & kitesurf', 'Pêche en haute mer au lever du soleil', 'Tournoi beach-volley', 'Barbecue poissons frais sur la plage', 'Soirée karaoké & bières locales'],
    inclus: ['Hébergement villa partagée', 'Transfert Kribi', 'Petit-déjeuner', 'Guide sportif certifié'],
  },
  {
    id: 'evg_premium',
    titre: 'EVG Aventure Prestige',
    prix_par_pers: 130000,
    min_pers: 6, max_pers: 12,
    duree: '3 jours / 2 nuits',
    emoji: '🎯',
    activites: ['Safari forêt pygmée Baka', 'Plongée récifs coralliens', 'Croisière privée côte Kribi', 'Quad ATV plage', 'Dîner barbecue XXL', 'Soirée privée avec DJ'],
    inclus: ['Villa exclusive', 'Transfert VIP', 'Demi-pension', 'Photographe / vidéaste', 'Open bar soirée', 'Tee-shirts EVG personnalisés'],
  },
]

const PLANNING_EVJF = [
  { moment: 'Jour 1 — Arrivée', items: ['Accueil champagne & fleurs', 'Installation villa', 'Shooting photo plage'] },
  { moment: 'Jour 1 — Soir', items: ['Dîner fruits de mer sur la terrasse', 'Jeux & surprises organisées', 'Soirée cocktails'] },
  { moment: 'Jour 2 — Matin', items: ['Petit-déjeuner luxe en villa', 'Spa & massages duo/groupe'] },
  { moment: 'Jour 2 — Après-midi', items: ['Activités choisies', 'Coucher de soleil sur la plage'] },
]

const PLANNING_EVG = [
  { moment: 'Jour 1 — Arrivée', items: ['Accueil bières fraîches', 'Installation villa', 'Pêche de fin de journée'] },
  { moment: 'Jour 1 — Soir', items: ['Barbecue géant poissons frais', 'Tournoi jeux & paris', 'Soirée karaoké'] },
  { moment: 'Jour 2 — Matin', items: ['Petit-déjeuner copieux', 'Sport nautique ou safari'] },
  { moment: 'Jour 2 — Après-midi', items: ['Activités choisies', 'Croisière ou quad'] },
]

function fmt(n: number) { return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA' }

export default function EvjfEvgClient() {
  const [type, setType] = useState<TypeEvent>('evjf')
  const [selected, setSelected] = useState<string | null>(null)
  const [form, setForm] = useState({ prenom_futur: '', date: '', nb_personnes: '6', tel: '', notes: '' })
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  const packages = type === 'evjf' ? PACKAGES_EVJF : PACKAGES_EVG
  const planning = type === 'evjf' ? PLANNING_EVJF : PLANNING_EVG
  const pkg = packages.find(p => p.id === selected)

  async function envoyer() {
    if (!form.prenom_futur || !form.date || !selected) return
    setSending(true)
    try {
      await fetch('/api/evjf-evg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...form, package_id: selected }),
      })
      setSent(true)
    } catch { /* ignore */ }
    setSending(false)
  }

  if (sent) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#FAF6EE' }}>
      <div className="max-w-sm w-full text-center bg-white rounded-3xl shadow-xl p-8">
        <div className="text-6xl mb-4">{type === 'evjf' ? '🥂' : '🍺'}</div>
        <h2 className="text-xl font-serif text-[#1A1A1A] mb-3">Demande reçue !</h2>
        <p className="text-sm text-[#888]">L'équipe L&Lui vous contacte sous 24h pour organiser un {type === 'evjf' ? 'EVJF' : 'EVG'} inoubliable à Kribi 🌊</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: '#FAF6EE' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#C9A84C] mb-2">L&LUI SIGNATURE</p>
          <h1 className="text-2xl font-serif text-[#1A1A1A]">EVJF & EVG à Kribi 🌊</h1>
          <p className="text-sm text-[#888] mt-1">Packages weekend groupe 4-12 personnes — mémorable garanti</p>
        </div>

        {/* Toggle EVJF / EVG */}
        <div className="flex p-1 rounded-2xl mb-6" style={{ background: '#F0EBE0' }}>
          {[
            { key: 'evjf', label: '🌸 EVJF — Enterrement de Vie de Jeune Fille' },
            { key: 'evg', label: '🍺 EVG — Enterrement de Vie de Garçon' },
          ].map(t => (
            <button key={t.key} onClick={() => { setType(t.key as TypeEvent); setSelected(null) }}
              className="flex-1 py-3 rounded-xl text-xs font-semibold transition-all text-center"
              style={{ background: type === t.key ? '#1A1A1A' : 'transparent', color: type === t.key ? '#C9A84C' : '#888' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Packages */}
        <div className="space-y-4 mb-6">
          {packages.map(p => (
            <div key={p.id} onClick={() => setSelected(p.id === selected ? null : p.id)}
              className="rounded-2xl cursor-pointer transition-all overflow-hidden bg-white"
              style={{ border: `2px solid ${selected === p.id ? '#C9A84C' : '#F5F0E8'}` }}>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{p.emoji}</span>
                      <h3 className="font-bold text-[#1A1A1A]">{p.titre}</h3>
                    </div>
                    <p className="text-xs text-[#C9A84C] font-semibold">{p.duree} · {p.min_pers}-{p.max_pers} pers.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#1A1A1A]">{fmt(p.prix_par_pers)}</p>
                    <p className="text-[10px] text-[#888]">/ personne</p>
                  </div>
                </div>
                {selected === p.id && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-[10px] font-bold text-[#888] uppercase mb-1.5">Activités</p>
                      {p.activites.map(a => <p key={a} className="text-xs text-[#666] flex gap-2"><span className="text-[#C9A84C]">✓</span>{a}</p>)}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#888] uppercase mb-1.5">Inclus</p>
                      {p.inclus.map(i => <p key={i} className="text-xs text-[#666] flex gap-2"><span className="text-[#7C9A7E]">✓</span>{i}</p>)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Planning type */}
        <div className="bg-white rounded-2xl p-4 mb-6" style={{ border: '1px solid #F5F0E8' }}>
          <p className="text-xs font-bold text-[#888] uppercase tracking-wide mb-3">📅 Déroulé type</p>
          <div className="space-y-3">
            {planning.map(e => (
              <div key={e.moment}>
                <p className="text-xs font-bold text-[#C9A84C]">{e.moment}</p>
                {e.items.map(i => <p key={i} className="text-xs text-[#666] ml-3">· {i}</p>)}
              </div>
            ))}
          </div>
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3" style={{ border: '1px solid #F5F0E8' }}>
          <p className="text-sm font-bold text-[#1A1A1A]">📋 Votre demande {type === 'evjf' ? 'EVJF' : 'EVG'}</p>
          <div>
            <label className="text-[10px] text-[#888] block mb-1">Prénom du/de la futur(e) marié(e) *</label>
            <input value={form.prenom_futur} onChange={e => setForm(f => ({ ...f, prenom_futur: e.target.value }))}
              placeholder="Ex : Chloé" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[#888] block mb-1">Date souhaitée</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]" />
            </div>
            <div>
              <label className="text-[10px] text-[#888] block mb-1">Nombre de personnes</label>
              <input type="number" min={4} max={12} value={form.nb_personnes}
                onChange={e => setForm(f => ({ ...f, nb_personnes: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:border-[#C9A84C]" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-[#888] block mb-1">Votre téléphone (WhatsApp)</label>
            <input type="tel" value={form.tel} onChange={e => setForm(f => ({ ...f, tel: e.target.value }))}
              placeholder="+237 6XX XXX XXX" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]" />
          </div>
          <div>
            <label className="text-[10px] text-[#888] block mb-1">Demandes spéciales / thème</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Couleurs, thème, surprise particulière…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#C9A84C]" />
          </div>
          <button onClick={envoyer} disabled={sending || !form.prenom_futur || !form.date || !selected}
            className="w-full py-4 rounded-2xl font-bold text-sm disabled:opacity-50"
            style={{ background: 'linear-gradient(90deg, #C9A84C, #E8C87A)', color: '#1A1A1A' }}>
            {sending ? 'Envoi…' : `🎉 Réserver ${pkg ? `— ${pkg.titre}` : 'un package'}`}
          </button>
        </div>
      </div>
    </div>
  )
}
