'use client'
// components/admin/FastStartTable.tsx
// Tableau des demandes Fast Start + actions VALIDER / PAYER / REJETER

import { useState } from 'react'

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n)) + ' FCFA'
}

export interface Demande {
  id: string
  nom_complet: string
  palier: 30 | 60 | 90
  rev_au_moment: number
  montant_prime: number
  telephone_om: string
  atteint_at: string
  statut: 'EN_ATTENTE' | 'VALIDEE' | 'PAYEE' | 'REJETEE'
}

const STATUT_COLORS: Record<string, string> = {
  EN_ATTENTE: '#C9A84C', VALIDEE: '#0F52BA', PAYEE: '#7C9A7E', REJETEE: '#C0392B',
}

export default function FastStartTable({ demandes: initial }: { demandes: Demande[] }) {
  const [demandes, setDemandes] = useState(initial)
  const [modalPayer, setModalPayer] = useState<Demande | null>(null)
  const [modalRejeter, setModalRejeter] = useState<Demande | null>(null)
  const [refOM, setRefOM] = useState('')
  const [motif, setMotif] = useState('')
  const [loading, setLoading] = useState(false)

  const post = async (body: object) => {
    setLoading(true)
    const res = await fetch('/api/portail/fast-start/admin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setLoading(false)
    return res.json()
  }

  const doValider = async (d: Demande) => {
    if (!confirm(`Valider la prime de ${formatFCFA(d.montant_prime)} pour ${d.nom_complet} ?`)) return
    const r = await post({ action: 'VALIDER', demande_id: d.id })
    if (r.success) setDemandes(prev => prev.map(x => x.id === d.id ? { ...x, statut: 'VALIDEE' } : x))
    else alert(r.error)
  }

  const doPayer = async () => {
    if (!modalPayer || !refOM.trim()) return
    const r = await post({ action: 'PAYER', demande_id: modalPayer.id, reference_om: refOM })
    if (r.success) {
      setDemandes(prev => prev.map(x => x.id === modalPayer.id ? { ...x, statut: 'PAYEE' } : x))
      setModalPayer(null); setRefOM('')
    } else alert(r.error)
  }

  const doRejeter = async () => {
    if (!modalRejeter) return
    const r = await post({ action: 'REJETER', demande_id: modalRejeter.id, note: motif })
    if (r.success) {
      setDemandes(prev => prev.map(x => x.id === modalRejeter.id ? { ...x, statut: 'REJETEE' } : x))
      setModalRejeter(null); setMotif('')
    } else alert(r.error)
  }

  if (demandes.length === 0) {
    return <p className="text-sm text-[#888] py-6 text-center">Aucune demande Fast Start.</p>
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] text-[#888] border-b border-[#F5F0E8]">
              {['Nom', 'Palier', 'REV', 'Montant', 'N° Orange Money', 'Date', 'Statut', 'Actions'].map(h => (
                <th key={h} className="text-left py-2 px-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {demandes.map(d => (
              <tr key={d.id} className="border-b border-[#F5F0E8] hover:bg-[#FAFAF7]">
                <td className="py-2.5 px-3 font-medium text-[#1A1A1A]">{d.nom_complet}</td>
                <td className="py-2.5 px-3">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#C9A84C22', color: '#C9A84C' }}>
                    J{d.palier}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-[#888]">{d.rev_au_moment}</td>
                <td className="py-2.5 px-3 font-semibold text-[#C9A84C]">{formatFCFA(d.montant_prime)}</td>
                <td className="py-2.5 px-3 text-[11px] font-mono">{d.telephone_om}</td>
                <td className="py-2.5 px-3 text-[11px] text-[#888]">
                  {new Date(d.atteint_at).toLocaleDateString('fr-FR')}
                </td>
                <td className="py-2.5 px-3">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: STATUT_COLORS[d.statut] + '22', color: STATUT_COLORS[d.statut] }}>
                    {d.statut.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex gap-1.5">
                    {d.statut === 'EN_ATTENTE' && (
                      <>
                        <button onClick={() => doValider(d)} className="text-[11px] bg-[#7C9A7E] text-white px-2 py-1 rounded-lg">Valider</button>
                        <button onClick={() => setModalRejeter(d)} className="text-[11px] bg-red-400 text-white px-2 py-1 rounded-lg">Rejeter</button>
                      </>
                    )}
                    {d.statut === 'VALIDEE' && (
                      <button onClick={() => setModalPayer(d)} className="text-[11px] bg-[#0F52BA] text-white px-2 py-1 rounded-lg">Marquer payé</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal PAYER */}
      {modalPayer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setModalPayer(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-[#1A1A1A] mb-1">Marquer payé</h3>
            <p className="text-sm text-[#888] mb-4">{modalPayer.nom_complet} — {formatFCFA(modalPayer.montant_prime)}</p>
            <input type="text" placeholder="Référence transaction Orange Money" value={refOM}
              onChange={e => setRefOM(e.target.value)}
              className="w-full border border-[#E8E0D0] rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:border-[#C9A84C]" />
            <button onClick={doPayer} disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: '#0F52BA' }}>
              {loading ? 'Traitement…' : 'Confirmer le paiement'}
            </button>
          </div>
        </div>
      )}

      {/* Modal REJETER */}
      {modalRejeter && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setModalRejeter(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-[#1A1A1A] mb-4">Rejeter la demande</h3>
            <input type="text" placeholder="Motif du rejet…" value={motif}
              onChange={e => setMotif(e.target.value)}
              className="w-full border border-[#E8E0D0] rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:border-[#C9A84C]" />
            <button onClick={doRejeter} disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: '#C0392B' }}>
              {loading ? 'Traitement…' : 'Confirmer le rejet'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
