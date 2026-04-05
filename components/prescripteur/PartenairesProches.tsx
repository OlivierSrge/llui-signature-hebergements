'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MapPin, QrCode, Phone, Loader2, Navigation, RefreshCw } from 'lucide-react'
import { getPartenairesProches, type PartenaireProcheResult } from '@/actions/partenaires-geo'

// ── Quartiers de Kribi avec coordonnées GPS ──────────────────────
const QUARTIERS_KRIBI = [
  { label: 'Centre-ville Kribi',   lat: 2.9361, lng: 9.9094 },
  { label: 'Bord de mer / Plage',  lat: 2.9340, lng: 9.9125 },
  { label: 'Route de la Lobé',     lat: 2.9180, lng: 9.9050 },
  { label: 'Quartier Mbalmayo',    lat: 2.9420, lng: 9.9070 },
  { label: 'Grand Batanga',        lat: 2.8950, lng: 9.8980 },
  { label: 'Nouveau quartier',     lat: 2.9500, lng: 9.9100 },
]

// Refresh automatique toutes les 30 secondes quand la liste est affichée
const REFRESH_INTERVAL_MS = 30_000

type Phase =
  | 'intro'        // card d'explication, avant toute demande GPS
  | 'loading'      // GPS en cours ou chargement initial liste
  | 'ok'           // GPS accordé, liste partenaires prête
  | 'fallback'     // GPS refusé ou timeout → sélection quartier
  | 'quartier_ok'  // résultat depuis quartier sélectionné

interface Props {
  onScannerPartenaire: (partenaireId: string, nomPartenaire: string) => void
}

