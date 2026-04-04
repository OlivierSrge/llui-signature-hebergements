'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { getDisponibilitesPrescripteur } from '@/actions/prescripteurs'

type Dispo = 'libre' | 'reserve' | 'arrive' | 'depart'

interface HebergDispo {
  id: string
  nom: string
  jours: Record<string, Dispo>
}

const JOUR_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const MOIS_LABELS = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc']

function getDayColor(status: Dispo) {
  switch (status) {
    case 'libre':   return 'bg-green-500/20 text-green-300 border-green-500/30'
    case 'reserve': return 'bg-red-500/20 text-red-300 border-red-500/30'
    case 'arrive':  return 'bg-orange-500/20 text-orange-300 border-orange-500/30'
    case 'depart':  return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
  }
}

function getDayLabel(status: Dispo) {
  switch (status) {
    case 'libre':   return 'Libre'
    case 'reserve': return 'Occupé'
    case 'arrive':  return 'Arrivée'
    case 'depart':  return 'Départ'
  }
}

export default function DisponibilitesClient() {
  const router = useRouter()
  const [hebergements, setHebergements] = useState<HebergDispo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const uid = sessionStorage.getItem('prescripteur_uid')
    if (!uid) { router.replace('/prescripteur'); return }

    getDisponibilitesPrescripteur(uid)
      .then((data) => setHebergements(data.hebergements))
      .catch(() => setError('Impossible de charger les disponibilités.'))
      .finally(() => setIsLoading(false))
  }, [router])

  // Generate 14 day slots
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days: string[] = []
  for (let i = 0; i < 14; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    days.push(d.toISOString().split('T')[0])
  }

  return (
    <div className="min-h-screen bg-dark text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
        <button onClick={() => router.back()} className="text-white/50 hover:text-white p-1">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="font-semibold">Disponibilités</h1>
          <p className="text-white/40 text-xs">14 jours à venir</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-5 py-3 border-b border-white/5">
        {(['libre', 'reserve', 'arrive', 'depart'] as Dispo[]).map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-full border ${getDayColor(s)}`} />
            <span className="text-white/50 text-xs">{getDayLabel(s)}</span>
          </div>
        ))}
      </div>

      <div className="flex-1 px-5 py-5">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={28} className="text-gold-400 animate-spin" />
          </div>
        )}

        {error && <p className="text-red-400 text-sm text-center py-8">{error}</p>}

        {!isLoading && hebergements.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-white/40 text-sm">Aucune résidence assignée.</p>
            <p className="text-white/30 text-xs mt-1">Contactez l'équipe L&Lui pour être assigné à des résidences.</p>
          </div>
        )}

        {hebergements.map((h) => (
          <div key={h.id} className="mb-8">
            <h2 className="text-sm font-semibold text-gold-300 mb-3">{h.nom}</h2>
            <div className="grid grid-cols-7 gap-1.5">
              {days.map((ds) => {
                const date = new Date(ds + 'T00:00:00')
                const status = h.jours[ds] ?? 'libre'
                const isToday = ds === days[0]
                return (
                  <div
                    key={ds}
                    className={`rounded-xl border p-1.5 text-center ${getDayColor(status)} ${isToday ? 'ring-1 ring-gold-400' : ''}`}
                  >
                    <p className="text-[9px] opacity-60">{JOUR_LABELS[date.getDay()]}</p>
                    <p className="text-sm font-semibold leading-none mt-0.5">{date.getDate()}</p>
                    <p className="text-[9px] opacity-60 mt-0.5">{MOIS_LABELS[date.getMonth()]}</p>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
