'use client'
// components/portail/WalletSection.tsx
// Historique wallet_operations + formulaire demande retrait

import { useState } from 'react'
import { soumettreRetrait } from '@/actions/portail-retrait'

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const TYPE_ICON: Record<string, string> = {
  CREDIT_COMMISSION: '💰', CREDIT_PRIME: '🎯', DEBIT_RETRAIT: '📤', CREDIT_BONUS: '⭐',
}

const STATUT_COLOR: Record<string, string> = {
  EN_ATTENTE: 'bg-amber-100 text-amber-700',
  VALIDEE: 'bg-blue-100 text-blue-700',
  PAYEE: 'bg-green-100 text-green-700',
  REJETEE: 'bg-red-100 text-red-700',
}

interface HistOp {
  id: string; type: string; source: string; created_at: string
  amount_cash: number; amount_credits: number; rev_attribues: number
}
interface Retrait {
  id: string; montant: number; wallet_type: string; statut: string; created_at: string
}

interface Props {
  walletCash: number; walletCredits: number
  history: HistOp[]; retraits: Retrait[]
}

export default function WalletSection({ walletCash, walletCredits, history, retraits }: Props) {
  const [wallet, setWallet] = useState<'cash' | 'credits_services'>('cash')
  const [montant, setMontant] = useState('')
  const [telephone, setTelephone] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const solde = wallet === 'cash' ? walletCash : walletCredits

  async function handleRetrait(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setMsg(null)
    const res = await soumettreRetrait(Number(montant), telephone, wallet)
    setMsg({ ok: res.success, text: res.success ? 'Demande envoyée — traitement sous 48h' : (res.error ?? 'Erreur') })
    if (res.success) { setMontant(''); setTelephone('') }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      {/* Historique */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F5F0E8]">
        <p className="font-semibold text-[#1A1A1A] mb-3 text-sm">Historique de mes transactions</p>
        {history.length === 0
          ? <p className="text-xs text-gray-400">Aucune opération pour le moment.</p>
          : <div className="space-y-2.5">
              {history.map(op => (
                <div key={op.id} className="flex items-start gap-2 text-sm border-b border-[#F5F0E8] pb-2 last:border-0">
                  <span className="text-lg leading-none mt-0.5">{TYPE_ICON[op.type] ?? '💳'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 truncate">{op.source}</p>
                    <p className="text-[10px] text-gray-400">{fmtDate(op.created_at)}</p>
                  </div>
                  <div className="text-right text-xs whitespace-nowrap space-y-0.5">
                    {op.amount_cash > 0 && <p className="text-green-600 font-semibold">+{fmt(op.amount_cash)}</p>}
                    {op.amount_credits > 0 && <p className="text-purple-600 font-semibold">+{fmt(op.amount_credits)}</p>}
                    {op.rev_attribues > 0 && <p className="text-[#C9A84C] font-semibold">+{op.rev_attribues} REV</p>}
                    {op.type === 'DEBIT_RETRAIT' && <p className="text-red-500 font-semibold">-{fmt(op.amount_cash || op.amount_credits)}</p>}
                  </div>
                </div>
              ))}
            </div>
        }
      </div>

      {/* Demande retrait */}
      {(walletCash > 0 || walletCredits > 0) && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F5F0E8]">
          <p className="font-semibold text-[#1A1A1A] mb-3 text-sm">Demander un retrait</p>
          <form onSubmit={handleRetrait} className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Wallet</label>
              <select value={wallet} onChange={e => { setWallet(e.target.value as 'cash' | 'credits_services'); setMontant('') }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
                <option value="cash">Cash — {fmt(walletCash)}</option>
                <option value="credits_services">Crédits services — {fmt(walletCredits)}</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Montant (max {fmt(solde)})</label>
              <input type="number" min={5000} max={solde} value={montant} onChange={e => setMontant(e.target.value)}
                placeholder="Ex : 25000" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">N° Orange Money (+237XXXXXXXXX)</label>
              <input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)}
                placeholder="+237693407964" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" required />
            </div>
            {msg && <p className={`text-xs font-medium ${msg.ok ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl bg-[#C9A84C] text-white font-semibold text-sm disabled:opacity-50">
              {loading ? 'Envoi…' : 'Soumettre la demande'}
            </button>
          </form>

          {/* Historique retraits */}
          {retraits.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#F5F0E8]">
              <p className="text-xs text-gray-500 mb-2">Mes 5 dernières demandes</p>
              <div className="space-y-1.5">
                {retraits.map(r => (
                  <div key={r.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{fmt(r.montant)} — {r.wallet_type === 'cash' ? 'Cash' : 'Crédits'}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUT_COLOR[r.statut] ?? 'bg-gray-100 text-gray-600'}`}>{r.statut.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
