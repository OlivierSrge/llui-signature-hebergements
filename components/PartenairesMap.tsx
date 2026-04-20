'use client'
// components/PartenairesMap.tsx — Carte Google Maps des partenaires L&Lui Stars
// Import dynamique obligatoire (SSR: false) dans le composant parent.

import { useState, useEffect, useRef } from 'react'
import type { PartenaireAvecLocation } from '@/types/geolocation'

const KRIBI_CENTER = { lat: 2.9377, lng: 9.9087 }
const GOLD = '#C9A84C'

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

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDistance(km: number): string {
  return km < 1 ? `à ~${Math.round(km * 1000)} m` : `à ~${km.toFixed(1)} km`
}

interface Props {
  partenaires: PartenaireAvecLocation[]
  onScanRequest: (partenaire_id: string) => void
}

export default function PartenairesMap({ partenaires, onScanRequest }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const clientMarkerRef = useRef<google.maps.Marker | null>(null)

  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(false)
  const [clientPos, setClientPos] = useState<{ lat: number; lng: number } | null>(null)
  const [locLoading, setLocLoading] = useState(false)

  useEffect(() => {
    if (!apiKey || !mapContainerRef.current) return
    let cancelled = false

    chargerGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !mapContainerRef.current) return

        const map = new google.maps.Map(mapContainerRef.current, {
          center: KRIBI_CENTER,
          zoom: 13,
          mapTypeId: 'roadmap',
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          zoomControl: true,
        })
        mapRef.current = map
        infoWindowRef.current = new google.maps.InfoWindow()

        for (const p of partenaires) {
          // Marqueur doré custom
          const marker = new google.maps.Marker({
            position: { lat: p.latitude, lng: p.longitude },
            map,
            title: p.nom,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 14,
              fillColor: GOLD,
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 2.5,
            },
            label: { text: '⭐', fontSize: '12px' },
            zIndex: 5,
          })
          markersRef.current.push(marker)

          marker.addListener('click', () => {
            const dist = clientPos
              ? `<p style="font-size:11px;color:#666;margin-top:4px">${formatDistance(haversineKm(clientPos.lat, clientPos.lng, p.latitude, p.longitude))}</p>`
              : ''
            const photo = p.photoUrl
              ? `<img src="${p.photoUrl}" style="width:100%;height:80px;object-fit:cover;border-radius:8px;margin-bottom:8px" />`
              : ''
            const content = `
              <div style="max-width:220px;font-family:sans-serif">
                ${photo}
                <p style="font-size:14px;font-weight:700;color:#1A1A1A;margin:0">${p.nom}</p>
                <p style="font-size:11px;color:#888;margin:2px 0">🏷️ ${p.type}</p>
                ${p.adresse_gps ? `<p style="font-size:11px;color:#888">📍 ${p.adresse_gps}</p>` : ''}
                ${dist}
                <p style="font-size:11px;color:${GOLD};margin-top:4px">⭐ Partenaire L&amp;Lui Stars</p>
                <button
                  onclick="window.__llui_scan_request__('${p.id}')"
                  style="margin-top:8px;width:100%;padding:8px;background:${GOLD};color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer"
                >
                  📷 Scanner le QR
                </button>
              </div>
            `
            infoWindowRef.current!.setContent(content)
            infoWindowRef.current!.open(map, marker)
          })
        }

        setChargement(false)
      })
      .catch(() => { if (!cancelled) { setChargement(false); setErreur(true) } })

    return () => {
      cancelled = true
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      markersRef.current.forEach((m: any) => m.setMap(null))
      markersRef.current = []
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, partenaires])

  // Expose scan callback au DOM (InfoWindow est un fragment HTML, pas JSX)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__llui_scan_request__ = (id: string) => {
      infoWindowRef.current?.close()
      onScanRequest(id)
    }
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__llui_scan_request__
    }
  }, [onScanRequest])

  // Mettre à jour distances si clientPos change
  useEffect(() => {
    if (!mapRef.current || !clientPos) return
    // Fermer l'InfoWindow ouverte (distances mises à jour au prochain clic)
    infoWindowRef.current?.close()

    // Marqueur bleu position client
    if (clientMarkerRef.current) clientMarkerRef.current.setMap(null)
    clientMarkerRef.current = new google.maps.Marker({
      position: clientPos,
      map: mapRef.current,
      title: 'Votre position',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#3B82F6',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
      },
      zIndex: 10,
    })
    mapRef.current.setCenter(clientPos)
    mapRef.current.setZoom(14)
  }, [clientPos])

  function handleGeolocaliser() {
    setLocLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setClientPos({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocLoading(false)
      },
      () => setLocLoading(false),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  if (!apiKey) {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 text-center">
        ⚠️ Carte indisponible — clé <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> manquante.
      </div>
    )
  }

  if (partenaires.length === 0) {
    return (
      <div className="rounded-xl bg-[#F5F0E8]/60 border border-[#F5F0E8] p-6 text-center space-y-2">
        <div className="text-2xl">🗺️</div>
        <p className="text-sm font-semibold text-[#1A1A1A]">Carte bientôt disponible</p>
        <p className="text-xs text-[#1A1A1A]/50">
          Les partenaires L&Lui Stars seront géolocalisés prochainement.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative rounded-2xl overflow-hidden border border-[#F5F0E8]" style={{ height: 380 }}>
        <div ref={mapContainerRef} className="w-full h-full" />

        {chargement && (
          <div className="absolute inset-0 bg-[#F5F0E8] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {erreur && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-[#1A1A1A]/40">
            Impossible de charger la carte
          </div>
        )}

        {!chargement && !erreur && (
          <button
            onClick={handleGeolocaliser}
            disabled={locLoading}
            className="absolute top-3 right-3 bg-white shadow-md rounded-xl px-3 py-2 text-xs font-semibold text-[#1A1A1A] border border-[#F5F0E8] hover:bg-[#F5F0E8] transition-colors disabled:opacity-50"
          >
            {locLoading ? '...' : '📍 Me localiser'}
          </button>
        )}
      </div>

      {partenaires.length > 0 && (
        <p className="text-[11px] text-[#1A1A1A]/40 text-center">
          {partenaires.length} partenaire{partenaires.length > 1 ? 's' : ''} — cliquez sur ⭐ pour Scanner le QR
        </p>
      )}
    </div>
  )
}
