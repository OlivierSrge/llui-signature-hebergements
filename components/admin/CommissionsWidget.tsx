'use client'

import { useState, useTransition } from 'react'
import { X, Download, ChevronDown, ChevronUp, Info, RefreshCw } from 'lucide-react'
import { getPartnerCommissionsData } from '@/actions/commissions'

// ── Types ──────────────────────────────────────────────────────────────────

export interface CommissionReservation {
  id: string
  code: string
  guestName: string
  totalPrice: number
  commissionRate: number
  commissionAmount: number
  paymentDate: string
}

export interface CommissionCell {
  amount: number
  reservations: CommissionReservation[]
}

export interface PartnerRow {
  partnerId: string
  partnerName: string
  partnerPlan?: string
  months: (CommissionCell | null)[]
  total: number
}

export interface CommissionsData {
  months: { label: string; key: string }[]
  rows: PartnerRow[]
}

interface Props {
  initialData: CommissionsData
  partners: { id: string; name: string; plan?: string }[]
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n))
}

// ── Modale détail cellule ──────────────────────────────────────────────────

function CellDetailModal({
  cell,
  partnerName,
  monthLabel,
  onClose,
}: {
  cell: CommissionCell
  partnerName: string
  monthLabel: string
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-dark/50 backdrop-blur-sm" />
      <div
        className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-beige-100 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="font-semibold text-dark text-sm">{partnerName}</p>
            <p className="text-xs text-dark/50">
              {monthLabel} — {cell.reservations.length} réservation{cell.reservations.length > 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-beige-50 text-dark/40">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {cell.reservations.map((r) => (
            <div key={r.id} className="bg-beige-50 rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-dark text-sm">{r.guestName}</span>
                <span className="text-xs font-mono text-dark/50">{r.code}</span>
              </div>
              <div className="flex justify-between text-xs text-dark/60">
                <span>Montant brut : <span className="font-medium text-dark">{formatFCFA(r.totalPrice)} FCFA</span></span>
                <span>Taux : <span className="font-medium text-dark">{r.commissionRate}%</span></span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-dark/40">
                  Payé le {r.paymentDate ? new Date(r.paymentDate).toLocaleDateString('fr-FR') : '—'}
                </span>
                <span className="font-semibold text-gold-700">{formatFCFA(r.commissionAmount)} FCFA</span>
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-beige-100 flex justify-between items-center flex-shrink-0">
          <span className="text-sm text-dark/60">Total commissions</span>
          <span className="text-lg font-bold text-gold-700">{formatFCFA(cell.amount)} FCFA</span>
        </div>
      </div>
    </div>
  )
}

// ── Widget principal ────────────────────────────────────────────────────────

export default function CommissionsWidget({ initialData, partners }: Props) {
  const [data, setData] = useState<CommissionsData>(initialData)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [filterPartner, setFilterPartner] = useState('')
  const [filterPlan, setFilterPlan] = useState('')
  const [selectedCell, setSelectedCell] = useState<{
    cell: CommissionCell; partnerName: string; monthLabel: string
  } | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleYearChange = (year: number) => {
    setSelectedYear(year)
    startTransition(async () => {
      const fresh = await getPartnerCommissionsData(year)
      setData(fresh)
    })
  }

  const handleRefresh = () => {
    startTransition(async () => {
      const fresh = await getPartnerCommissionsData(selectedYear)
      setData(fresh)
    })
  }

  // Filtre côté client sur les lignes
  const filteredRows = data.rows.filter((row) => {
    if (filterPartner && row.partnerId !== filterPartner) return false
    if (filterPlan && row.partnerPlan !== filterPlan) return false
    return true
  })

  const columnTotals = data.months.map((_, mi) =>
    filteredRows.reduce((s, row) => s + (row.months[mi]?.amount || 0), 0)
  )
  const grandTotal = filteredRows.reduce((s, r) => s + r.total, 0)

  const uniquePlans = Array.from(new Set(partners.map((p) => p.plan).filter(Boolean))) as string[]

  // ── Export CSV ─────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const BOM = '\uFEFF'
    const header = ['Partenaire', 'Plan', ...data.months.map((m) => m.label), 'Total cumulé'].join(';')
    const dataRows = filteredRows.map((row) => [
      row.partnerName,
      row.partnerPlan || '',
      ...row.months.map((c) => (c ? Math.round(c.amount) : 0)),
      Math.round(row.total),
    ].join(';'))
    const totalRow = ['TOTAL', '', ...columnTotals.map((t) => Math.round(t)), Math.round(grandTotal)].join(';')

    const csv = BOM + [header, ...dataRows, totalRow].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `commissions-${selectedYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-beige-100 flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 font-semibold text-dark text-sm"
        >
          {collapsed ? <ChevronDown size={16} className="text-gold-500" /> : <ChevronUp size={16} className="text-gold-500" />}
          Commissions par partenaire
          {grandTotal > 0 && (
            <span className="text-xs text-dark/40 font-normal ml-1">{formatFCFA(grandTotal)} FCFA</span>
          )}
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtre année */}
          <select
            value={selectedYear}
            onChange={(e) => handleYearChange(Number(e.target.value))}
            className="text-xs border border-beige-200 rounded-lg px-2.5 py-1.5 bg-beige-50 text-dark focus:outline-none"
          >
            {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          {/* Filtre partenaire */}
          <select
            value={filterPartner}
            onChange={(e) => setFilterPartner(e.target.value)}
            className="text-xs border border-beige-200 rounded-lg px-2.5 py-1.5 bg-beige-50 text-dark focus:outline-none max-w-[130px]"
          >
            <option value="">Tous partenaires</option>
            {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {/* Filtre plan */}
          {uniquePlans.length > 0 && (
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="text-xs border border-beige-200 rounded-lg px-2.5 py-1.5 bg-beige-50 text-dark focus:outline-none"
            >
              <option value="">Tous plans</option>
              {uniquePlans.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
          <button
            onClick={handleRefresh}
            disabled={isPending}
            className="p-1.5 rounded-lg border border-beige-200 text-dark/40 hover:text-dark hover:bg-beige-50 transition-colors disabled:opacity-40"
            title="Rafraîchir"
          >
            <RefreshCw size={13} className={isPending ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition-colors"
          >
            <Download size={12} /> Exporter CSV
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {isPending ? (
            <div className="py-10 text-center text-dark/40 text-sm">
              <span className="animate-spin inline-block w-4 h-4 border-2 border-gold-400 border-t-transparent rounded-full mr-2" />
              Chargement...
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="py-10 text-center text-dark/40 text-sm">Aucune commission sur cette période</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="bg-beige-50 border-b border-beige-100">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-dark/60 min-w-[120px]">Partenaire</th>
                    {data.months.map((m) => (
                      <th key={m.key} className="text-right px-3 py-2.5 text-xs font-semibold text-dark/60 whitespace-nowrap">
                        {m.label}
                      </th>
                    ))}
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-dark/60 bg-beige-100 whitespace-nowrap">
                      Total cumulé
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-beige-50">
                  {filteredRows.map((row) => (
                    <tr key={row.partnerId} className="hover:bg-beige-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-dark text-xs">{row.partnerName}</p>
                        {row.partnerPlan && (
                          <p className="text-[10px] text-dark/40">{row.partnerPlan}</p>
                        )}
                      </td>
                      {row.months.map((cell, mi) => (
                        <td key={mi} className="text-right px-3 py-3">
                          {cell ? (
                            <button
                              onClick={() => setSelectedCell({
                                cell,
                                partnerName: row.partnerName,
                                monthLabel: data.months[mi].label,
                              })}
                              className="group text-xs font-medium text-dark hover:text-gold-700 transition-colors"
                            >
                              <span className="underline underline-offset-2 decoration-dashed decoration-dark/20 group-hover:decoration-gold-400">
                                {formatFCFA(cell.amount)}
                              </span>
                              <Info size={9} className="inline ml-1 opacity-0 group-hover:opacity-60 transition-opacity" />
                            </button>
                          ) : (
                            <span className="text-dark/20 text-xs">—</span>
                          )}
                        </td>
                      ))}
                      <td className="text-right px-4 py-3 bg-beige-50/50">
                        <span className="font-semibold text-gold-700 text-sm">{formatFCFA(row.total)}</span>
                        <span className="text-[10px] text-dark/40 ml-1">FCFA</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-dark/5 border-t-2 border-dark/10">
                    <td className="px-4 py-2.5 text-xs font-bold text-dark">TOTAL</td>
                    {columnTotals.map((t, i) => (
                      <td key={i} className="text-right px-3 py-2.5 text-xs font-bold text-dark">
                        {t > 0 ? formatFCFA(t) : <span className="text-dark/20">—</span>}
                      </td>
                    ))}
                    <td className="text-right px-4 py-2.5 bg-gold-50 font-bold text-gold-700">
                      {formatFCFA(grandTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modale détail */}
      {selectedCell && (
        <CellDetailModal
          cell={selectedCell.cell}
          partnerName={selectedCell.partnerName}
          monthLabel={selectedCell.monthLabel}
          onClose={() => setSelectedCell(null)}
        />
      )}
    </div>
  )
}
