'use client'
// components/CarteKribi.tsx — #7 Carte du lieu interactive (Google Maps embed + marqueurs)

interface Marqueur {
  nom: string
  type: 'salle' | 'hebergement' | 'restaurant' | 'attraction'
  lat: number
  lng: number
  detail?: string
  adresse?: string
}

interface Props {
  lieu?: string
  marqueurs?: Marqueur[]
  hauteur?: number
  showLegend?: boolean
}

// Marqueurs par défaut pour Kribi
const MARQUEURS_DEFAUT: Marqueur[] = [
  { nom: 'Salle de réception (à configurer)', type: 'salle', lat: 2.9390, lng: 9.9180, detail: 'Lieu du mariage — à préciser dans les paramètres' },
  { nom: 'Hôtel Ilomba', type: 'hebergement', lat: 2.9480, lng: 9.9230, adresse: 'Bord de mer, Kribi' },
  { nom: 'Hôtel Kribi Beach', type: 'hebergement', lat: 2.9350, lng: 9.9150, adresse: 'Plage de Kribi' },
  { nom: 'Villa Lobe', type: 'hebergement', lat: 2.9200, lng: 9.9050, adresse: 'Kribi-Lolabé' },
  { nom: 'Le Rocher du Lobe', type: 'restaurant', lat: 2.9100, lng: 9.9000, detail: 'Fruits de mer, vue sur les chutes' },
  { nom: 'Chez Jojo', type: 'restaurant', lat: 2.9420, lng: 9.9200, detail: 'Cuisine locale, poisson braisé' },
  { nom: 'La Chaumière', type: 'restaurant', lat: 2.9380, lng: 9.9170, detail: 'Franco-camerounaise, terrasse océan' },
  { nom: "Chutes de la Lobé", type: 'attraction', lat: 2.9120, lng: 9.8980, detail: "Seul endroit où cascade tombe dans l'océan" },
  { nom: 'Plage de Grand Batanga', type: 'attraction', lat: 2.9550, lng: 9.9300, detail: 'Sable blanc, eaux calmes' },
  { nom: 'Marché aux poissons', type: 'attraction', lat: 2.9400, lng: 9.9190, detail: 'Lever du soleil recommandé' },
]

const TYPE_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  salle: { label: 'Salle de réception', color: '#C9A84C', emoji: '💍' },
  hebergement: { label: 'Hébergements', color: '#5B8FBF', emoji: '🏨' },
  restaurant: { label: 'Restaurants', color: '#7C9A7E', emoji: '🍽️' },
  attraction: { label: 'Sites à visiter', color: '#9B7ED4', emoji: '📍' },
}

// Centre Kribi
const KRIBI_CENTER = { lat: 2.9390, lng: 9.9180 }

function buildGoogleMapsUrl(centre: { lat: number; lng: number }) {
  // Google Maps embed statique centré sur Kribi
  const baseUrl = 'https://www.google.com/maps'
  return `${baseUrl}?q=${centre.lat},${centre.lng}&z=14&output=embed`
}

function buildDirectionsUrl(marqueur: Marqueur) {
  return `https://www.google.com/maps/dir/?api=1&destination=${marqueur.lat},${marqueur.lng}`
}

export default function CarteKribi({ lieu, marqueurs, hauteur = 350, showLegend = true }: Props) {
  const pts = marqueurs ?? MARQUEURS_DEFAUT
  const salle = pts.find(m => m.type === 'salle')
  const centre = salle ? { lat: salle.lat, lng: salle.lng } : KRIBI_CENTER
  const embedUrl = buildGoogleMapsUrl(centre)

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E8E0D0' }}>
      {/* Header */}
      <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #1A1A1A, #2D2D2D)' }}>
        <p className="text-[10px] tracking-[0.3em] uppercase text-[#C9A84C] mb-0.5">CARTE INTERACTIVE</p>
        <h3 className="text-sm font-serif text-white">{lieu || 'Kribi, Cameroun'} 📍</h3>
      </div>

      {/* Carte Google Maps embed */}
      <div style={{ height: hauteur, position: 'relative', background: '#F5F0E8' }}>
        <iframe
          src={embedUrl}
          width="100%"
          height={hauteur}
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Carte Kribi"
        />
      </div>

      {/* Légende */}
      {showLegend && (
        <div className="px-4 py-3 space-y-3" style={{ background: '#FDFAF4' }}>
          <div className="flex flex-wrap gap-2">
            {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
              const count = pts.filter(m => m.type === type).length
              if (count === 0) return null
              return (
                <span key={type} className="text-[10px] px-2 py-1 rounded-full font-medium" style={{ background: cfg.color + '15', color: cfg.color }}>
                  {cfg.emoji} {cfg.label} ({count})
                </span>
              )
            })}
          </div>

          {/* Liste des points clés */}
          <div className="space-y-2">
            {pts.filter(m => m.type === 'salle' || m.type === 'attraction').map(m => {
              const cfg = TYPE_CONFIG[m.type]
              return (
                <div key={m.nom} className="flex items-start gap-2.5">
                  <span className="text-base flex-shrink-0">{cfg.emoji}</span>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-[#1A1A1A]">{m.nom}</p>
                    {m.detail && <p className="text-[10px] text-[#888]">{m.detail}</p>}
                  </div>
                  <a
                    href={buildDirectionsUrl(m)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] px-2 py-1 rounded-lg flex-shrink-0"
                    style={{ background: '#C9A84C15', color: '#C9A84C' }}
                  >
                    Itinéraire →
                  </a>
                </div>
              )
            })}
          </div>

          {/* Hébergements proche */}
          <div>
            <p className="text-[10px] font-bold text-[#888] uppercase tracking-wide mb-1.5">🏨 Hébergements proches</p>
            <div className="flex flex-wrap gap-1.5">
              {pts.filter(m => m.type === 'hebergement').map(m => (
                <a
                  key={m.nom}
                  href={buildDirectionsUrl(m)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] px-2.5 py-1 rounded-full transition-colors"
                  style={{ background: '#5B8FBF15', color: '#5B8FBF', border: '1px solid #5B8FBF25' }}
                >
                  🏨 {m.nom}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
