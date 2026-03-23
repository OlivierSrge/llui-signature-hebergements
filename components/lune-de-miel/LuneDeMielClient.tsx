'use client'
// components/lune-de-miel/LuneDeMielClient.tsx — #107 Module lune de miel Kribi

import { useState } from 'react'

interface Props {
  marie_uid: string
  noms_maries: string
  code_promo: string
}

interface Package {
  id: string
  titre: string
  duree: string
  prix: number
  hebergement: string
  categorie: number
  activites: string[]
  inclus: string[]
  emoji: string
  populaire?: boolean
}

const PACKAGES: Package[] = [
  {
    id: 'pkg_3j2n',
    titre: 'Escapade Romantique',
    duree: '3 jours / 2 nuits',
    prix: 280000,
    hebergement: 'Hôtel Kribi Beach ⭐⭐⭐',
    categorie: 3,
    emoji: '🌊',
    activites: [
      'Excursion Chutes de la Lobé',
      'Dîner aux chandelles bord de mer',
      'Massage en duo au spa',
    ],
    inclus: ['Chambre vue mer', 'Petit-déjeuner inclus', 'Transfert aéroport/hôtel', 'Bouquet de fleurs à l\'arrivée'],
  },
  {
    id: 'pkg_5j4n',
    titre: 'Lune de Miel Prestige',
    duree: '5 jours / 4 nuits',
    prix: 650000,
    hebergement: 'Villa Lobe ⭐⭐⭐⭐',
    categorie: 4,
    emoji: '🏡',
    populaire: true,
    activites: [
      'Excursion pirogue Chutes de la Lobé',
      'Plongée récifs coralliens',
      'Dîner gastronomique fruits de mer',
      'Massage en duo quotidien',
      'Balade forêt pygmée Baka',
    ],
    inclus: ['Villa privée avec piscine', 'Demi-pension', 'Voiture avec chauffeur', 'Champagne & pétales à l\'arrivée', 'Séance photo professionnelle'],
  },
  {
    id: 'pkg_7j6n',
    titre: 'Grand Voyage Côtier',
    duree: '7 jours / 6 nuits',
    prix: 1200000,
    hebergement: 'Domaine des Palmiers ⭐⭐⭐⭐⭐',
    categorie: 5,
    emoji: '👑',
    activites: [
      'Croisière privée le long de la côte',
      'Excursion Kribi → Campo (forêt vierge)',
      'Plongée & snorkeling guidé',
      'Dîner homard sur la plage',
      'Massage & soin spa chaque soir',
      'Sortie pêche au lever du soleil',
    ],
    inclus: ['Suite présidentielle vue océan', 'Pension complète', 'Voiture privée 24h/24', 'Butler personnel', 'Vidéaste professionnel', 'Bouteille de champagne quotidienne'],
  },
]

const HEBERGEMENTS_PARTENAIRES = [
  { nom: 'Villa Lobe', type: 'Villa privée', categorie: 4, remise_pct: 15, tel: '+237 677 XXX XXX' },
  { nom: 'Hôtel Ilomba', type: 'Hôtel 4★ bord de mer', categorie: 4, remise_pct: 10, tel: '+237 233 461 XXX' },
  { nom: 'Kribi Beach Hotel', type: 'Hôtel 4★ plage', categorie: 4, remise_pct: 10, tel: '+237 233 XXX XXX' },
  { nom: 'Domaine des Palmiers', type: 'Villa prestige 5★', categorie: 5, remise_pct: 12, tel: '+237 699 XXX XXX' },
]

