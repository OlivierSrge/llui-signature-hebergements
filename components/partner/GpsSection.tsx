'use client'

import { useState } from 'react'
import { MapPin, Loader2, CheckCircle2, Navigation } from 'lucide-react'
import { sauvegarderGpsPartenaire } from '@/actions/partners'

interface Props {
  partnerId: string
  latitudeInitiale: number | null
  longitudeInitiale: number | null
}

export default function GpsSection({ partnerId, latitudeInitiale, longitudeInitiale }: Props) {
  const [lat, setLat] = useState(latitudeInitiale ? String(latitudeInitiale) : '')
  const [lng, setLng] = useState(longitudeInitiale ? String(longitudeInitiale) : '')
  const [etat, setEtat] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const detecterPosition = () => {
    if (!navigator.geolocation) {
      setMessage('Géolocalisation non disponible sur cet appareil.')
      setEtat('error')
      return
    }
    setEtat('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude))
        setLng(String(pos.coords.longitude))
        setEtat('idle')
      },
      () => {
        setMessage('Impossible d\'obtenir votre position. Saisissez manuellement.')
        setEtat('error')
        setTimeout(() => setEtat('idle'), 3000)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const sauvegarder = async () => {
    const latNum = parseFloat(lat)
    const lngNum = parseFloat(lng)
    if (isNaN(latNum) || isNaN(lngNum)) {
      setMessage('Latitude et longitude invalides.')
      setEtat('error')
      setTimeout(() => setEtat('idle'), 3000)
      return
    }
    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      setMessage('Coordonnées hors plage valide.')
      setEtat('error')
      setTimeout(() => setEtat('idle'), 3000)
      return
    }
    setEtat('loading')
    const res = await sauvegarderGpsPartenaire(partnerId, latNum, lngNum)
    if (res.success) {
      setMessage('Position enregistrée ! Les prescripteurs vous verront dans leur liste.')
      setEtat('ok')
      setTimeout(() => setEtat('idle'), 4000)
    } else {
      setMessage(res.error ?? 'Erreur lors de la sauvegarde.')
      setEtat('error')
      setTimeout(() => setEtat('idle'), 3000)
    }
  }

  const hasCoordsInitiales = latitudeInitiale !== null && longitudeInitiale !== null

  return (
    <div className="bg-white rounded-2xl border border-beige-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-dark flex items-center gap-2">
            <MapPin size={16} className="text-gold-500" /> Position GPS
          </h2>
          <p className="text-dark/40 text-xs mt-0.5">
            {hasCoordsInitiales
              ? `Position enregistrée : ${latitudeInitiale!.toFixed(5)}, ${longitudeInitiale!.toFixed(5)}`
              : 'Aucune position — les prescripteurs ne vous voient pas dans leur liste de proximité'}
          </p>
        </div>
        {hasCoordsInitiales && (
          <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">✓ Visible</span>
        )}
      </div>

      <div className="space-y-3">
        {/* Bouton auto */}
        <button
          onClick={detecterPosition}
          disabled={etat === 'loading'}
          className="w-full py-3 rounded-xl border-2 border-dashed border-gold-300 hover:border-gold-500 text-gold-600 hover:text-gold-700 font-medium text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {etat === 'loading' ? <Loader2 size={15} className="animate-spin" /> : <Navigation size={15} />}
          📍 Utiliser ma position actuelle
        </button>

        {/* Saisie manuelle */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-dark/50 font-medium mb-1 block">Latitude</label>
            <input
              type="number"
              step="any"
              placeholder="ex: 4.0511"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="w-full border border-dark/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>
          <div>
            <label className="text-xs text-dark/50 font-medium mb-1 block">Longitude</label>
            <input
              type="number"
              step="any"
              placeholder="ex: 9.7679"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              className="w-full border border-dark/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>
        </div>

        {/* Message feedback */}
        {etat !== 'idle' && etat !== 'loading' && (
          <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${
            etat === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
          }`}>
            {etat === 'ok' && <CheckCircle2 size={15} className="mt-0.5 shrink-0" />}
            {message}
          </div>
        )}

        {/* Bouton sauvegarder */}
        <button
          onClick={sauvegarder}
          disabled={etat === 'loading' || !lat || !lng}
          className="w-full py-3 rounded-xl bg-dark text-white font-semibold text-sm hover:bg-dark/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {etat === 'loading' ? <Loader2 size={15} className="animate-spin" /> : <MapPin size={15} />}
          Enregistrer la position
        </button>
      </div>
    </div>
  )
}
