'use client'
// app/admin/stars-mlm/AdminStarsMLMClient.tsx — Dashboard admin global Stars & MLM

import { useState, useTransition } from 'react'
import { toast } from 'react-hot-toast'
import { traiterRetraitPartenaire } from '@/actions/wallet-partenaire'
import { useRouter } from 'next/navigation'

const GOLD = '#C9A84C'

const GRADE_COLORS: Record<string, string> = {
  START: '#888', BRONZE: '#CD7F32', ARGENT: '#A8A9AD',
  OR: '#C9A84C', SAPHIR: '#0F52BA', DIAMANT: '#B9F2FF',
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}
function fmtDate(s: string) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })
}

interface WalletRow {
  partenaire_id: string; partenaire_nom: string
  cash: number; credits: number; cash_en_attente: number; credits_en_attente: number
  rev_total: number; grade_actuel: string; updated_at: string
}
interface RetraitRow {
  id: string; partenaire_id: string; partenaire_nom: string
  montant: number; operateur: string; numero_mobile_money: string
  statut: string; note_admin?: string; created_at: string; traitee_at?: string
}
interface CommissionRow {
  id: string; partenaire_id: string; partenaire_nom: string; partenaire_source_id: string
  type_vente: string; niveau: number; montant_vente: number
  montant_commission: number; montant_cash: number; montant_credits: number
  rev_generes: number; statut: string; created_at: string
}
interface Kpis {
  totalCashDisponible: number; totalCredits: number; totalRevGlobal: number
  retraitsPendingCount: number; retraitsPendingMontant: number
  commissionsTotal: number; nbPartenaires: number
}

interface Props {
  wallets: WalletRow[]
  retraits: RetraitRow[]
  commissions: CommissionRow[]
  kpis: Kpis
}

