'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pencil, Eye, ToggleLeft, ToggleRight, Wallet } from 'lucide-react'
import type { Prescripteur, PrescripteurType } from '@/actions/prescripteurs'
import { toggleStatutPrescripteur } from '@/actions/prescripteurs'

interface Props {
  prescripteurs: Prescripteur[]
  types: PrescripteurType[]
}

export default function PrescripteurListClient({ prescripteurs, types }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [filtreType, setFiltreType]   = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')
  const [search, setSearch] = useState('')

  const typeMap = Object.fromEntries(types.map((t) => [t.id, t]))

  const filtres = prescripteurs.filter((p) => {
    if (filtreType   && p.type !== filtreType)   return false
    if (filtreStatut && p.statut !== filtreStatut) return false
    if (search && !p.nom_complet.toLowerCase().includes(search.toLowerCase()) &&
        !p.telephone.includes(search)) return false
    return true
  })

  const handleToggle = (uid: string, statut: 'actif' | 'suspendu') => {
    startTransition(async () => {
      await toggleStatutPrescripteur(uid, statut === 'actif' ? 'suspendu' : 'actif')
      router.refresh()
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-dark/10 overflow-hidden">
      {/* Filtres */}
      <div className="flex flex-wrap gap-3 p-4 border-b border-dark/10">
        <input
          type="text"
          placeholder="Rechercher nom / téléphone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-dark/20 rounded-lg px-3 py-2 text-sm flex-1 min-w-[180px] focus:outline-none focus:ring-2 focus:ring-gold-400"
        />
        <select
          value={filtreType}
          onChange={(e) => setFiltreType(e.target.value)}
          className="border border-dark/20 rounded-lg px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">Tous les types</option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
        <select
          value={filtreStatut}
          onChange={(e) => setFiltreStatut(e.target.value)}
          className="border border-dark/20 rounded-lg px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">Tous statuts</option>
          <option value="actif">Actif</option>
          <option value="suspendu">Suspendu</option>
        </select>
      </div>

      {/* Table desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark/10 bg-cream/60">
              <th className="text-left px-4 py-3 font-semibold text-dark/60">Nom</th>
              <th className="text-left px-4 py-3 font-semibold text-dark/60">Type</th>
              <th className="text-left px-4 py-3 font-semibold text-dark/60">Clients</th>
              <th className="text-left px-4 py-3 font-semibold text-dark/60">Solde dû</th>
              <th className="text-left px-4 py-3 font-semibold text-dark/60">Statut</th>
              <th className="text-left px-4 py-3 font-semibold text-dark/60">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtres.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-dark/40">
                  Aucun prescripteur trouvé
                </td>
              </tr>
            )}
            {filtres.map((p) => {
              const type = typeMap[p.type]
              return (
                <tr key={p.uid} className="border-b border-dark/5 hover:bg-cream/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-dark">{p.nom_complet}</p>
                    <p className="text-dark/50 text-xs">{p.telephone}</p>
                    <p className="text-dark/40 text-xs font-mono">{p.code_promo}</p>
                  </td>
                  <td className="px-4 py-3">
                    {type ? (
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: type.couleur_badge }}
                      >
                        {type.label}
                      </span>
                    ) : (
                      <span className="text-dark/40 text-xs">{p.type}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{p.total_clients_amenes ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${(p.solde_fcfa ?? 0) > 0 ? 'text-amber-600' : 'text-dark/40'}`}>
                      {(p.solde_fcfa ?? 0).toLocaleString('fr-FR')} F
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                      p.statut === 'actif'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {p.statut === 'actif' ? 'Actif' : 'Suspendu'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/prescripteurs/${p.uid}`}
                        className="p-1.5 rounded-lg hover:bg-dark/10 text-dark/50 hover:text-dark transition-colors"
                        title="Voir le détail"
                      >
                        <Eye size={15} />
                      </Link>
                      <Link
                        href={`/admin/prescripteurs/${p.uid}/modifier`}
                        className="p-1.5 rounded-lg hover:bg-dark/10 text-dark/50 hover:text-dark transition-colors"
                        title="Modifier"
                      >
                        <Pencil size={15} />
                      </Link>
                      <button
                        onClick={() => handleToggle(p.uid, p.statut)}
                        disabled={isPending}
                        className={`p-1.5 rounded-lg transition-colors ${
                          p.statut === 'actif'
                            ? 'hover:bg-red-50 text-red-400 hover:text-red-600'
                            : 'hover:bg-green-50 text-green-500 hover:text-green-700'
                        }`}
                        title={p.statut === 'actif' ? 'Suspendre' : 'Activer'}
                      >
                        {p.statut === 'actif' ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                      </button>
                      {(p.solde_fcfa ?? 0) > 0 && (
                        <Link
                          href={`/admin/prescripteurs/${p.uid}#retraits`}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 hover:text-amber-700 transition-colors"
                          title="Valider retrait"
                        >
                          <Wallet size={15} />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Cards mobile */}
      <div className="md:hidden divide-y divide-dark/10">
        {filtres.length === 0 && (
          <p className="text-center py-12 text-dark/40 text-sm">Aucun prescripteur trouvé</p>
        )}
        {filtres.map((p) => {
          const type = typeMap[p.type]
          return (
            <div key={p.uid} className="p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-dark">{p.nom_complet}</p>
                  {type && (
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: type.couleur_badge }}
                    >
                      {type.label}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    p.statut === 'actif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                  }`}>
                    {p.statut === 'actif' ? 'Actif' : 'Suspendu'}
                  </span>
                </div>
                <p className="text-dark/50 text-sm mt-0.5">{p.telephone}</p>
                <div className="flex gap-4 mt-1 text-sm">
                  <span className="text-dark/60">{p.total_clients_amenes ?? 0} client{(p.total_clients_amenes ?? 0) !== 1 ? 's' : ''}</span>
                  {(p.solde_fcfa ?? 0) > 0 && (
                    <span className="text-amber-600 font-semibold">{(p.solde_fcfa ?? 0).toLocaleString('fr-FR')} F dus</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Link href={`/admin/prescripteurs/${p.uid}`} className="btn-sm">Voir</Link>
                <Link href={`/admin/prescripteurs/${p.uid}/modifier`} className="btn-sm">Modifier</Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
