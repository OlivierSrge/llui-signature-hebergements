'use client'
// components/portail/traiteur/TraiteurKribi.tsx — #99 Traiteur spécialités Kribi

import { useState } from 'react'

interface Plat {
  id: string
  nom: string
  description: string
  categorie: 'entree' | 'plat_principal' | 'dessert' | 'boisson' | 'aperitif'
  prix_par_personne: number
  emoji: string
  typique: boolean
}

const PLATS_KRIBI: Plat[] = [
  // Entrées
  { id: 'e1', nom: 'Accras de crevettes géantes', description: 'Crevettes de Kribi en beignets dorés, sauce pimentée', categorie: 'entree', prix_par_personne: 1500, emoji: '🍤', typique: true },
  { id: 'e2', nom: 'Salade de fruits de mer', description: 'Crevettes, calamars, citron, herbes fraîches', categorie: 'entree', prix_par_personne: 2000, emoji: '🥗', typique: true },
  { id: 'e3', nom: 'Ndolé feuilleté', description: 'Feuilles de ndolé en pastilla dorée', categorie: 'entree', prix_par_personne: 1200, emoji: '🥬', typique: true },
  { id: 'e4', nom: 'Velouté de palmiste', description: 'Crème onctueuse de noix de palme, croutons', categorie: 'entree', prix_par_personne: 1000, emoji: '🍵', typique: true },

  // Plats principaux
  { id: 'p1', nom: 'Poisson braisé Kribi (barracuda / capitaine)', description: 'Poisson frais grillé aux épices locales, sauce tomate et plantain', categorie: 'plat_principal', prix_par_personne: 6000, emoji: '🐟', typique: true },
  { id: 'p2', nom: 'Ndolé aux crevettes et pistaches', description: 'Plat emblématique camerounais, crevettes et viande fumée', categorie: 'plat_principal', prix_par_personne: 5000, emoji: '🍛', typique: true },
  { id: 'p3', nom: 'Homard grillé (option prestige)', description: 'Homard entier, beurre citronné, légumes croquants', categorie: 'plat_principal', prix_par_personne: 18000, emoji: '🦞', typique: true },
  { id: 'p4', nom: 'Poulet DG (Directeur Général)', description: 'Poulet sauté, légumes, plantain mûr — classique des fêtes', categorie: 'plat_principal', prix_par_personne: 4500, emoji: '🍗', typique: true },
  { id: 'p5', nom: 'Viande de bœuf en sauce', description: 'Ragoût de bœuf, arachides, légumes du marché', categorie: 'plat_principal', prix_par_personne: 4000, emoji: '🥩', typique: false },
  { id: 'p6', nom: 'Riz pilaf aux fruits de mer', description: 'Riz parfumé, crevettes, calamars, herbes', categorie: 'plat_principal', prix_par_personne: 5500, emoji: '🍚', typique: true },

  // Desserts
  { id: 'd1', nom: 'Pièce montée traditionnelle', description: 'Choux praliné, décoration en sucre tiré', categorie: 'dessert', prix_par_personne: 2500, emoji: '🎂', typique: false },
  { id: 'd2', nom: 'Gâteau noix de coco Kribi', description: 'Mousse coco, coulis mangue tropicale', categorie: 'dessert', prix_par_personne: 1800, emoji: '🥥', typique: true },
  { id: 'd3', nom: 'Pastèque et fruits exotiques', description: 'Salade de fruits tropicaux : mangue, papaye, ananas', categorie: 'dessert', prix_par_personne: 1200, emoji: '🍉', typique: true },

  // Boissons
  { id: 'b1', nom: 'Jus de corossol maison', description: 'Corossol frais pressé, légèrement sucré', categorie: 'boisson', prix_par_personne: 800, emoji: '🥤', typique: true },
  { id: 'b2', nom: 'Eau de coco fraîche', description: 'Noix de coco de Kribi, servies entières', categorie: 'boisson', prix_par_personne: 500, emoji: '🥥', typique: true },
  { id: 'b3', nom: 'Bières locales (Castel, 33 Export)', description: 'Bières fraîches, service en glacière', categorie: 'boisson', prix_par_personne: 1000, emoji: '🍺', typique: false },
  { id: 'b4', nom: 'Vins (rouge / blanc / rosé)', description: 'Sélection de vins importés, service à table', categorie: 'boisson', prix_par_personne: 3000, emoji: '🍷', typique: false },

  // Apéritif
  { id: 'a1', nom: 'Cocktail de bienvenue', description: 'Cocktail tropical maison (avec / sans alcool)', categorie: 'aperitif', prix_par_personne: 1500, emoji: '🍹', typique: true },
  { id: 'a2', nom: 'Plateau de canapés fruits de mer', description: 'Bouchées crevettes, avocat, toast grillé', categorie: 'aperitif', prix_par_personne: 2000, emoji: '🥂', typique: true },
]

const CAT_LABELS: Record<string, string> = {
  aperitif: '🥂 Apéritif', entree: '🥗 Entrées', plat_principal: '🍛 Plats principaux', dessert: '🎂 Desserts', boisson: '🥤 Boissons'
}
const CAT_ORDER = ['aperitif', 'entree', 'plat_principal', 'dessert', 'boisson']

