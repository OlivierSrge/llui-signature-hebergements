'use client'

import { useState } from 'react'
import { Eye, Edit, Copy, Trash2, MessageCircle, Mail, ChevronDown } from 'lucide-react'
import type { DevisRecord, DevisStatus } from '@/actions/devis'
import { updateDevisStatus, toggleDevisVisibleBoutique, dupliquerDevis, deleteDevis } from '@/actions/devis'
import { formatFCFA } from '@/lib/devisDefaults'

const STATUS_CONFIG: Record<DevisStatus, { label: string; bg: string; text: string }> = {
  brouillon: { label: 'Brouillon', bg: 'bg-gray-100', text: 'text-gray-600' },
  envoyé: { label: 'Envoyé', bg: 'bg-blue-100', text: 'text-blue-700' },
  accepté: { label: 'Accepté', bg: 'bg-green-100', text: 'text-green-700' },
  refusé: { label: 'Refusé', bg: 'bg-red-100', text: 'text-red-700' },
}

const STATUSES: DevisStatus[] = ['brouillon', 'envoyé', 'accepté', 'refusé']

interface Props {
  devisList: DevisRecord[]
  onEdit: (id: string) => void
  onListChange: (list: DevisRecord[]) => void
}

export default function DevisHistorique({ devisList, onEdit, onListChange }: Props) {
  const [loading, setLoading] = useState<string | null>(null)
  const [openStatusMenu, setOpenStatusMenu] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filtered = devisList.filter((d) => {
    const q = search.toLowerCase()
    return (
      d.clientName.toLowerCase().includes(q) ||
      d.ref.toLowerCase().includes(q) ||
      d.pack.toLowerCase().includes(q)
    )
  })

  const setLoaderFor = (id: string) => setLoading(id)
  const clearLoader = () => setLoading(null)

  const handleStatusChange = async (id: string, status: DevisStatus) => {
    setLoaderFor(id)
    setOpenStatusMenu(null)
    const res = await updateDevisStatus(id, status)
    if (res.success) {
      onListChange(devisList.map((d) => (d.id === id ? { ...d, status } : d)))
    }
    clearLoader()
  }

  const handleToggleBoutique = async (id: string, current: boolean) => {
    setLoaderFor(id)
    const res = await toggleDevisVisibleBoutique(id, !current)
    if (res.success) {
      onListChange(devisList.map((d) => (d.id === id ? { ...d, visibleBoutique: !current } : d)))
    }
    clearLoader()
  }

  const handleDuplicate = async (id: string) => {
    setLoaderFor(id)
    const res = await dupliquerDevis(id)
    if (res.success) {
      // Reload via server revalidation — just reload page section
      window.location.reload()
    }
    clearLoader()
  }

  const handleDelete = async (id: string, ref: string) => {
    if (!confirm(`Supprimer définitivement le devis ${ref} ?`)) return
    setLoaderFor(id)
    const res = await deleteDevis(id)
    if (res.success) {
      onListChange(devisList.filter((d) => d.id !== id))
    }
    clearLoader()
  }

  const buildWhatsAppMsg = (d: DevisRecord) => {
    const msg = `Bonjour ${d.clientName} 👋\n\nVoici votre proposition de mariage L&Lui Signature :\n\n• Réf : ${d.ref}\n• Pack : ${d.pack}\n• Total TTC : ${formatFCFA(d.totalTTC)}\n\nN'hésitez pas à nous contacter pour toute question ! 💍\n\nL&Lui Signature — +237 693 407 964`
    const phone = d.clientPhone.replace(/\D/g, '')
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
  }

  const buildEmailHref = (d: DevisRecord) => {
    const subject = `Proposition Mariage — ${d.ref} — L&Lui Signature`
    const body = `Bonjour ${d.clientName},\n\nVeuillez trouver ci-joint votre proposition de mariage L&Lui Signature.\n\nRéférence : ${d.ref}\nTotal TTC : ${formatFCFA(d.totalTTC)}\n\nCordialement,\nL&Lui Signature`
    return `mailto:${d.clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  if (devisList.length === 0) {
    return (
      <div className="text-center py-16 text-dark/40">
        <p className="text-5xl mb-4">💍</p>
        <p className="font-medium text-dark/60">Aucun devis créé pour l'instant</p>
        <p className="text-sm mt-1">Créez votre première proposition depuis l'onglet "Nouveau devis"</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Recherche */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher par nom, référence ou pack..."
        className="input-field w-full sm:w-80"
      />

      {/* Table desktop */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-beige-200">
              {['Réf', 'Client', 'Pack', 'Événement', 'Total TTC', 'Statut', 'Boutique', 'Actions'].map((h) => (
                <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-dark/50 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-beige-100">
            {filtered.map((d) => {
              const sc = STATUS_CONFIG[d.status]
              const isLoading = loading === d.id
              return (
                <tr key={d.id} className={`hover:bg-beige-50/50 transition-colors ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <td className="py-3 px-3">
                    <span className="font-mono text-xs text-dark/60">{d.ref}</span>
                  </td>
                  <td className="py-3 px-3">
                    <p className="font-medium text-dark">{d.clientName}</p>
                    <p className="text-xs text-dark/40">{d.clientPhone}</p>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-sm text-dark">{d.pack}</span>
                    <p className="text-xs text-dark/40">{d.nombreInvites} inv.</p>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-xs text-dark/60">
                      {d.dateEvenement ? new Date(d.dateEvenement).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-dark">{formatFCFA(d.totalTTC)}</span>
                    {d.totalBoutique > 0 && (
                      <p className="text-xs text-amber-600">+{formatFCFA(d.totalBoutique)} boutique</p>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <div className="relative">
                      <button
                        onClick={() => setOpenStatusMenu(openStatusMenu === d.id ? null : d.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}
                      >
                        {sc.label} <ChevronDown size={10} />
                      </button>
                      {openStatusMenu === d.id && (
                        <div className="absolute top-full left-0 mt-1 z-10 bg-white border border-beige-200 rounded-xl shadow-lg overflow-hidden min-w-[130px]">
                          {STATUSES.map((s) => {
                            const sc2 = STATUS_CONFIG[s]
                            return (
                              <button
                                key={s}
                                onClick={() => handleStatusChange(d.id, s)}
                                className={`w-full text-left px-3 py-2 text-xs font-semibold ${sc2.bg} ${sc2.text} hover:opacity-80 transition-opacity border-b border-beige-100 last:border-0`}
                              >
                                {sc2.label}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <button
                      onClick={() => handleToggleBoutique(d.id, d.visibleBoutique)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${d.visibleBoutique ? 'bg-green-500' : 'bg-gray-200'}`}
                      title={d.visibleBoutique ? 'Visible boutique' : 'Masqué boutique'}
                    >
                      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${d.visibleBoutique ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1">
                      {d.clientPhone && (
                        <a
                          href={buildWhatsAppMsg(d)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                          title="Envoyer sur WhatsApp"
                        >
                          <MessageCircle size={15} />
                        </a>
                      )}
                      {d.clientEmail && (
                        <a
                          href={buildEmailHref(d)}
                          className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                          title="Envoyer par email"
                        >
                          <Mail size={15} />
                        </a>
                      )}
                      <button
                        onClick={() => onEdit(d.id)}
                        className="p-1.5 rounded-lg text-dark/50 hover:bg-beige-100 transition-colors"
                        title="Modifier"
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        onClick={() => handleDuplicate(d.id)}
                        className="p-1.5 rounded-lg text-dark/50 hover:bg-beige-100 transition-colors"
                        title="Dupliquer"
                      >
                        <Copy size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(d.id, d.ref)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Cards mobile */}
      <div className="lg:hidden space-y-3">
        {filtered.map((d) => {
          const sc = STATUS_CONFIG[d.status]
          const isLoading = loading === d.id
          return (
            <div key={d.id} className={`bg-white rounded-2xl border border-beige-200 p-4 space-y-3 ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-dark">{d.clientName}</p>
                  <p className="text-xs font-mono text-dark/40 mt-0.5">{d.ref}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-dark/60">
                <span>Pack {d.pack}</span>
                <span>·</span>
                <span>{d.nombreInvites} inv.</span>
                {d.dateEvenement && (
                  <>
                    <span>·</span>
                    <span>{new Date(d.dateEvenement).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</span>
                  </>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-dark">{formatFCFA(d.totalTTC)}</span>
                <div className="flex items-center gap-2">
                  {d.clientPhone && (
                    <a href={buildWhatsAppMsg(d)} target="_blank" rel="noopener noreferrer"
                      className="p-2 rounded-xl text-green-600 bg-green-50 hover:bg-green-100">
                      <MessageCircle size={16} />
                    </a>
                  )}
                  <button onClick={() => onEdit(d.id)}
                    className="p-2 rounded-xl text-dark/60 bg-beige-100 hover:bg-beige-200">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(d.id, d.ref)}
                    className="p-2 rounded-xl text-red-400 bg-red-50 hover:bg-red-100">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && search && (
        <p className="text-center text-dark/40 py-8 text-sm">Aucun résultat pour « {search} »</p>
      )}
    </div>
  )
}