function fmt(n: number) { return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA' }

export default function LuneDeMielClient({ marie_uid, noms_maries, code_promo }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [booking, setBooking] = useState(false)
  const [booked, setBooked] = useState(false)
  const [dates, setDates] = useState({ debut: '', fin: '' })
  const [notes, setNotes] = useState('')

  const pkg = PACKAGES.find(p => p.id === selected)

  async function reserver() {
    if (!selected || !dates.debut) return
    setBooking(true)
    try {
      await fetch('/api/portail/lune-de-miel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marie_uid, package_id: selected, dates, notes }),
      })
      setBooked(true)
    } catch { /* ignore */ }
    setBooking(false)
  }

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: '#FAF6EE' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#C9A84C] mb-2">LUNE DE MIEL</p>
          <h1 className="text-2xl font-serif text-[#1A1A1A]">Kribi en amoureux 🌊</h1>
          <p className="text-sm text-[#888] mt-1">Packages exclusifs pour {noms_maries}</p>
          {code_promo && (
            <div className="inline-block mt-3 px-4 py-1.5 rounded-full text-xs font-bold" style={{ background: '#C9A84C15', color: '#C9A84C', border: '1px solid #C9A84C30' }}>
              🎁 Code {code_promo} — remise partenaires appliquée
            </div>
          )}
        </div>

        {booked ? (
          <div className="text-center bg-white rounded-3xl shadow-sm p-8" style={{ border: '1px solid #F5F0E8' }}>
            <div className="text-5xl mb-4">💛</div>
            <h2 className="text-xl font-serif text-[#1A1A1A] mb-2">Demande envoyée !</h2>
            <p className="text-sm text-[#888]">L'équipe L&Lui vous contactera sous 24h pour confirmer votre lune de miel de rêve.</p>
          </div>
        ) : (
          <>
            {/* Packages */}
            <div className="space-y-4 mb-6">
              {PACKAGES.map(p => (
                <div
                  key={p.id}
                  onClick={() => setSelected(p.id === selected ? null : p.id)}
                  className="rounded-2xl cursor-pointer transition-all overflow-hidden"
                  style={{
                    border: `2px solid ${selected === p.id ? '#C9A84C' : '#F5F0E8'}`,
                    background: 'white',
                  }}
                >
                  {p.populaire && (
                    <div className="px-4 py-1.5 text-xs font-bold text-center" style={{ background: '#C9A84C', color: '#1A1A1A' }}>
                      ⭐ Package le plus choisi
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl">{p.emoji}</span>
                          <h3 className="font-bold text-[#1A1A1A]">{p.titre}</h3>
                        </div>
                        <p className="text-xs text-[#C9A84C] font-semibold">{p.duree}</p>
                        <p className="text-[11px] text-[#888] mt-0.5">🏨 {p.hebergement}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-[#1A1A1A]">{fmt(p.prix)}</p>
                        <p className="text-[10px] text-[#888]">par couple</p>
                      </div>
                    </div>

                    {selected === p.id && (
                      <div className="mt-4 space-y-3">
                        <div>
                          <p className="text-[10px] font-bold text-[#888] uppercase tracking-wide mb-1.5">🎯 Activités incluses</p>
                          <div className="space-y-1">
                            {p.activites.map(a => (
                              <p key={a} className="text-xs text-[#666] flex items-start gap-2">
                                <span className="text-[#C9A84C]">✓</span>{a}
                              </p>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-[#888] uppercase tracking-wide mb-1.5">✨ Ce qui est inclus</p>
                          <div className="space-y-1">
                            {p.inclus.map(i => (
                              <p key={i} className="text-xs text-[#666] flex items-start gap-2">
                                <span className="text-[#7C9A7E]">✓</span>{i}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Formulaire réservation */}
            {selected && (
              <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3" style={{ border: '1px solid #F5F0E8' }}>
                <p className="text-sm font-bold text-[#1A1A1A]">📅 Réserver — {pkg?.titre}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-[#888] block mb-1">Date d'arrivée</label>
                    <input type="date" value={dates.debut} onChange={e => setDates(d => ({ ...d, debut: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#888] block mb-1">Date de départ</label>
                    <input type="date" value={dates.fin} onChange={e => setDates(d => ({ ...d, fin: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-[#888] block mb-1">Demandes spéciales</label>
                  <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Allergie, surprise, préférence…"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#C9A84C]" />
                </div>
                <button onClick={reserver} disabled={booking || !dates.debut}
                  className="w-full py-3.5 rounded-2xl font-bold text-white text-sm disabled:opacity-50"
                  style={{ background: 'linear-gradient(90deg, #C9A84C, #E8C87A)', color: '#1A1A1A' }}>
                  {booking ? 'Envoi…' : `💍 Réserver ${pkg?.titre} — ${fmt(pkg?.prix ?? 0)}`}
                </button>
              </div>
            )}

            {/* Hébergements partenaires */}
            <div className="mt-6">
              <p className="text-xs font-bold text-[#888] uppercase tracking-wide mb-3">🏨 Hébergements partenaires L&Lui</p>
              <div className="space-y-2">
                {HEBERGEMENTS_PARTENAIRES.map(h => (
                  <div key={h.nom} className="bg-white rounded-xl p-3 flex items-center justify-between" style={{ border: '1px solid #F5F0E8' }}>
                    <div>
                      <p className="text-sm font-semibold text-[#1A1A1A]">{h.nom}</p>
                      <p className="text-[10px] text-[#888]">{h.type} · {'⭐'.repeat(h.categorie)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: '#7C9A7E15', color: '#7C9A7E' }}>
                        -{h.remise_pct}%
                      </span>
                      <a href={`tel:${h.tel}`} className="text-[10px] text-[#C9A84C]">{h.tel}</a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
