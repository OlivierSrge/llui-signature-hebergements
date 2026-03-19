'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { LOYALTY_LEVELS } from '@/lib/loyaltyDefaults'

interface Client {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  niveau: string
  totalSejours: number
  totalPoints: number
  boutiquePromoCode?: string | null
  boutiquePromoCodeExpiry?: string | null
  boutiquePromoCodeSentAt?: string | null
  referrals?: any[]
}

interface Props {
  clients: Client[]
  total: number
  totalPages: number
  currentPage: number
}

const NIVEAU_COLORS: Record<string, string> = {
  novice:      'bg-gray-100 text-gray-700 border-gray-200',
  explorateur: 'bg-blue-100 text-blue-700 border-blue-200',
  ambassadeur: 'bg-amber-100 text-amber-700 border-amber-200',
  excellence:  'bg-dark/10 text-dark border-dark/20',
}

export default function FideliteClientsTable({ clients, total, totalPages, currentPage }: Props) {
  const [search, setSearch] = useState('')
  const [niveauFilter, setNiveauFilter] = useState('')
  const [promoFilter, setPromoFilter] = useState('')

  const now = new Date()

  const getPromoStatus = (c: Client): { label: string; color: string } => {
    if (!c.boutiquePromoCode) return { label: 'Aucun', color: 'text-dark/40' }
    if (!c.boutiquePromoCodeExpiry) return { label: 'Actif', color: 'text-green-600' }
    if (new Date(c.boutiquePromoCodeExpiry) <= now) return { label: 'Expiré', color: 'text-red-500' }
    return { label: c.boutiquePromoCodeSentAt ? 'Envoyé' : 'Non envoyé', color: c.boutiquePromoCodeSentAt ? 'text-green-600' : 'text-amber-600' }
  }

  const buildUrl = (page: number) => {
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (niveauFilter) params.set('niveau', niveauFilter)
    if (promoFilter) params.set('promo', promoFilter)
    params.set('page', String(page))
    return `/admin/fidelite/clients?${params.toString()}`
  }

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (niveauFilter) params.set('niveau', niveauFilter)
    if (promoFilter) params.set('promo', promoFilter)
    window.location.href = `/admin/fidelite/clients?${params.toString()}`
  }

  const handleExportCSV = () => {
    const headers = ['Nom', 'Email', 'Téléphone', 'Niveau', 'Séjours', 'Points', 'Code promo', 'Statut code', 'Parrainages']
    const rows = clients.map((c) => {
      const promo = getPromoStatus(c)
      return [
        `${c.firstName} ${c.lastName}`,
        c.email,
        c.phone || '',
        LOYALTY_LEVELS[c.niveau as keyof typeof LOYALTY_LEVELS]?.label || c.niveau,
        c.totalSejours,
        c.totalPoints,
        c.boutiquePromoCode || '',
        promo.label,
        (c.referrals || []).length,
      ]
    })
    const csv = '\uFEFF' + [headers, ...rows].map((r) => r.join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clients-fidelite-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <form onSubmit={handleFilterSubmit}
        className="bg-white rounded-2xl border border-beige-200 p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/30" />
          <input
            type="text"
            placeholder="Nom, téléphone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-beige-200 rounded-xl focus:outline-none focus:border-gold-400"
          />
        </div>
        <select
          value={niveauFilter}
          onChange={(e) => setNiveauFilter(e.target.value)}
          className="text-sm border border-beige-200 rounded-xl px-3 py-2 text-dark/70 focus:outline-none focus:border-gold-400"
        >
          <option value="">Tous les niveaux</option>
          <option value="novice">⭐ Novice</option>
          <option value="explorateur">⭐⭐ Explorateur</option>
          <option value="ambassadeur">⭐⭐⭐ Ambassadeur</option>
          <option value="excellence">👑 Excellence</option>
        </select>
        <select
          value={promoFilter}
          onChange={(e) => setPromoFilter(e.target.value)}
          className="text-sm border border-beige-200 rounded-xl px-3 py-2 text-dark/70 focus:outline-none focus:border-gold-400"
        >
          <option value="">Tous les codes</option>
          <option value="active">Code actif</option>
          <option value="expired">Code expiré</option>
          <option value="none">Sans code</option>
        </select>
        <button type="submit"
          className="px-4 py-2 text-sm font-medium bg-dark text-white rounded-xl hover:bg-dark/90">
          Filtrer
        </button>
        <button type="button" onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-2 text-sm border border-beige-200 rounded-xl text-dark/60 hover:bg-beige-50">
          <Download size={13} /> CSV
        </button>
      </form>

      {/* Tableau */}
      <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-beige-100 flex items-center justify-between">
          <p className="text-xs text-dark/40">{total} client(s)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-beige-100">
                <th className="text-left text-xs text-dark/40 font-medium px-5 py-3">Client</th>
                <th className="text-center text-xs text-dark/40 font-medium px-3 py-3">Niveau</th>
                <th className="text-center text-xs text-dark/40 font-medium px-3 py-3">Séjours</th>
                <th className="text-center text-xs text-dark/40 font-medium px-3 py-3">Points</th>
                <th className="text-center text-xs text-dark/40 font-medium px-3 py-3">Code promo</th>
                <th className="text-center text-xs text-dark/40 font-medium px-3 py-3 hidden sm:table-cell">Parrainages</th>
                <th className="text-right text-xs text-dark/40 font-medium px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-sm text-dark/40">Aucun client trouvé</td>
                </tr>
              )}
              {clients.map((c) => {
                const levelData = LOYALTY_LEVELS[c.niveau as keyof typeof LOYALTY_LEVELS]
                const promo = getPromoStatus(c)
                return (
                  <tr key={c.id} className="border-b border-beige-50 last:border-0 hover:bg-beige-50/50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-dark">{c.firstName} {c.lastName}</p>
                      <p className="text-xs text-dark/40">{c.email}</p>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${NIVEAU_COLORS[c.niveau] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {levelData?.emoji} {levelData?.label || c.niveau}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center font-semibold text-dark">{c.totalSejours}</td>
                    <td className="px-3 py-3 text-center text-dark/70">{(c.totalPoints || 0).toLocaleString('fr-FR')}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-xs font-medium ${promo.color}`}>{promo.label}</span>
                      {c.boutiquePromoCode && (
                        <p className="text-[10px] font-mono text-dark/30 mt-0.5">{c.boutiquePromoCode}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center text-dark/60 hidden sm:table-cell">
                      {(c.referrals || []).length}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/admin/fidelite/clients/${c.id}`}
                        className="text-xs text-gold-600 hover:text-gold-700 font-medium">
                        Voir →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-beige-100 flex items-center justify-between">
            <p className="text-xs text-dark/40">Page {currentPage} / {totalPages}</p>
            <div className="flex gap-2">
              {currentPage > 1 && (
                <Link href={buildUrl(currentPage - 1)}
                  className="p-1.5 rounded-lg border border-beige-200 text-dark/60 hover:bg-beige-50">
                  <ChevronLeft size={14} />
                </Link>
              )}
              {currentPage < totalPages && (
                <Link href={buildUrl(currentPage + 1)}
                  className="p-1.5 rounded-lg border border-beige-200 text-dark/60 hover:bg-beige-50">
                  <ChevronRight size={14} />
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