function fmt(n: number) { return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA' }

export default function TraiteurKribi() {
  const [selection, setSelection] = useState<Record<string, boolean>>({})
  const [nbInvites, setNbInvites] = useState(100)
  const [showPlanning, setShowPlanning] = useState(false)

  const selectedPlats = PLATS_KRIBI.filter(p => selection[p.id])
  const coutParPersonne = selectedPlats.reduce((acc, p) => acc + p.prix_par_personne, 0)
  const coutTotal = coutParPersonne * nbInvites

  function togglePlat(id: string) {
    setSelection(s => ({ ...s, [id]: !s[id] }))
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#FDFAF4', border: '1px solid #E8E0D0' }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-4" style={{ background: 'linear-gradient(135deg, #1A1A1A, #2D2D2D)' }}>
        <p className="text-[10px] tracking-[0.3em] uppercase text-[#C9A84C] mb-1">TRAITEUR</p>
        <h3 className="text-lg font-serif text-white mb-1">Spécialités Kribi 🐟</h3>
        <p className="text-xs text-[#888]">Sélectionnez les plats et estimez votre budget traiteur</p>
      </div>

      {/* Calculateur invités */}
      <div className="px-4 py-3 flex items-center gap-4" style={{ background: '#C9A84C10', borderBottom: '1px solid #E8E0D0' }}>
        <div className="flex-1">
          <p className="text-xs text-[#888] mb-1">Nombre d'invités</p>
          <input
            type="number"
            min={10}
            max={1000}
            value={nbInvites}
            onChange={e => setNbInvites(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2 text-sm font-bold text-[#1A1A1A] focus:outline-none focus:border-[#C9A84C]"
            style={{ background: 'white' }}
          />
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[#888]">Estimation totale</p>
          <p className="text-xl font-bold text-[#C9A84C]">{fmt(coutTotal)}</p>
          <p className="text-[10px] text-[#888]">{fmt(coutParPersonne)} / pers.</p>
        </div>
      </div>

      {/* Liste plats par catégorie */}
      <div className="p-4 space-y-4">
        {CAT_ORDER.map(cat => {
          const plats = PLATS_KRIBI.filter(p => p.categorie === cat)
          return (
            <div key={cat}>
              <p className="text-xs font-bold text-[#888] uppercase tracking-wide mb-2">{CAT_LABELS[cat]}</p>
              <div className="space-y-2">
                {plats.map(plat => (
                  <label
                    key={plat.id}
                    className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all"
                    style={{
                      background: selection[plat.id] ? '#C9A84C10' : 'white',
                      border: `1px solid ${selection[plat.id] ? '#C9A84C40' : '#F5F0E8'}`,
                    }}
                  >
                    <div
                      className="mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all"
                      style={{ borderColor: selection[plat.id] ? '#C9A84C' : '#DDD', background: selection[plat.id] ? '#C9A84C' : 'white' }}
                      onClick={() => togglePlat(plat.id)}
                    >
                      {selection[plat.id] && <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span>{plat.emoji}</span>
                        <p className="text-sm font-semibold text-[#1A1A1A]">{plat.nom}</p>
                        {plat.typique && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: '#C9A84C15', color: '#C9A84C' }}>Kribi</span>}
                      </div>
                      <p className="text-[11px] text-[#888] mt-0.5">{plat.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold text-[#C9A84C]">{fmt(plat.prix_par_personne)}</p>
                      <p className="text-[9px] text-[#AAA]">/ pers.</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Planning approvisionnement J-2 */}
      <div className="px-4 pb-4">
        <button
          onClick={() => setShowPlanning(p => !p)}
          className="w-full py-2.5 rounded-xl text-xs font-semibold transition-all"
          style={{ background: '#7C9A7E15', color: '#7C9A7E', border: '1px solid #7C9A7E30' }}
        >
          📋 {showPlanning ? 'Masquer' : 'Voir'} le planning approvisionnement J-2
        </button>

        {showPlanning && (
          <div className="mt-3 rounded-xl p-4 space-y-3" style={{ background: '#F5F0E8', border: '1px solid #E8E0D0' }}>
            <p className="text-xs font-bold text-[#1A1A1A]">🗓️ Planning approvisionnement — J-2 avant le mariage</p>
            {[
              { jour: 'J-7', label: 'Commander les fruits de mer (crevettes, homard)', detail: 'Pêcheurs locaux de Kribi — paiement en avance' },
              { jour: 'J-4', label: 'Acheter boissons et vins', detail: 'Bières, sodas, vins — prévoir glacières et glace' },
              { jour: 'J-3', label: 'Légumes frais et condiments', detail: 'Marché de Kribi — tomates, oignons, épices' },
              { jour: 'J-2', label: 'Poissons frais et viandes', detail: 'Commande directe au marché aux poissons de Kribi' },
              { jour: 'J-2', label: 'Préparer les bases : ndolé, sauces', detail: 'Traiteur commence la mise en place' },
              { jour: 'J-1', label: 'Livraison matériel et vaisselle', detail: 'Tables, chaises, nappes, couverts' },
              { jour: 'J-1', label: 'Mise en place salle + cuisine', detail: 'Traiteur installe sa brigade' },
              { jour: 'Jour J', label: 'Service complet', detail: 'Accueil apéritif → repas → desserts → café' },
            ].map(e => (
              <div key={e.jour + e.label} className="bg-white rounded-lg px-3 py-2.5 flex items-start gap-3">
                <span className="text-[10px] font-bold text-white px-2 py-1 rounded-lg flex-shrink-0" style={{ background: '#C9A84C' }}>{e.jour}</span>
                <div>
                  <p className="text-xs font-semibold text-[#1A1A1A]">{e.label}</p>
                  <p className="text-[10px] text-[#888] mt-0.5">{e.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
