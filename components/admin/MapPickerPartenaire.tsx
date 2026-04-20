'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, Loader2, CheckCircle2, Search, X, AlertTriangle } from 'lucide-react'
import { getAllPartenairesAvecGps, type PartenaireGps } from '@/actions/partners'

const KRIBI_CENTER = { lat: 2.9361, lng: 9.9094 }
const KRIBI_BOUNDS = { north: 3.050, south: 2.800, east: 10.050, west: 9.750 }

// Chargement unique du script Maps (singleton)
let mapsLoaded = false
let mapsLoadPromise: Promise<void> | null = null

function chargerGoogleMaps(apiKey: string): Promise<void> {
  if (mapsLoaded) return Promise.resolve()
  if (mapsLoadPromise) return mapsLoadPromise
  mapsLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=fr`
    script.async = true
    script.onload = () => { mapsLoaded = true; resolve() }
    script.onerror = () => reject(new Error('Échec chargement Google Maps'))
    document.head.appendChild(script)
  })
  return mapsLoadPromise
}

// ── Fallback si clé absente ───────────────────────────────────────────────────
function FallbackManuel({
  onPositionValidee,
  latInit,
  lngInit,
}: {
  onPositionValidee: (lat: number, lng: number, adresse: string) => void
  latInit?: number
  lngInit?: number
}) {
  const [lat, setLat] = useState(latInit ? String(latInit) : '')
  const [lng, setLng] = useState(lngInit ? String(lngInit) : '')
  const [adresse, setAdresse] = useState('')
  const [valide, setValide] = useState(false)

  const handleValider = () => {
    const latN = parseFloat(lat)
    const lngN = parseFloat(lng)
    if (isNaN(latN) || isNaN(lngN)) return
    onPositionValidee(latN, lngN, adresse)
    setValide(true)
    setTimeout(() => setValide(false), 3000)
  }

  return (
    <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-6 space-y-4">
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-800 text-sm">Carte non disponible</p>
          <p className="text-amber-700 text-xs mt-1">
            Configurez la clé Google Maps dans Vercel → Environment Variables :
            <code className="bg-amber-100 px-1 py-0.5 rounded ml-1 font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>
          </p>
        </div>
      </div>
      <p className="text-xs text-amber-700 bg-amber-100 rounded-xl px-4 py-2">
        💡 <strong>Astuce :</strong> Ouvrez Google Maps, faites un clic droit sur l&apos;adresse, copiez les coordonnées affichées.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-dark/60 font-medium block mb-1">Latitude</label>
          <input type="number" step="any" placeholder="ex: 2.9361" value={lat}
            onChange={e => setLat(e.target.value)}
            className="w-full border border-dark/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400" />
        </div>
        <div>
          <label className="text-xs text-dark/60 font-medium block mb-1">Longitude</label>
          <input type="number" step="any" placeholder="ex: 9.9094" value={lng}
            onChange={e => setLng(e.target.value)}
            className="w-full border border-dark/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400" />
        </div>
      </div>
      <div>
        <label className="text-xs text-dark/60 font-medium block mb-1">Adresse (optionnel)</label>
        <input type="text" placeholder="Ex: Route de la Lobé, Kribi" value={adresse}
          onChange={e => setAdresse(e.target.value)}
          className="w-full border border-dark/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400" />
      </div>
      <button type="button" onClick={handleValider} disabled={!lat || !lng}
        className="w-full py-3 rounded-xl bg-dark text-white font-semibold text-sm hover:bg-dark/80 disabled:opacity-40 flex items-center justify-center gap-2">
        {valide ? <><CheckCircle2 size={15} className="text-green-400" /> Position enregistrée !</> : <><MapPin size={15} /> Valider position</>}
      </button>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
interface Props {
  partenaireId?: string
  latitudeInitiale?: number
  longitudeInitiale?: number
  nomPartenaire?: string
  readOnly?: boolean
  onPositionValidee: (lat: number, lng: number, adresse: string) => void
}

export default function MapPickerPartenaire({
  partenaireId,
  latitudeInitiale,
  longitudeInitiale,
  nomPartenaire,
  readOnly = false,
  onPositionValidee,
}: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const autocompleteInputRef = useRef<HTMLInputElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markerRougeRef = useRef<google.maps.Marker | null>(null)
  const marqueursBleusRef = useRef<google.maps.Marker[]>([])

  const [chargement, setChargement] = useState(true)
  const [erreurMaps, setErreurMaps] = useState(false)
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    latitudeInitiale && longitudeInitiale ? { lat: latitudeInitiale, lng: longitudeInitiale } : null
  )
  const [adresseAffichee, setAdresseAffichee] = useState('')
  const [partenairesExistants, setPartenairesExistants] = useState<PartenaireGps[]>([])

  // Charger tous les partenaires avec GPS pour les marqueurs bleus
  useEffect(() => {
    getAllPartenairesAvecGps().then(ps => {
      // Exclure le partenaire en cours d'édition
      setPartenairesExistants(ps.filter(p => p.id !== partenaireId))
    }).catch(() => {})
  }, [partenaireId])

  // Reverse geocoding
  const reverseGeocoder = useCallback(async (lat: number, lng: number) => {
    if (!apiKey) return ''
    try {
      const resp = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=fr`
      )
      const data = await resp.json()
      if (data.results?.[0]) return data.results[0].formatted_address as string
    } catch {}
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }, [apiKey])

  // Placer/déplacer le marqueur rouge
  const placerMarqueurRouge = useCallback((lat: number, lng: number) => {
    if (!mapRef.current) return
    if (markerRougeRef.current) markerRougeRef.current.setMap(null)
    const marker = new google.maps.Marker({
      position: { lat, lng },
      map: mapRef.current,
      draggable: !readOnly,
      title: nomPartenaire ?? 'Position',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#E24B4A',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
      },
      zIndex: 10,
    })
    if (!readOnly) {
      marker.addListener('dragend', async (e: google.maps.MapMouseEvent) => {
        const lat2 = e.latLng!.lat()
        const lng2 = e.latLng!.lng()
        setPosition({ lat: lat2, lng: lng2 })
        setAdresseAffichee(`${lat2.toFixed(5)}, ${lng2.toFixed(5)}`)
        const adresse = await reverseGeocoder(lat2, lng2)
        setAdresseAffichee(adresse)
      })
    }
    markerRougeRef.current = marker
  }, [readOnly, nomPartenaire, reverseGeocoder])

  // Initialisation de la carte
  useEffect(() => {
    if (!apiKey || !mapContainerRef.current || partenairesExistants === null) return
    let cancelled = false

    chargerGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !mapContainerRef.current) return

        const map = new google.maps.Map(mapContainerRef.current, {
          center: position ?? KRIBI_CENTER,
          zoom: position ? 16 : 14,
          mapTypeId: 'roadmap',
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
        })
        mapRef.current = map

        // Marqueurs bleus — partenaires existants
        for (const p of partenairesExistants) {
          const m = new google.maps.Marker({
            position: { lat: p.latitude, lng: p.longitude },
            map,
            title: p.name,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#4F8EF7',
              fillOpacity: 0.9,
              strokeColor: '#fff',
              strokeWeight: 2,
            },
            zIndex: 5,
          })
          const infoWindow = new google.maps.InfoWindow({
            content: `<div style="font-size:13px;font-weight:600;color:#1A1A1A">${p.name}</div>${p.address ? `<div style="font-size:11px;color:#666;margin-top:2px">${p.address}</div>` : ''}`,
          })
          m.addListener('click', () => infoWindow.open(map, m))
          marqueursBleusRef.current.push(m)
        }

        // Marqueur rouge initial si coordonnées fournies
        if (position) {
          placerMarqueurRouge(position.lat, position.lng)
          reverseGeocoder(position.lat, position.lng).then(setAdresseAffichee)
        }

        // Clic sur la carte → marqueur rouge + geocoding
        if (!readOnly) {
          map.addListener('click', async (e: google.maps.MapMouseEvent) => {
            const lat = e.latLng!.lat()
            const lng = e.latLng!.lng()
            placerMarqueurRouge(lat, lng)
            setPosition({ lat, lng })
            setAdresseAffichee(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
            const adresse = await reverseGeocoder(lat, lng)
            setAdresseAffichee(adresse)
          })
        }

        // Places Autocomplete
        if (!readOnly && autocompleteInputRef.current) {
          const autocomplete = new google.maps.places.Autocomplete(autocompleteInputRef.current, {
            componentRestrictions: { country: 'cm' },
            bounds: new google.maps.LatLngBounds(
              { lat: KRIBI_BOUNDS.south, lng: KRIBI_BOUNDS.west },
              { lat: KRIBI_BOUNDS.north, lng: KRIBI_BOUNDS.east }
            ),
            fields: ['geometry', 'formatted_address'],
          })
          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace()
            if (!place.geometry?.location) return
            const lat = place.geometry.location.lat()
            const lng = place.geometry.location.lng()
            map.setCenter({ lat, lng })
            map.setZoom(17)
            placerMarqueurRouge(lat, lng)
            setPosition({ lat, lng })
            const adresse = place.formatted_address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
            setAdresseAffichee(adresse)
            if (autocompleteInputRef.current) autocompleteInputRef.current.value = ''
          })
        }

        setChargement(false)
      })
      .catch(() => {
        if (!cancelled) { setChargement(false); setErreurMaps(true) }
      })

    return () => {
      cancelled = true
      if (markerRougeRef.current) markerRougeRef.current.setMap(null)
      marqueursBleusRef.current.forEach(m => m.setMap(null))
      marqueursBleusRef.current = []
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partenairesExistants, apiKey])

  const effacer = () => {
    if (markerRougeRef.current) { markerRougeRef.current.setMap(null); markerRougeRef.current = null }
    setPosition(null)
    setAdresseAffichee('')
  }

  const valider = () => {
    if (!position) return
    onPositionValidee(position.lat, position.lng, adresseAffichee)
  }

  // Pas de clé API → fallback manuel
  if (!apiKey) {
    return (
      <FallbackManuel
        onPositionValidee={onPositionValidee}
        latInit={latitudeInitiale}
        lngInit={longitudeInitiale}
      />
    )
  }

  return (
    <div className="space-y-3">
      {/* Barre de recherche Places */}
      {!readOnly && (
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/30 pointer-events-none" />
          <input
            ref={autocompleteInputRef}
            type="text"
            placeholder="Rechercher une adresse à Kribi..."
            className="w-full border border-dark/20 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
          />
        </div>
      )}

      {/* Carte */}
      <div className="relative rounded-2xl overflow-hidden border border-beige-200" style={{ height: 450 }}>
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Loading overlay */}
        {chargement && (
          <div className="absolute inset-0 bg-beige-50 flex items-center justify-center gap-2">
            <Loader2 size={20} className="animate-spin text-gold-500" />
            <span className="text-sm text-dark/50">Chargement de la carte...</span>
          </div>
        )}

        {/* Légende */}
        {!chargement && !erreurMaps && (
          <div className="absolute bottom-3 left-3 bg-white/95 rounded-xl px-3 py-2 shadow-sm border border-beige-200 flex items-center gap-3 text-xs text-dark/60">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#4F8EF7] inline-block" /> Autres partenaires</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#E24B4A] inline-block" /> {nomPartenaire ?? 'Ce partenaire'}</span>
          </div>
        )}

        {!readOnly && !chargement && !erreurMaps && !position && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-dark/80 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none">
            Cliquez sur la carte pour positionner l&apos;établissement
          </div>
        )}
      </div>

      {/* Erreur chargement Maps */}
      {erreurMaps && (
        <FallbackManuel onPositionValidee={onPositionValidee} latInit={latitudeInitiale} lngInit={longitudeInitiale} />
      )}

      {/* Infos position + boutons */}
      {!erreurMaps && (
        <div className="bg-beige-50 rounded-xl border border-beige-200 px-4 py-3">
          {position ? (
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-dark font-medium leading-snug">{adresseAffichee || 'Adresse en cours de chargement...'}</p>
              </div>
              <p className="text-xs text-dark/50 font-mono">
                Lat : {position.lat.toFixed(5)} | Lng : {position.lng.toFixed(5)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-dark/40 text-center">Aucune position sélectionnée</p>
          )}

          {!readOnly && (
            <div className="flex gap-2 mt-3">
              <button type="button" onClick={effacer} disabled={!position}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dark/20 text-sm text-dark/60 hover:bg-white disabled:opacity-30 transition-colors">
                <X size={14} /> Effacer
              </button>
              <button type="button" onClick={valider} disabled={!position}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-dark text-white text-sm font-semibold hover:bg-dark/80 disabled:opacity-30 transition-colors">
                <CheckCircle2 size={14} /> Valider position
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
