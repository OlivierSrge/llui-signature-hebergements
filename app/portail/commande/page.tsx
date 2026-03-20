'use client'
// app/portail/commande/page.tsx
// Confirmation de commande — dévis + échéancier 30/40/30 + mode paiement

import { useEffect, useState } from 'react'
import { usePanier } from '@/hooks/usePanier'
import type { ArticlePanier, CategorieArticle } from '@/lib/panierTypes'

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n)) + ' FCFA'
}

function getUidFromCookie(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/portail_uid=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

const CAT_LABELS: Record<CategorieArticle, string> = {
  PHOTO_VIDEO: 'Photo / Vidéo',
  DECORATION: 'Décoration',
  TRAITEUR: 'Traiteur',
  MUSIQUE: 'Musique',
  COORDINATION: 'Coordination',
  HEBERGEMENT: 'Hébergement',
  BOUTIQUE: 'Boutique',
  AUTRE: 'Autre',
}

const MODES_PAIEMENT = [
  { key: 'OM', label: 'Orange Money', icon: '🟠' },
  { key: 'MOMO', label: 'MTN MoMo', icon: '🟡' },
  { key: 'VIREMENT', label: 'Virement bancaire', icon: '🏦' },
  { key: 'CASH', label: 'Espèces', icon: '💵' },
]

function addDaysToDate(dateStr: string, days: number): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    d.setDate(d.getDate() + days)
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return ''
  }
}

function dateMinus(dateStr: string, days: number): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    d.setDate(d.getDate() - days)
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return ''
  }
}

