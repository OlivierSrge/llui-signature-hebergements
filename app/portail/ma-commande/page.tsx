'use client'
// app/portail/ma-commande/page.tsx
// Suivi de commande + déclaration de versements

import { useEffect, useState } from 'react'
import type { Commande, Versement } from '@/app/api/portail/commandes/route'
import type { VersementDeclare } from '@/app/api/portail/versements/route'

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n)) + ' FCFA'
}

function getUidFromCookie(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/portail_uid=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

const STATUT_COLORS: Record<string, string> = {
  EN_ATTENTE: '#888',
  DECLARE: '#C9A84C',
  VALIDE: '#7C9A7E',
  REFUSE: '#C0392B',
}

const STATUT_LABELS: Record<string, string> = {
  EN_ATTENTE: 'En attente',
  DECLARE: 'Déclaré',
  VALIDE: 'Validé ✓',
  REFUSE: 'Refusé',
}

const MODES = [
  { key: 'OM', label: 'Orange Money', icon: '🟠' },
  { key: 'MOMO', label: 'MTN MoMo', icon: '🟡' },
  { key: 'VIREMENT', label: 'Virement', icon: '🏦' },
  { key: 'CASH', label: 'Espèces', icon: '💵' },
]

function VersementCard({ v, index }: { v: Versement; index: number }) {
  const colors = ['#C9A84C', '#0F52BA', '#7C9A7E']
  const color = colors[index] ?? '#888'
  const statutColor = STATUT_COLORS[v.statut] ?? '#888'
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[#F5F0E8] last:border-0">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: color }}>
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#1A1A1A]">{v.label}</p>
        <p className="text-[11px] text-[#888]">{v.echeance}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold" style={{ color }}>{formatFCFA(v.montant)}</p>
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: statutColor + '22', color: statutColor }}>
          {STATUT_LABELS[v.statut] ?? v.statut}
        </span>
      </div>
    </div>
  )
}

