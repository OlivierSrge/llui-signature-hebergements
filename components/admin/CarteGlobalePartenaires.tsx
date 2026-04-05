'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Map, X } from 'lucide-react'
import type { PartenaireGps } from '@/actions/partners'

const MapPickerPartenaire = dynamic(
  () => import('@/components/admin/MapPickerPartenaire'),
  { ssr: false, loading: () => <div className="h-[500px] rounded-2xl bg-beige-50 flex items-center justify-center text-dark/30 text-sm">Chargement...</div> }
)

interface Props {
  partenaires: PartenaireGps[]
}

export default function CarteGlobalePartenaires({ partenaires }: Props) {
  const [ouvert, setOuvert] = useState(false)

  const avecGps = partenaires.length
  if (avecGps === 0) return null

  return (
    <>
      <button
        onClick={() => setOuvert(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-beige-200 text-dark/60 rounded-xl text-sm font-medium hover:border-dark/30 hover:text-dark transition-colors"
      >
        <Map size={15} /> Voir sur la carte ({avecGps})
      </button>

      {ouvert && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-beige-200">
              <div>
                <h2 className="font-semibold text-dark">🗺️ Tous les partenaires sur la carte</h2>
                <p className="text-dark/40 text-xs mt-0.5">{avecGps} partenaire{avecGps > 1 ? 's' : ''} positionné{avecGps > 1 ? 's' : ''} — lecture seule</p>
              </div>
              <button
                onClick={() => setOuvert(false)}
                className="p-2 rounded-xl hover:bg-beige-50 text-dark/40 hover:text-dark transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <MapPickerPartenaire
                readOnly
                onPositionValidee={() => {}}
                latitudeInitiale={partenaires[0]?.latitude}
                longitudeInitiale={partenaires[0]?.longitude}
              />
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {partenaires.map(p => (
                  <div key={p.id} className="flex items-center gap-2 px-3 py-2 bg-beige-50 rounded-xl text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#4F8EF7] shrink-0" />
                    <span className="font-medium text-dark truncate">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
