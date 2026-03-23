'use client'
// components/guide/GuideKribiClient.tsx — #94 Guide Bienvenue Kribi + export PDF jsPDF

import { useState } from 'react'

const SECTIONS = [
  {
    id: 'bienvenue',
    titre: 'Bienvenue à Kribi 🌊',
    emoji: '🌊',
    contenu: [
      'Kribi est une ville côtière du Cameroun réputée pour ses plages de sable blanc, ses forêts tropicales et sa gastronomie marine exceptionnelle.',
      'Située à environ 3h30 de route de Yaoundé (180 km) et 3h de Douala (220 km), Kribi est accessible par la route nationale.',
      'Le climat est tropical humide — prévoyez des vêtements légers et de la crème solaire.',
    ],
  },
  {
    id: 'comment_venir',
    titre: 'Comment venir 🚗',
    emoji: '🚗',
    infos: [
      { label: 'Depuis Yaoundé', detail: '180 km · ~3h30 via Ebolowa · Agences : Touristique du Cameroun, Vatican Express' },
      { label: 'Depuis Douala', detail: '220 km · ~3h via Edéa · Agences : Guaranti Express, Binam Voyages' },
      { label: 'Taxi-brousse', detail: 'Départs réguliers depuis les gares routières de Yaoundé et Douala' },
      { label: 'Location voiture', detail: 'Recommandé pour plus de liberté — demandez les coordonnées à l'organisateur' },
    ],
  },
  {
    id: 'hebergement',
    titre: 'Hébergements recommandés 🏨',
    emoji: '🏨',
    hotels: [
      { nom: 'Hôtel Ilomba', categorie: '⭐⭐⭐⭐', detail: 'Plage privée, piscine, proche du centre' },
      { nom: 'Hôtel Kribi Beach', categorie: '⭐⭐⭐', detail: 'Vue sur mer, restaurant de fruits de mer' },
      { nom: 'Villa Lobe', categorie: '⭐⭐⭐', detail: 'Cadre naturel, cascade voisine, charme authentique' },
      { nom: 'Résidence Louisiane', categorie: '⭐⭐⭐', detail: 'Appartements familiaux, kitchenette' },
      { nom: 'Auberge des Cocotiers', categorie: '⭐⭐', detail: 'Budget-friendly, centre-ville' },
    ],
  },
  {
    id: 'restaurants',
    titre: 'Restaurants à découvrir 🍽️',
    emoji: '🍽️',
    restaurants: [
      { nom: 'Le Rocher du Lobe', type: 'Fruits de mer, spécialité : crevettes géantes' },
      { nom: 'Chez Jojo', type: 'Cuisine locale, poisson braisé incontournable' },
      { nom: 'La Chaumière', type: 'Franco-camerounaise, terrasse océan' },
      { nom: 'Restaurant du Port', type: 'Frais du jour direct des pêcheurs' },
      { nom: 'Maquis Eden', type: 'Ambiance locale, poulet DG, nyama-nyama' },
    ],
  },
  {
    id: 'activites',
    titre: 'Activités & Visites 🌴',
    emoji: '🌴',
    activites: [
      '🌊 Plage de Grand Batanga — sable blanc, eaux calmes',
      '💧 Chutes de la Lobé — seul endroit où une cascade tombe directement dans l'océan',
      '🐠 Snorkeling & plongée — récifs coralliens préservés',
      '🛶 Excursion en pirogue sur la Lobé',
      '🌳 Forêt pygmée — rencontre avec les peuples Baka',
      '🦞 Marché aux poissons — lever du soleil recommandé',
      '🤿 Surf & kitesurf selon la saison',
    ],
  },
  {
    id: 'conseils',
    titre: 'Conseils pratiques 💡',
    emoji: '💡',
    conseils: [
      { titre: 'Argent', detail: 'Franc CFA (XAF) · Banques et ATM disponibles en centre-ville · Orange Money accepté partout' },
      { titre: 'Réseau', detail: 'MTN et Orange ont une couverture correcte · Wi-Fi dans la plupart des hôtels' },
      { titre: 'Santé', detail: 'Prévoyez antipaludéens et répulsifs anti-moustiques · Eau en bouteille recommandée' },
      { titre: 'Tenue', detail: 'Décontractée en journée · Tenue correcte pour le mariage (invitation détaillée à venir)' },
      { titre: 'Sécurité', detail: 'Kribi est généralement sûre — vigilance habituelle en soirée' },
      { titre: 'Langue', detail: 'Français principalement · Anglais de base dans les hôtels' },
    ],
  },
]

export default function GuideKribiClient() {
  const [downloading, setDownloading] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>(null)

  async function handleDownloadPDF() {
    setDownloading(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ format: 'a5', unit: 'mm' })

      const gold = [201, 168, 76] as [number, number, number]
      const dark = [26, 26, 26] as [number, number, number]
      const grey = [100, 100, 100] as [number, number, number]

      // Page de titre
      doc.setFillColor(26, 26, 26)
      doc.rect(0, 0, 148, 210, 'F')
      doc.setTextColor(...gold)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('Guide Bienvenue', 74, 60, { align: 'center' })
      doc.setFontSize(28)
      doc.text('KRIBI', 74, 78, { align: 'center' })
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(255, 255, 255)
      doc.text('L&Lui Signature — Guide pour les invités', 74, 100, { align: 'center' })
      doc.setFontSize(8)
      doc.setTextColor(150, 130, 80)
      doc.text('🌊 Cameroun — Côte Atlantique', 74, 115, { align: 'center' })

      // Pages de contenu
      SECTIONS.forEach((section, si) => {
        doc.addPage()
        doc.setFillColor(250, 246, 238)
        doc.rect(0, 0, 148, 210, 'F')

        // Titre section
        doc.setTextColor(...gold)
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text(section.titre, 10, 20)

        // Ligne dorée
        doc.setDrawColor(...gold)
        doc.setLineWidth(0.5)
        doc.line(10, 24, 138, 24)

        let y = 35
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...dark)
        doc.setFontSize(9)

        if (section.contenu) {
          section.contenu.forEach(p => {
            const lines = doc.splitTextToSize(p, 128)
            doc.text(lines, 10, y)
            y += lines.length * 5 + 4
          })
        }
        if (section.infos) {
          section.infos.forEach(info => {
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(...gold)
            doc.text(`• ${info.label}`, 10, y); y += 5
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(...grey)
            const lines = doc.splitTextToSize(info.detail, 124)
            doc.text(lines, 14, y); y += lines.length * 4 + 3
          })
        }
        if (section.hotels) {
          section.hotels.forEach(h => {
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(...dark)
            doc.text(`${h.nom} ${h.categorie}`, 10, y); y += 5
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(...grey)
            doc.text(h.detail, 14, y); y += 6
          })
        }
        if (section.restaurants) {
          section.restaurants.forEach(r => {
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(...dark)
            doc.text(`• ${r.nom}`, 10, y); y += 5
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(...grey)
            doc.text(r.type, 14, y); y += 5
          })
        }
        if (section.activites) {
          section.activites.forEach(a => {
            const lines = doc.splitTextToSize(a, 128)
            doc.setTextColor(...dark)
            doc.text(lines, 10, y); y += lines.length * 4 + 2
          })
        }
        if (section.conseils) {
          section.conseils.forEach(c => {
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(...gold)
            doc.text(`▶ ${c.titre}`, 10, y); y += 5
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(...dark)
            const lines = doc.splitTextToSize(c.detail, 124)
            doc.text(lines, 14, y); y += lines.length * 4 + 3
          })
        }

        // Numéro de page
        doc.setTextColor(180, 160, 80)
        doc.setFontSize(7)
        doc.text(`${si + 2} / ${SECTIONS.length + 1}`, 138, 205, { align: 'right' })
      })

      doc.save('Guide-Bienvenue-Kribi.pdf')
    } catch (e) {
      console.error('PDF erreur:', e)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#FAF6EE' }}>
      {/* Header */}
      <div className="text-white py-12 px-6 text-center" style={{ background: 'linear-gradient(160deg, #1A1A1A 0%, #2D2416 100%)' }}>
        <div className="text-4xl mb-3">🌊</div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#C9A84C' }}>Guide Bienvenue Kribi</h1>
        <p className="text-white/60 text-sm mb-6">Tout ce qu'il faut savoir pour profiter de votre séjour</p>
        <button
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="px-6 py-3 rounded-2xl font-bold text-[#1A1A1A] text-sm disabled:opacity-50 transition-all hover:scale-105"
          style={{ background: 'linear-gradient(90deg, #C9A84C, #E8C87A)' }}
        >
          {downloading ? '⏳ Génération…' : '📥 Télécharger le guide PDF'}
        </button>
      </div>

      {/* Sections */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        {SECTIONS.map(section => (
          <div key={section.id} className="bg-white rounded-2xl shadow-sm border border-[#F5F0E8] overflow-hidden">
            <button
              onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{section.emoji}</span>
                <span className="font-semibold text-[#1A1A1A] text-sm">{section.titre}</span>
              </div>
              <span className="text-[#C9A84C] text-lg">{activeSection === section.id ? '−' : '+'}</span>
            </button>

            {activeSection === section.id && (
              <div className="px-5 pb-5 text-sm text-[#555] space-y-2 border-t border-[#F5F0E8] pt-4">
                {section.contenu?.map((p, i) => <p key={i}>{p}</p>)}

                {section.infos?.map((info, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#C9A84C' }} />
                    <div>
                      <p className="font-semibold text-[#1A1A1A]">{info.label}</p>
                      <p className="text-[#888] text-xs">{info.detail}</p>
                    </div>
                  </div>
                ))}

                {section.hotels?.map((h, i) => (
                  <div key={i} className="flex justify-between py-1.5 border-b border-[#F5F0E8] last:border-0">
                    <div>
                      <p className="font-semibold text-[#1A1A1A] text-xs">{h.nom}</p>
                      <p className="text-[#888] text-[10px]">{h.detail}</p>
                    </div>
                    <span className="text-xs shrink-0">{h.categorie}</span>
                  </div>
                ))}

                {section.restaurants?.map((r, i) => (
                  <div key={i}>
                    <p className="font-semibold text-[#1A1A1A] text-xs">{r.nom}</p>
                    <p className="text-[#888] text-[10px]">{r.type}</p>
                  </div>
                ))}

                {section.activites?.map((a, i) => <p key={i}>{a}</p>)}

                {section.conseils?.map((c, i) => (
                  <div key={i}>
                    <p className="font-semibold text-[#C9A84C] text-xs mb-0.5">▶ {c.titre}</p>
                    <p className="text-[#555] text-xs">{c.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="text-center text-xs text-[#AAA] py-6">L&Lui Signature — Organisateur de mariages à Kribi 💛</div>
    </div>
  )
}