export default function CommandePage() {
  const [uid] = useState(() => getUidFromCookie())
  const { articles, totaux, viderPanier } = usePanier(uid)
  const [modePaiement, setModePaiement] = useState('OM')
  const [dateEvenement, setDateEvenement] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [commandeId, setCommandeId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Charger la date événement depuis Firestore portail user si dispo
  useEffect(() => {
    if (!uid) return
    fetch(`/api/portail/user?uid=${encodeURIComponent(uid)}`)
      .then(r => r.json())
      .then((d: { date_evenement?: string }) => {
        if (d.date_evenement) setDateEvenement(d.date_evenement)
      })
      .catch(() => {})
  }, [uid])

  const total = totaux.total_ht
  const v1 = Math.round(total * 0.30)
  const v2 = Math.round(total * 0.40)
  const v3 = total - v1 - v2

  const echeances = [
    { label: 'Acompte (30%)', montant: v1, echeance: 'À la réservation', color: '#C9A84C' },
    { label: 'Tranche 2 (40%)', montant: v2, echeance: dateEvenement ? dateMinus(dateEvenement, 60) || 'J-60 avant l\'événement' : 'J-60 avant l\'événement', color: '#0F52BA' },
    { label: 'Solde (30%)', montant: v3, echeance: dateEvenement ? dateMinus(dateEvenement, 30) || 'J-30 avant l\'événement' : 'J-30 avant l\'événement', color: '#7C9A7E' },
  ]

  async function confirmerCommande() {
    if (!uid || articles.length === 0) return
    setSubmitting(true)
    setError(null)
    try {
      const versements = echeances.map(e => ({
        label: e.label,
        montant: e.montant,
        echeance: e.echeance,
        statut: 'EN_ATTENTE' as const,
      }))

      const res = await fetch('/api/portail/commandes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          articles: articles.map(a => ({
            id: a.id, nom: a.nom, categorie: a.categorie,
            prix_unitaire: a.prix_unitaire, quantite: a.quantite,
          })),
          total_ht: total,
          mode_paiement: modePaiement,
          versements,
          date_evenement: dateEvenement,
        }),
      })
      const data = await res.json() as { id?: string; error?: string }
      if (data.error) throw new Error(data.error)
      setCommandeId(data.id ?? 'OK')
      viderPanier()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la commande')
    } finally {
      setSubmitting(false)
    }
  }

  if (commandeId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-5xl mb-4">✅</p>
        <h2 className="font-serif italic text-2xl text-[#1A1A1A] mb-2">Commande confirmée !</h2>
        <p className="text-sm text-[#888] mb-2">Réf. : <span className="font-mono text-[#C9A84C]">{commandeId}</span></p>
        <p className="text-sm text-[#888] mb-6">Vous recevrez une confirmation. Le premier versement de <strong>{formatFCFA(v1)}</strong> est à effectuer pour valider la réservation.</p>
        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <a href="/portail/ma-commande" className="py-3 rounded-2xl text-sm font-semibold text-white text-center" style={{ background: '#C9A84C' }}>
            Suivre ma commande
          </a>
          <a href="/portail" className="py-3 rounded-2xl text-sm font-semibold text-center border border-[#E8E0D0] text-[#888]">
            Retour au tableau de bord
          </a>
        </div>
      </div>
    )
  }

  if (articles.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-5xl mb-4">🛒</p>
        <h2 className="font-serif italic text-2xl text-[#1A1A1A] mb-2">Panier vide</h2>
        <p className="text-sm text-[#888] mb-6">Ajoutez des prestations avant de finaliser votre commande.</p>
        <a href="/portail/configurateur" className="px-5 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: '#C9A84C' }}>
          Parcourir le catalogue
        </a>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-5">
        <h1 className="font-serif italic text-2xl text-[#1A1A1A]">Ma Commande</h1>
        <p className="text-sm text-[#888] mt-1">Récapitulatif et confirmation</p>
      </div>

      {/* Récapitulatif articles */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8] mb-4">
        <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-3">Récapitulatif</p>
        {articles.map((a: ArticlePanier) => (
          <div key={a.id} className="flex justify-between items-center py-2 border-b border-[#F5F0E8] last:border-0">
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-sm text-[#1A1A1A] truncate">{a.nom}</p>
              <p className="text-[11px] text-[#888]">{CAT_LABELS[a.categorie]} · x{a.quantite}</p>
            </div>
            <p className="text-sm font-semibold text-[#1A1A1A] flex-shrink-0">{formatFCFA(a.prix_unitaire * a.quantite)}</p>
          </div>
        ))}
        <div className="flex justify-between items-center pt-3 mt-1">
          <span className="text-sm font-bold text-[#1A1A1A]">Total</span>
          <span className="text-lg font-bold text-[#C9A84C]">{formatFCFA(total)}</span>
        </div>
      </div>

      {/* Date événement */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8] mb-4">
        <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-2">Date de l&apos;événement</p>
        <input
          type="date"
          value={dateEvenement}
          onChange={e => setDateEvenement(e.target.value)}
          className="w-full text-sm border border-[#E8E0D0] rounded-xl px-3 py-2 focus:outline-none focus:border-[#C9A84C]"
        />
      </div>

      {/* Échéancier 30/40/30 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8] mb-4">
        <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-3">Échéancier de paiement</p>
        <div className="space-y-3">
          {echeances.map((e, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: e.color }}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1A1A1A]">{e.label}</p>
                <p className="text-[11px] text-[#888]">{e.echeance}</p>
              </div>
              <p className="text-sm font-bold flex-shrink-0" style={{ color: e.color }}>{formatFCFA(e.montant)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Mode de paiement */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8] mb-4">
        <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-3">Mode de paiement préféré</p>
        <div className="grid grid-cols-2 gap-2">
          {MODES_PAIEMENT.map(m => (
            <button
              key={m.key}
              onClick={() => setModePaiement(m.key)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all"
              style={{
                borderColor: modePaiement === m.key ? '#C9A84C' : '#E8E0D0',
                background: modePaiement === m.key ? '#C9A84C11' : 'white',
                color: modePaiement === m.key ? '#C9A84C' : '#1A1A1A',
              }}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm mb-4">
          ❌ {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <button
          onClick={confirmerCommande}
          disabled={submitting}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white transition-all disabled:opacity-50"
          style={{ background: '#C9A84C' }}
        >
          {submitting ? 'Confirmation en cours…' : `Confirmer la commande — ${formatFCFA(total)}`}
        </button>
        <button
          onClick={() => window.print()}
          className="w-full py-3 rounded-2xl text-sm font-medium border border-[#E8E0D0] text-[#888]"
        >
          🖨️ Imprimer / Exporter PDF
        </button>
        <a href="/portail/panier" className="text-xs text-[#888] text-center py-2">
          ← Retour au panier
        </a>
      </div>
    </div>
  )
}
