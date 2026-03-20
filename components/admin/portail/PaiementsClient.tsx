'use client'
// components/admin/portail/PaiementsClient.tsx
// File d'attente unifiée Fast Start + Retraits

import { useState } from 'react'
import type { PaiementItem } from '@/app/admin/paiements/page'
import { useRouter } from 'next/navigation'

function fmt(n: number) { return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA' }

const TYPE_LABEL: Record<string, string> = {
  fast_start: '🏆 Fast Start', retrait_cash: '💵 Retrait Cash', retrait_credits: '💜 Retrait Crédits',
}
const STATUT_COLOR: Record<string, string> = {
  EN_ATTENTE: 'bg-amber-100 text-amber-700', VALIDEE: 'bg-blue-100 text-blue-700',
  PAYEE: 'bg-green-100 text-green-700', REJETEE: 'bg-red-100 text-red-700',
}

interface Props { data: { enAttente: PaiementItem[]; historique: PaiementItem[]; totalDecaisser: string } }

export default function PaiementsClient({ data }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [modal, setModal] = useState<{ item: PaiementItem; action: 'PAYER' | 'REJETER' } | null>(null)
  const [refOM, setRefOM] = useState('')
  const [motif, setMotif] = useState('')
  const [msg, setMsg] = useState('')

  async function doAction(item: PaiementItem, action: 'VALIDER' | 'PAYER' | 'REJETER', extra: Record<string, string> = {}) {
    setLoading(item.id)
    try {
      const res = await fetch('/api/admin/paiements', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demande_id: item.id, type_demande: item.type, action, ...extra }),
      })
      const d = await res.json()
      setMsg(d.success ? '✅ Action effectuée' : '❌ ' + (d.error ?? 'Erreur'))
      router.refresh()
    } catch { setMsg('❌ Erreur réseau') }
    setLoading(null); setModal(null)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Paiements centralisés</h1>

      {/* Résumé */}
      <div className="bg-[#1A1A1A] rounded-2xl p-5 text-center">
        <p className="text-white/60 text-sm mb-1">Total à décaisser</p>
        <p className="text-[#C9A84C] text-3xl font-bold">{data.totalDecaisser}</p>
        <p className="text-white/40 text-xs mt-1">{data.enAttente.length} demande(s) en attente</p>
      </div>

      {msg && <p className="text-sm font-medium text-center p-3 bg-gray-50 rounded-xl">{msg}</p>}

      {/* File d'attente */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <p className="font-semibold text-sm px-5 pt-4 pb-2">File d&apos;attente</p>
        {data.enAttente.length === 0
          ? <p className="text-center text-gray-400 py-8 text-sm">Aucune demande en attente ✅</p>
          : <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>{['Type','Nom','N° OM','Montant','Date','Actions'].map(h => <th key={h} className="text-left px-4 py-3">{h}</th>)}</tr>
              </thead>
              <tbody>
                {data.enAttente.map(item => (
                  <tr key={item.id} className="border-t border-gray-50">
                    <td className="px-4 py-3"><span className="text-xs font-medium">{TYPE_LABEL[item.type]}{item.palier ? ` J${item.palier}` : ''}</span></td>
                    <td className="px-4 py-2 font-medium">{item.nom}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{item.telephone_om}</td>
                    <td className="px-4 py-2 font-bold text-[#C9A84C]">{fmt(item.montant)}</td>
                    <td className="px-4 py-2 text-gray-400 text-xs">{item.date ? new Date(item.date).toLocaleDateString('fr-FR') : '—'}</td>
                    <td className="px-4 py-2 flex gap-1.5">
                      <button onClick={() => doAction(item, 'VALIDER')} disabled={loading === item.id}
                        className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs disabled:opacity-50">Valider</button>
                      <button onClick={() => { setModal({ item, action: 'PAYER' }); setRefOM(''); setMsg('') }}
                        className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs">Payé OM</button>
                      <button onClick={() => { setModal({ item, action: 'REJETER' }); setMotif(''); setMsg('') }}
                        className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs">Rejeter</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>

      {/* Historique */}
      {data.historique.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <p className="font-semibold text-sm px-5 pt-4 pb-2">Historique (30 derniers)</p>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>{['Type','Nom','Montant','Date','Statut'].map(h => <th key={h} className="text-left px-4 py-3">{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.historique.map(item => (
                <tr key={item.id} className="border-t border-gray-50">
                  <td className="px-4 py-2 text-xs">{TYPE_LABEL[item.type]}</td>
                  <td className="px-4 py-2">{item.nom}</td>
                  <td className="px-4 py-2 font-semibold text-[#C9A84C]">{fmt(item.montant)}</td>
                  <td className="px-4 py-2 text-gray-400 text-xs">{item.date ? new Date(item.date).toLocaleDateString('fr-FR') : '—'}</td>
                  <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUT_COLOR[item.statut] ?? 'bg-gray-100 text-gray-500'}`}>{item.statut}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <p className="font-bold mb-3">{modal.action === 'PAYER' ? 'Marquer comme payé' : 'Rejeter la demande'}</p>
            <p className="text-sm text-gray-600 mb-3">{modal.item.nom} — {fmt(modal.item.montant)}</p>
            {modal.action === 'PAYER'
              ? <input value={refOM} onChange={e => setRefOM(e.target.value)} placeholder="Référence OM obligatoire"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3" />
              : <input value={motif} onChange={e => setMotif(e.target.value)} placeholder="Motif obligatoire"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3" />
            }
            <button onClick={() => doAction(modal.item, modal.action, modal.action === 'PAYER' ? { reference_om: refOM } : { motif })}
              disabled={loading !== null || (modal.action === 'PAYER' ? !refOM.trim() : !motif.trim())}
              className={`w-full py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 ${modal.action === 'PAYER' ? 'bg-blue-600' : 'bg-red-500'}`}>
              Confirmer
            </button>
            <button onClick={() => setModal(null)} className="mt-2 w-full text-xs text-gray-400">Annuler</button>
          </div>
        </div>
      )}
    </div>
  )
}
