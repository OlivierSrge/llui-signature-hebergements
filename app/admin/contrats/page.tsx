'use client'
// app/admin/contrats/page.tsx — Liste de tous les contrats mariages
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { FileText, Search, CheckCircle, Clock, ExternalLink, Download } from 'lucide-react'
import Link from 'next/link'

interface Contrat {
  contrat_id: string
  marie_uid: string
  noms_maries: string
  statut: 'en_attente_signature' | 'signe' | 'annule'
  date_generation: string
  signed_at: string | null
  pdf_url: string | null
  montant_total: number
  pack_nom: string
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

export default function ContratsIndexPage() {
  const [contrats, setContrats] = useState<Contrat[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/admin/contrats')
      .then((r) => r.json())
      .then((d) => setContrats(d.contrats || []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = contrats.filter((c) =>
    !search || c.noms_maries?.toLowerCase().includes(search.toLowerCase()) || c.contrat_id?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div className="p-8 mt-14 lg:mt-0 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500" /></div>
  )

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <FileText size={24} className="text-gold-500" />
          <h1 className="font-serif text-3xl font-semibold text-dark">Contrats Mariages</h1>
        </div>
        <p className="text-dark/50 text-sm">Génération PDF · Signature OTP · Archivage automatique</p>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un couple ou N° contrat..."
            className="w-full pl-9 pr-4 py-2.5 border border-beige-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-300"
          />
        </div>
        <div className="flex gap-2 text-xs text-dark/50">
          <span className="px-2 py-1 bg-green-50 text-green-600 rounded-full">{contrats.filter((c) => c.statut === 'signe').length} signés</span>
          <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded-full">{contrats.filter((c) => c.statut === 'en_attente_signature').length} en attente</span>
        </div>
      </div>

      <div className="bg-white border border-beige-200 rounded-2xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-dark/40 text-sm">
            {search ? 'Aucun contrat trouvé pour cette recherche' : 'Aucun contrat généré'}
          </div>
        ) : (
          <div className="divide-y divide-beige-100">
            {filtered.map((c) => (
              <div key={c.contrat_id} className="px-6 py-4 flex items-center gap-4">
                <FileText size={20} className="text-gold-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark">{c.noms_maries}</p>
                  <p className="text-xs text-dark/50">{c.contrat_id} · {c.pack_nom} · {fmt(c.montant_total)}</p>
                  <p className="text-xs text-dark/30">
                    {c.date_generation ? new Date(c.date_generation).toLocaleDateString('fr-FR') : '—'}
                    {c.signed_at && ` · Signé le ${new Date(c.signed_at).toLocaleDateString('fr-FR')}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {c.statut === 'signe'
                    ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-100 text-green-700"><CheckCircle size={11} /> Signé</span>
                    : <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-700"><Clock size={11} /> En attente</span>
                  }
                  <Link
                    href={`/admin/contrats/${c.marie_uid}`}
                    className="p-2 rounded-lg border border-beige-200 text-dark/40 hover:bg-beige-50 transition-colors"
                    title="Gérer"
                  >
                    <ExternalLink size={14} />
                  </Link>
                  {c.pdf_url && (
                    <a href={c.pdf_url} target="_blank" rel="noopener noreferrer"
                      className="p-2 rounded-lg border border-beige-200 text-dark/40 hover:bg-beige-50 transition-colors">
                      <Download size={14} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