export default function PartenairesProches({ onScannerPartenaire }: Props) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [partenaires, setPartenaires] = useState<PartenaireProcheResult[]>([])
  const [quartierIndex, setQuartierIndex] = useState(0)
  const [fallbackMsg, setFallbackMsg] = useState('')
  const [blocage, setBlocage] = useState(false)
  const [dernierRefresh, setDernierRefresh] = useState<Date | null>(null)
  const [refreshEnCours, setRefreshEnCours] = useState(false)

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const positionRef = useRef<{ lat: number; lng: number } | null>(null)
  const phaseRef = useRef<Phase>('intro')
  const rafraichirRef = useRef<() => Promise<void>>(async () => {})

  // Synchronise phaseRef avec state (pour l'intervalle)
  useEffect(() => { phaseRef.current = phase }, [phase])

  // ── Rafraîchir la liste depuis la position actuelle ─────────────
  const rafraichir = useCallback(async () => {
    const pos = positionRef.current
    const ph = phaseRef.current
    if (!pos || (ph !== 'ok' && ph !== 'quartier_ok')) return
    setRefreshEnCours(true)
    try {
      const rayon = ph === 'quartier_ok' ? 3 : 2
      const res = await getPartenairesProches(pos.lat, pos.lng, rayon)
      setPartenaires(res)
      setDernierRefresh(new Date())
    } catch {}
    setRefreshEnCours(false)
  }, [])

  // Stocker la ref (évite la dépendance circulaire dans l'intervalle)
  useEffect(() => { rafraichirRef.current = rafraichir }, [rafraichir])

  // Auto-refresh toutes les 30s quand liste affichée
  useEffect(() => {
    if (phase !== 'ok' && phase !== 'quartier_ok') return
    const id = setInterval(() => rafraichirRef.current(), REFRESH_INTERVAL_MS)
    return () => clearInterval(id)
  }, [phase])

  // ── Lance la géolocalisation ─────────────────────────────────
  const lancerGeolocal = () => {
    if (!navigator.geolocation) {
      setFallbackMsg('Géolocalisation non disponible sur cet appareil.')
      setBlocage(false)
      setPhase('fallback')
      return
    }

    setPhase('loading')

    timeoutRef.current = setTimeout(() => {
      setFallbackMsg('Localisation lente. Choisissez votre quartier.')
      setPhase('fallback')
    }, 8000)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        positionRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        try {
          const res = await getPartenairesProches(pos.coords.latitude, pos.coords.longitude, 2)
          setPartenaires(res)
          setDernierRefresh(new Date())
          setPhase('ok')
        } catch {
          setFallbackMsg('Chargement impossible. Choisissez votre quartier.')
          setPhase('fallback')
        }
      },
      (err) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        setBlocage(err.code === 1)
        setFallbackMsg('')
        setPhase('fallback')
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    )
  }

  // ── Recherche depuis un quartier ─────────────────────────────
  const chercherParQuartier = async () => {
    const q = QUARTIERS_KRIBI[quartierIndex]
    positionRef.current = { lat: q.lat, lng: q.lng }
    setPhase('loading')
    try {
      const res = await getPartenairesProches(q.lat, q.lng, 3)
      setPartenaires(res)
      setDernierRefresh(new Date())
      setPhase('quartier_ok')
    } catch {
      setPartenaires([])
      setPhase('quartier_ok')
    }
  }

  // ── Scan depuis la liste ─────────────────────────────────────
  const handleScannerDepuisListe = (p: PartenaireProcheResult) => {
    if (!p.disponible || !p.qr_etablissement_data) return
    try {
      const parsed = JSON.parse(p.qr_etablissement_data)
      onScannerPartenaire(parsed.partenaire_id ?? p.id, parsed.nom ?? p.name)
    } catch {
      onScannerPartenaire(p.id, p.name)
    }
  }

  // ── Badge disponibilité ──────────────────────────────────────
  const BadgeDispo = ({ p }: { p: PartenaireProcheResult }) => {
    if (p.total_logements === 0) return null
    if (p.statut_disponibilite === 'disponible') {
      return (
        <p className="text-xs text-green-400 mt-0.5">
          ⭐ {p.logements_disponibles} logement{p.logements_disponibles > 1 ? 's' : ''} disponible{p.logements_disponibles > 1 ? 's' : ''} sur {p.total_logements}
        </p>
      )
    }
    if (p.statut_disponibilite === 'partiel') {
      return (
        <p className="text-xs text-amber-400 mt-0.5">
          🟡 {p.logements_disponibles} logement{p.logements_disponibles > 1 ? 's' : ''} disponible{p.logements_disponibles > 1 ? 's' : ''} sur {p.total_logements}
        </p>
      )
    }
    if (p.statut_disponibilite === 'complet') {
      return <p className="text-xs text-red-400 mt-0.5">🔴 Complet aujourd&apos;hui</p>
    }
    return null
  }

  // ── Phase : INTRO ────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/15 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-gold-400 shrink-0" />
          <p className="text-white font-semibold text-sm">Partenaires près de vous</p>
        </div>
        <p className="text-white/60 text-xs leading-relaxed">
          Pour voir les hébergements proches, nous avons besoin de votre position.
        </p>
        <div className="space-y-1.5 text-xs text-white/50">
          <p>✅ Utilisée uniquement pour trouver les partenaires proches</p>
          <p>✅ Non enregistrée</p>
          <p>✅ Non partagée</p>
        </div>
        <button onClick={lancerGeolocal}
          className="w-full py-3 rounded-xl bg-gold-500 hover:bg-gold-400 text-dark font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95">
          <Navigation size={15} /> Voir les partenaires proches
        </button>
        <button onClick={() => { setFallbackMsg(''); setPhase('fallback') }}
          className="w-full py-2 text-white/40 text-xs text-center underline hover:text-white/60 transition-colors">
          Entrer mon quartier à la main
        </button>
      </div>
    )
  }

  // ── Phase : LOADING ──────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/15 px-5 py-6 text-center space-y-3">
        <div className="flex items-center justify-center gap-2 text-white/70 text-sm font-medium">
          <MapPin size={15} className="text-gold-400" /> Recherche de votre position...
        </div>
        <Loader2 size={24} className="text-gold-400 animate-spin mx-auto" />
        <p className="text-white/30 text-xs">Cela peut prendre quelques secondes</p>
      </div>
    )
  }

  // ── Phase : FALLBACK ─────────────────────────────────────────
  if (phase === 'fallback') {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/15 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <MapPin size={15} className="text-white/50 shrink-0" />
          <p className="text-white/80 text-sm font-semibold">Position non disponible</p>
        </div>
        {fallbackMsg
          ? <p className="text-white/50 text-xs">{fallbackMsg}</p>
          : <p className="text-white/50 text-xs leading-relaxed">Pas de problème&nbsp;! Indiquez votre quartier pour trouver les partenaires proches de vous.</p>
        }
        <div className="space-y-2">
          <label className="text-xs text-white/40 font-medium">Mon quartier</label>
          <div className="relative">
            <select value={quartierIndex} onChange={(e) => setQuartierIndex(Number(e.target.value))}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white appearance-none focus:outline-none focus:ring-2 focus:ring-gold-400 pr-8">
              {QUARTIERS_KRIBI.map((q, i) => (
                <option key={q.label} value={i} className="bg-dark text-white">{q.label}</option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none text-xs">▼</span>
          </div>
        </div>
        <button onClick={chercherParQuartier}
          className="w-full py-3 rounded-xl bg-gold-500 hover:bg-gold-400 text-dark font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95">
          <MapPin size={14} /> Voir les partenaires de ce quartier
        </button>
        <button onClick={lancerGeolocal}
          className="w-full py-2 flex items-center justify-center gap-1.5 text-white/40 text-xs hover:text-white/60 transition-colors">
          <RefreshCw size={11} /> Réessayer avec ma position GPS
        </button>
        {blocage && (
          <p className="text-white/25 text-xs text-center leading-relaxed">
            Pour une localisation automatique, appuyez sur 🔒 dans votre navigateur et autorisez la localisation.
          </p>
        )}
      </div>
    )
  }

  // ── Phase : OK ou QUARTIER_OK — liste ───────────────────────
  const isQuartier = phase === 'quartier_ok'
  const rayonLabel = isQuartier ? '3km' : '2km'
  const quartierLabel = isQuartier ? QUARTIERS_KRIBI[quartierIndex].label : null

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
      {/* En-tête */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin size={13} className="text-gold-400 shrink-0" />
          <span className="text-white/70 text-sm font-medium truncate">
            {partenaires.length > 0
              ? `${partenaires.length} partenaire${partenaires.length > 1 ? 's' : ''} à moins de ${rayonLabel}`
              : `Aucun partenaire proche${isQuartier ? ` de ${quartierLabel}` : ''}`}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <button onClick={rafraichir} disabled={refreshEnCours} title="Rafraîchir"
            className="text-white/30 hover:text-white/60 transition-colors disabled:opacity-30">
            <RefreshCw size={12} className={refreshEnCours ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setPhase('intro')} className="text-white/30 text-xs underline">Masquer</button>
        </div>
      </div>

      {/* Sous-titre quartier + heure rafraîchissement */}
      {(isQuartier || dernierRefresh) && (
        <div className="px-4 py-1.5 border-b border-white/5 flex items-center justify-between gap-2">
          {isQuartier && quartierLabel && <p className="text-white/30 text-xs">📍 {quartierLabel}</p>}
          {dernierRefresh && (
            <p className="text-white/20 text-xs ml-auto">
              Mis à jour {dernierRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      )}

      {/* Corps */}
      {partenaires.length === 0 ? (
        <div className="py-6 px-4 text-center space-y-2">
          <p className="text-white/30 text-xs leading-relaxed">
            Aucun partenaire configuré dans ce secteur.<br />
            Scannez directement le QR du partenaire.
          </p>
          {isQuartier && (
            <button onClick={() => setPhase('fallback')} className="text-white/30 text-xs underline hover:text-white/50">
              Changer de quartier
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-white/10">
          {partenaires.map((p) => {
            const estComplet = p.statut_disponibilite === 'complet'
            return (
              <div key={p.id} className={`px-4 py-3 flex items-center justify-between gap-3 ${estComplet ? 'opacity-60' : ''}`}>
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">🏠 {p.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-gold-400/70 text-xs">
                      📏 {p.distance_km < 1 ? `${Math.round(p.distance_km * 1000)}m` : `${p.distance_km}km`} de vous
                    </span>
                  </div>
                  <BadgeDispo p={p} />
                  {p.address && (
                    <p className="text-white/30 text-xs mt-0.5 truncate max-w-[160px]">📍 {p.address}</p>
                  )}
                </div>
                <div className="shrink-0">
                  {p.disponible && !estComplet ? (
                    <button onClick={() => handleScannerDepuisListe(p)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-dark text-xs font-bold transition-all active:scale-95">
                      <QrCode size={12} /> Scanner
                    </button>
                  ) : p.phone ? (
                    <a href={`tel:${p.phone}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/20 text-white/60 hover:text-white text-xs font-medium transition-all">
                      <Phone size={12} /> Appeler
                    </a>
                  ) : (
                    <span className="text-white/20 text-xs">{estComplet ? 'Complet' : 'Non dispo'}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
