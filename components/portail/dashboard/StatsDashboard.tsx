'use client'
// BLOCS 3, 4, 5, 9 — Stats 2×2 + Budget + Cagnotte + Invités

import { useClientIdentity } from '@/hooks/useClientIdentity'
import { usePanier } from '@/hooks/usePanier'

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

interface Props {
  uid: string
  todosDone: number
  todosTotal: number
  walletCash: number
  walletCredits: number
}

export default function StatsDashboard({ uid, todosDone, todosTotal, walletCash, walletCredits }: Props) {
  const identity = useClientIdentity()
  const { totaux } = usePanier(uid)

  // BLOC 4 — Budget
  const budgetTotal = identity.budget_previsionnel
  const budgetDepense = totaux.total_ht
  const pctBudget = budgetTotal > 0 ? Math.min(100, Math.round((budgetDepense / budgetTotal) * 100)) : 0
  const budgetColor = pctBudget < 80 ? '#7C9A7E' : pctBudget < 100 ? '#C9A84C' : '#C0392B'

  // BLOC 9 — Invités dots
  const confirmes = identity.invites_confirmes
  const prevus = identity.nombre_invites_prevu
  const MAX_DOTS = 60
  const total = Math.min(prevus, MAX_DOTS)
  const dotsConf = Math.min(confirmes, total)

  return (
    <div className="space-y-4">
      {/* BLOC 3 — Stats 2×2 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
          <p className="text-xl font-bold text-[#C9A84C]">{confirmes}<span className="text-xs text-[#888] font-normal">/{prevus}</span></p>
          <p className="text-xs text-[#888] mt-0.5">Invités confirmés</p>
          {prevus > confirmes && <p className="text-[10px] text-[#AAA]">{prevus - confirmes} en attente</p>}
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
          <p className="text-xl font-bold text-[#1A1A1A]">{todosDone}<span className="text-xs text-[#888] font-normal">/{todosTotal}</span></p>
          <p className="text-xs text-[#888] mt-0.5">Tâches complétées</p>
          {todosDone > 0 && <p className="text-[10px] text-[#7C9A7E]">+{todosDone} cette session</p>}
        </div>
      </div>

      {/* BLOC 4 — Budget */}
      {budgetTotal > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
          <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-2">Suivi Budget</p>
          <div className="flex justify-between text-xs text-[#888] mb-1">
            <span>Engagé</span><span style={{ color: budgetColor }}>{pctBudget}%</span>
          </div>
          <div className="h-2.5 bg-[#F5F0E8] rounded-full overflow-hidden mb-2">
            <div className="h-full rounded-full transition-all" style={{ width: `${pctBudget}%`, background: budgetColor }} />
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-[#888]">{formatFCFA(budgetDepense)} engagé</span>
            <span className="text-[#888]">{formatFCFA(budgetTotal)} prévu</span>
          </div>
          {pctBudget >= 100
            ? <p className="text-[11px] text-red-500 mt-1">⚠ Budget dépassé de {formatFCFA(budgetDepense - budgetTotal)}</p>
            : <p className="text-[11px] text-[#7C9A7E] mt-1">Reste {formatFCFA(budgetTotal - budgetDepense)}</p>
          }
        </div>
      )}

      {/* BLOC 5 — Cagnotte */}
      <div className="rounded-2xl p-4" style={{ background: '#1A1A1A' }}>
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">Ma Cagnotte</p>
        <p className="text-xl font-bold mb-3" style={{ color: '#C9A84C' }}>{formatFCFA(walletCash + walletCredits)}</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl p-2.5" style={{ background: '#222' }}>
            <p className="text-[10px] text-white/40">Cash (70%)</p>
            <p className="text-sm font-bold text-white">{formatFCFA(walletCash)}</p>
          </div>
          <div className="rounded-xl p-2.5" style={{ background: '#222' }}>
            <p className="text-[10px] text-white/40">Crédits (30%)</p>
            <p className="text-sm font-bold text-[#C9A84C]">{formatFCFA(walletCredits)}</p>
          </div>
        </div>
      </div>

      {/* BLOC 9 — Mes Invités (dots) */}
      {prevus > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
          <div className="flex justify-between items-center mb-3">
            <p className="text-xs font-semibold text-[#888] uppercase tracking-wide">Mes Invités</p>
            <a href="/portail/invites" className="text-xs text-[#C9A84C]">Gérer →</a>
          </div>
          <div className="flex flex-wrap gap-1 mb-3">
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} className="w-3 h-3 rounded-full" style={{ background: i < dotsConf ? '#C9A84C' : '#E8E0D0' }} />
            ))}
          </div>
          <div className="flex gap-2">
            <a href="/portail/invites" className="flex-1 py-2 rounded-xl text-xs font-semibold text-center text-white" style={{ background: '#1A1A1A' }}>Gérer →</a>
            <a href="/portail/invites#envoyer" className="flex-1 py-2 rounded-xl text-xs font-semibold text-center text-[#1A1A1A] border border-[#C9A84C]">Envoyer invitations →</a>
          </div>
        </div>
      )}
    </div>
  )
}
