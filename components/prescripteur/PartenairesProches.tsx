'use client'

import { useState } from 'react'
import { MapPin, QrCode, Phone, Loader2, Navigation } from 'lucide-react'
import { getPartenairesProches, type PartenaireProcheResult } from '@/actions/partenaires-geo'

interface Props {
  onScannerPartenaire: (partenaireId: string, nomPartenaire: string) => void
}

export default function PartenairesProches({ onScannerPartenaire }: Props) {
  const [etat, setEtat] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [partenaires, setPartenaires] = useState<PartenaireProcheResult[]>([])
  const [erreur, setErreur] = useState('')

  const detecter = () => {
    if (!navigator.geolocation) {
      setErreur('Géolocalisation non disponible sur cet appareil.')
      setEtat('error')
      return
    }
    setEtat('loading')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await getPartenairesProches(pos.coords.latitude, pos.coords.longitude, 2)
          setPartenaires(res)
          setEtat('ok')
        } catch {
          setErreur('Impossible de charger les partenaires proches.')
          setEtat('error')
        }
      },
      (err) => {
        setErreur(
          err.code === 1
            ? 'Accès à la position refusé. Autorisez la géolocalisation dans vos paramètres.'
            : 'Impossible d\'obtenir votre position.'
        )
        setEtat('error')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleScannerDepuisListe = (p: PartenaireProcheResult) => {
    if (!p.disponible || !p.qr_etablissement_data) return
    // Injecte directement les données du QR partenaire pour lancer le scan
    try {
      const parsed = JSON.parse(p.qr_etablissement_data)
      onScannerPartenaire(parsed.partenaire_id ?? p.id, parsed.nom ?? p.name)
    } catch {
      onScannerPartenaire(p.id, p.name)
    }
  }

  if (etat === 'idle') {
    return (
      <button
        onClick={detecter}
        className="w-full py-3 rounded-2xl border border-white/20 text-white/60 hover:text-white hover:border-white/40 font-medium text-sm flex items-center justify-center gap-2 transition-all"
      >
        <Navigation size={15} /> Voir les partenaires proches (&lt;2km)
      </button>
    )
  }

  if (etat === 'loading') {
    return (
      <div className="w-full py-4 flex items-center justify-center gap-2 text-white/50 text-sm">
        <Loader2 size={16} className="animate-spin" /> Localisation en cours...
      </div>
    )
  }

  if (etat === 'error') {
    return (
      <div className="rounded-2xl bg-red-500/10 border border-red-400/30 px-4 py-3 text-center">
        <p className="text-red-300 text-sm">{erreur}</p>
        <button onClick={() => setEtat('idle')} className="text-white/40 text-xs mt-2 underline">Réessayer</button>
      </div>
    )
  }

  // etat === 'ok'
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-gold-400" />
          <span className="text-white/70 text-sm font-medium">
            {partenaires.length > 0
              ? `${partenaires.length} partenaire${partenaires.length > 1 ? 's' : ''} à moins de 2km`
              : 'Aucun partenaire proche'}
          </span>
        </div>
        <button onClick={() => setEtat('idle')} className="text-white/30 text-xs underline">Masquer</button>
      </div>

      {partenaires.length === 0 ? (
        <p className="text-white/30 text-xs text-center py-5 px-4">
          Aucun partenaire configuré dans un rayon de 2km.<br />
          Scannez directement le QR du partenaire.
        </p>
      ) : (
        <div className="divide-y divide-white/10">
          {partenaires.map((p) => (
            <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{p.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-gold-400/70 text-xs">📍 {p.distance_km < 1 ? `${Math.round(p.distance_km * 1000)}m` : `${p.distance_km}km`}</span>
                  {p.address && <span className="text-white/30 text-xs truncate max-w-[120px]">{p.address}</span>}
                </div>
              </div>
              <div className="shrink-0">
                {p.disponible ? (
                  <button
                    onClick={() => handleScannerDepuisListe(p)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-dark text-xs font-bold transition-all active:scale-95"
                  >
                    <QrCode size={12} /> Scanner
                  </button>
                ) : p.phone ? (
                  <a
                    href={`tel:${p.phone}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/20 text-white/60 hover:text-white text-xs font-medium transition-all"
                  >
                    <Phone size={12} /> Appeler
                  </a>
                ) : (
                  <span className="text-white/20 text-xs">Non dispo</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