export default function MaCommandePage() {
  const [uid] = useState(() => getUidFromCookie())
  const [commande, setCommande] = useState<Commande | null>(null)
  const [versementsDeclares, setVersementsDeclares] = useState<VersementDeclare[]>([])
  const [loading, setLoading] = useState(true)

  // Formulaire déclaration
  const [montant, setMontant] = useState('')
  const [mode, setMode] = useState('OM')
  const [reference, setReference] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!uid) { setLoading(false); return }
    fetch(`/api/portail/commandes?uid=${encodeURIComponent(uid)}`)
      .then(r => r.json())
      .then((data: { commandes?: Commande[] }) => {
        const cmd = data.commandes?.[0] ?? null
        setCommande(cmd)
        if (cmd?.id) {
          return fetch(`/api/portail/versements?commande_id=${cmd.id}&uid=${encodeURIComponent(uid)}`)
            .then(r => r.json())
            .then((vd: { versements?: VersementDeclare[] }) => {
              setVersementsDeclares(vd.versements ?? [])
            })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [uid])

  async function declarerVersement() {
    if (!commande?.id || !montant || !uid) return
    setSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(false)
    try {
      const res = await fetch('/api/portail/versements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commande_id: commande.id,
          uid,
          montant: parseFloat(montant.replace(/\s/g, '').replace(',', '.')),
          mode,
          reference,
        }),
      })
      const data = await res.json() as { success?: boolean; error?: string }
      if (data.error) throw new Error(data.error)
      setSubmitSuccess(true)
      setMontant('')
      setReference('')
      // Recharger les versements
      const vd = await fetch(`/api/portail/versements?commande_id=${commande.id}&uid=${encodeURIComponent(uid)}`).then(r => r.json()) as { versements?: VersementDeclare[] }
      setVersementsDeclares(vd.versements ?? [])
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSubmitting(false)
    }
  }

  const totalValide = versementsDeclares
    .filter(v => v.statut === 'VALIDE')
    .reduce((s, v) => s + v.montant, 0)

  const totalDeclare = versementsDeclares
    .filter(v => v.statut !== 'REFUSE')
    .reduce((s, v) => s + v.montant, 0)

  if (loading) {
    return <div className="max-w-2xl mx-auto px-4 py-12 text-center text-[#888] text-sm">Chargement…</div>
  }

  if (!commande) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-5xl mb-4">📋</p>
        <h2 className="font-serif italic text-2xl text-[#1A1A1A] mb-2">Aucune commande</h2>
        <p className="text-sm text-[#888] mb-6">Vous n&apos;avez pas encore passé de commande.</p>
        <a href="/portail/panier" className="px-5 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: '#C9A84C' }}>
          Voir mon panier
        </a>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-5">
        <h1 className="font-serif italic text-2xl text-[#1A1A1A]">Ma Commande</h1>
        <p className="text-[11px] text-[#888] mt-0.5 font-mono">Réf. {commande.id}</p>
      </div>

      {/* Progression globale */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8] mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-[#888]">Total commande</span>
          <span className="font-bold text-[#1A1A1A]">{formatFCFA(commande.total_ht)}</span>
        </div>
        <div className="flex justify-between text-sm mb-3">
          <span className="text-[#888]">Montant validé</span>
          <span className="font-semibold text-[#7C9A7E]">{formatFCFA(totalValide)}</span>
        </div>
        {commande.total_ht > 0 && (
          <>
            <div className="h-2.5 bg-[#F5F0E8] rounded-full overflow-hidden mb-1">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, Math.round((totalDeclare / commande.total_ht) * 100))}%`,
                  background: '#C9A84C',
                }}
              />
            </div>
            <p className="text-[11px] text-[#888]">
              {Math.round((totalDeclare / commande.total_ht) * 100)}% déclaré · {Math.round((totalValide / commande.total_ht) * 100)}% validé
            </p>
          </>
        )}
      </div>

      {/* Échéancier */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8] mb-4">
        <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-2">Échéancier</p>
        {commande.versements.map((v, i) => (
          <VersementCard key={i} v={v} index={i} />
        ))}
      </div>

      {/* Versements déclarés */}
      {versementsDeclares.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8] mb-4">
          <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-2">Paiements déclarés</p>
          {versementsDeclares.map(v => {
            const color = STATUT_COLORS[v.statut] ?? '#888'
            return (
              <div key={v.id} className="flex items-center gap-3 py-2.5 border-b border-[#F5F0E8] last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#1A1A1A]">{formatFCFA(v.montant)} — {v.mode}</p>
                  {v.reference && <p className="text-[11px] text-[#888]">Réf. {v.reference}</p>}
                </div>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: color + '22', color }}>
                  {STATUT_LABELS[v.statut] ?? v.statut}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Formulaire déclaration */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8] mb-4">
        <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-3">Déclarer un paiement</p>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#888] mb-1 block">Montant (FCFA)</label>
            <input
              type="number"
              value={montant}
              onChange={e => setMontant(e.target.value)}
              placeholder="ex: 1050000"
              className="w-full text-sm border border-[#E8E0D0] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#C9A84C]"
            />
          </div>

          <div>
            <label className="text-xs text-[#888] mb-1 block">Mode de paiement</label>
            <div className="grid grid-cols-2 gap-2">
              {MODES.map(m => (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all"
                  style={{
                    borderColor: mode === m.key ? '#C9A84C' : '#E8E0D0',
                    background: mode === m.key ? '#C9A84C11' : 'white',
                    color: mode === m.key ? '#C9A84C' : '#1A1A1A',
                  }}
                >
                  <span>{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-[#888] mb-1 block">Référence transaction (optionnel)</label>
            <input
              type="text"
              value={reference}
              onChange={e => setReference(e.target.value)}
              placeholder="ex: TXN123456"
              className="w-full text-sm border border-[#E8E0D0] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#C9A84C]"
            />
          </div>
        </div>

        {submitSuccess && (
          <div className="mt-3 p-3 bg-green-50 text-green-800 rounded-xl text-sm">
            ✅ Paiement déclaré — l&apos;équipe va le valider sous 24h.
          </div>
        )}
        {submitError && (
          <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-xl text-sm">
            ❌ {submitError}
          </div>
        )}

        <button
          onClick={declarerVersement}
          disabled={submitting || !montant}
          className="w-full mt-4 py-3 rounded-2xl text-sm font-semibold text-white transition-all disabled:opacity-50"
          style={{ background: '#C9A84C' }}
        >
          {submitting ? 'Envoi en cours…' : 'Déclarer ce paiement'}
        </button>
      </div>

      <a href="/portail" className="text-xs text-[#888] block text-center py-2">
        ← Retour au tableau de bord
      </a>
    </div>
  )
}
