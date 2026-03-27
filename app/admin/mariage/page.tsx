'use client'
// app/admin/mariage/page.tsx — Liste des dossiers mariés avec accès rapide
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Users, Search, ExternalLink, Calendar, MapPin, CheckCircle, Clock } from 'lucide-react'
import Link from 'next/link'

interface Marié {
  uid: string
  noms_maries: string
  date_mariage: string
  lieu: string
  nb_invites_prevus: number
  contrat_actif: string | null
  grade: string
  whatsapp: string
  code_promo: string
}

function fdate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR')
}

export default function AdminMariagePage() {
  const [maries, setMaries] = useState<Marié[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/admin/liste-maries')
      .then(r => r.json())
      .then(d => setMaries(d.maries || []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = maries.filter(m =>
    !search ||
    m.noms_maries?.toLowerCase().includes(search.toLowerCase()) ||
    m.lieu?.toLowerCase().includes(search.toLowerCase()) ||
    m.code_promo?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div className="p-8 mt-14 lg:mt-0 flex justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500" />
    </div>
  )

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users size={24} className="text-gold-500" />
          <div>
            <h1 className="font-serif text-3xl font-semibold text-dark">Dossiers Mariés</h1>
            <p className="text-dark/50 text-sm">Invités · Communications · Journal d'activité</p>
          </div>
        </div>
        <span className="text-xs bg-beige-100 text-dark/50 px-3 py-1.5 rounded-full">{maries.length} dossiers</span>
      </div>

      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/30" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom, lieu ou code promo..."
          className="w-full max-w-sm pl-9 pr-4 py-2.5 border border-beige-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-300"
        />
      </div>

      <div className="bg-white border border-beige-200 rounded-2xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-dark/40 text-sm">
            {search ? 'Aucun dossier trouvé' : 'Aucun dossier marié'}
          </div>
        ) : (
          <div className="divide-y divide-beige-100">
            {filtered.map((m) => (
              <div key={m.uid} className="px-5 py-4 flex items-center gap-4 hover:bg-beige-50/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-dark truncate">{m.noms_maries}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-dark/40">
                    <span className="flex items-center gap-1"><Calendar size={10} /> {fdate(m.date_mariage)}</span>
                    {m.lieu && <span className="flex items-center gap-1"><MapPin size={10} /> {m.lieu}</span>}
                    {m.nb_invites_prevus > 0 && <span>{m.nb_invites_prevus} invités prévus</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {m.contrat_actif
                    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-green-100 text-green-700"><CheckCircle size={9} /> Contrat</span>
                    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-600"><Clock size={9} /> Sans contrat</span>
                  }
                  <Link
                    href={`/admin/invites/${m.uid}`}
                    className="px-3 py-1.5 rounded-xl border border-beige-200 text-xs text-dark/50 hover:bg-beige-50 transition-colors flex items-center gap-1"
                  >
                    <Users size={12} /> Invités
                  </Link>
                  <Link
                    href={`/admin/mariage/${m.uid}`}
                    className="px-3 py-1.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-white text-xs font-medium transition-colors flex items-center gap-1"
                  >
                    Dossier <ExternalLink size={11} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