export default function AdminStarsMLMClient({ wallets, retraits, commissions, kpis }: Props) {
  const [activeTab, setActiveTab] = useState<'kpis' | 'wallets' | 'retraits' | 'commissions'>('kpis')
  const [noteMap, setNoteMap] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()
  const [processingId, setProcessingId] = useState<string | null>(null)
  const router = useRouter()

  function handleTraiter(retraitId: string, statut: 'validee' | 'refusee') {
    setProcessingId(retraitId)
    startTransition(async () => {
      try {
        await traiterRetraitPartenaire(retraitId, statut, noteMap[retraitId])
        toast.success(statut === 'validee' ? '✅ Retrait validé' : '❌ Retrait refusé')
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erreur')
      } finally {
        setProcessingId(null)
      }
    })
  }

  const tabs: [typeof activeTab, string][] = [
    ['kpis', '📊 KPIs'],
    ['wallets', `💰 Wallets (${wallets.length})`],
    ['retraits', `💸 Retraits${kpis.retraitsPendingCount > 0 ? ` 🔴${kpis.retraitsPendingCount}` : ''}`],
    ['commissions', '🧾 Commissions'],
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">⭐ Stars & MLM</h1>
        <p className="text-sm text-[#1A1A1A]/50">Wallets partenaires prescripteurs · Commissions · Retraits</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-2xl p-1.5 shadow-sm overflow-x-auto">
        {tabs.map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 min-w-[100px] py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap ${
              activeTab === tab ? 'bg-[#C9A84C] text-white' : 'text-[#1A1A1A]/60 hover:text-[#1A1A1A]'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ─── KPIs ─────────────────────────────────────────────── */}
      {activeTab === 'kpis' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: '💵 Cash total', val: fmt(kpis.totalCashDisponible), sub: 'disponible chez partenaires' },
              { label: '⭐ Crédits Stars', val: fmt(kpis.totalCredits), sub: 'crédits accumulés' },
              { label: '📈 REV global', val: kpis.totalRevGlobal.toLocaleString('fr-FR'), sub: 'REV cumulés plateforme' },
              { label: '🏨 Partenaires', val: String(kpis.nbPartenaires), sub: 'avec wallet actif' },
            ].map((k) => (
              <div key={k.label} className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-[#1A1A1A]/50 mb-1">{k.label}</p>
                <p className="text-xl font-bold text-[#C9A84C]">{k.val}</p>
                <p className="text-[10px] text-[#1A1A1A]/40 mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>

          {kpis.retraitsPendingCount > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
              <p className="text-sm font-bold text-orange-800">
                ⚠️ {kpis.retraitsPendingCount} retrait{kpis.retraitsPendingCount > 1 ? 's' : ''} en attente — {fmt(kpis.retraitsPendingMontant)}
              </p>
              <button onClick={() => setActiveTab('retraits')}
                className="mt-2 text-xs font-semibold text-orange-700 underline">
                Voir les retraits →
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-sm font-semibold text-[#1A1A1A] mb-1">🧾 Commissions totales versées</p>
            <p className="text-2xl font-bold" style={{ color: GOLD }}>{fmt(kpis.commissionsTotal)}</p>
            <p className="text-xs text-[#1A1A1A]/50 mt-0.5">{commissions.length} entrées (100 dernières)</p>
          </div>
        </div>
      )}

      {/* ─── WALLETS ──────────────────────────────────────────── */}
      {activeTab === 'wallets' && (
        <div className="space-y-3">
          {wallets.length === 0 && (
            <div className="bg-white rounded-2xl p-8 text-center text-sm text-[#1A1A1A]/40">
              Aucun wallet partenaire
            </div>
          )}
          {wallets.map((w) => {
            const gc = GRADE_COLORS[w.grade_actuel] ?? '#888'
            return (
              <div key={w.partenaire_id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-[#1A1A1A]">{w.partenaire_nom}</p>
                    <p className="text-xs text-[#1A1A1A]/40 font-mono">{w.partenaire_id.slice(0, 12)}…</p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{ background: gc + '22', color: gc, border: `1px solid ${gc}44` }}>
                    ★ {w.grade_actuel}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-[#F5F0E8]/60 rounded-xl p-2">
                    <p className="text-[10px] text-[#1A1A1A]/50">💵 Cash</p>
                    <p className="text-sm font-bold text-[#C9A84C]">{fmt(w.cash)}</p>
                    {w.cash_en_attente > 0 && (
                      <p className="text-[9px] text-[#1A1A1A]/40">+{fmt(w.cash_en_attente)} att.</p>
                    )}
                  </div>
                  <div className="bg-[#F5F0E8]/60 rounded-xl p-2">
                    <p className="text-[10px] text-[#1A1A1A]/50">⭐ Crédits</p>
                    <p className="text-sm font-bold text-blue-500">{fmt(w.credits)}</p>
                  </div>
                  <div className="bg-[#F5F0E8]/60 rounded-xl p-2">
                    <p className="text-[10px] text-[#1A1A1A]/50">📈 REV</p>
                    <p className="text-sm font-bold text-[#1A1A1A]">{w.rev_total}</p>
                  </div>
                </div>
                <p className="text-[10px] text-[#1A1A1A]/30 mt-2 text-right">MàJ {fmtDate(w.updated_at)}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── RETRAITS ─────────────────────────────────────────── */}
      {activeTab === 'retraits' && (
        <div className="space-y-3">
          {retraits.length === 0 && (
            <div className="bg-white rounded-2xl p-8 text-center text-sm text-[#1A1A1A]/40">
              Aucun retrait
            </div>
          )}
          {retraits.map((r) => (
            <div key={r.id} className={`bg-white rounded-2xl p-4 shadow-sm border-l-4 ${
              r.statut === 'demande' ? 'border-orange-400' :
              r.statut === 'validee' ? 'border-green-400' : 'border-red-400'
            }`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-[#1A1A1A]">{r.partenaire_nom}</p>
                  <p className="text-xs text-[#1A1A1A]/50">{r.operateur} · {r.numero_mobile_money}</p>
                  <p className="text-xs text-[#1A1A1A]/40">{fmtDate(r.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-[#C9A84C]">{fmt(r.montant)}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    r.statut === 'validee' ? 'bg-green-100 text-green-700' :
                    r.statut === 'refusee' ? 'bg-red-100 text-red-600' :
                    'bg-orange-100 text-orange-700'
                  }`}>
                    {r.statut === 'validee' ? '✅ Versé' : r.statut === 'refusee' ? '❌ Refusé' : '⏳ En attente'}
                  </span>
                </div>
              </div>

              {r.statut === 'demande' && (
                <div className="mt-3 space-y-2">
                  <input
                    type="text"
                    placeholder="Note admin (optionnel)"
                    value={noteMap[r.id] ?? ''}
                    onChange={(e) => setNoteMap((m) => ({ ...m, [r.id]: e.target.value }))}
                    className="w-full border border-[#F5F0E8] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#C9A84C]"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTraiter(r.id, 'validee')}
                      disabled={isPending && processingId === r.id}
                      className="flex-1 py-2 bg-green-500 text-white text-xs font-bold rounded-xl disabled:opacity-50 hover:bg-green-600 transition-colors">
                      ✅ Valider
                    </button>
                    <button
                      onClick={() => handleTraiter(r.id, 'refusee')}
                      disabled={isPending && processingId === r.id}
                      className="flex-1 py-2 bg-red-500 text-white text-xs font-bold rounded-xl disabled:opacity-50 hover:bg-red-600 transition-colors">
                      ❌ Refuser
                    </button>
                  </div>
                </div>
              )}

              {r.note_admin && (
                <p className="text-xs text-[#1A1A1A]/50 mt-2 italic">Note : {r.note_admin}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ─── COMMISSIONS ──────────────────────────────────────── */}
      {activeTab === 'commissions' && (
        <div className="space-y-3">
          {commissions.length === 0 && (
            <div className="bg-white rounded-2xl p-8 text-center text-sm text-[#1A1A1A]/40">
              Aucune commission
            </div>
          )}
          {commissions.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="text-sm font-semibold text-[#1A1A1A]">{c.partenaire_nom}</p>
                  <p className="text-xs text-[#1A1A1A]/50 capitalize">
                    {c.type_vente} · N{c.niveau}
                    {c.rev_generes > 0 ? ` · +${c.rev_generes} REV` : ''}
                  </p>
                </div>
                <p className="text-sm font-bold text-[#C9A84C]">{fmt(c.montant_commission)}</p>
              </div>
              <div className="flex gap-3 text-[10px] text-[#1A1A1A]/40">
                <span>Vente : {fmt(c.montant_vente)}</span>
                <span>💵 {fmt(c.montant_cash)}</span>
                <span>⭐ {fmt(c.montant_credits)}</span>
                <span className="ml-auto">{fmtDate(c.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
