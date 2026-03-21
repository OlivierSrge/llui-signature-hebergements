'use client'
// components/admin/portail/ReservationHebergementAdmin.tsx
// Card admin — Saisie réservation hébergement confirmée → 2% cash cagnotte marié

import { useState, useEffect } from 'react'

interface CodePromo {
  uid: string
  noms_maries: string
  code: string
}

interface ConfirmResult {
  success?: boolean
  transaction_id?: string
  montant_total?: number
  commission_cash?: number
  message?: string
  error?: string
}

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

export default function ReservationHebergementAdmin() {
  const [maries, setMaries] = useState<CodePromo[]>([])
  const [loadingMaries, setLoadingMaries] = useState(true)
  const [form, setForm] = useState({ marie_uid: '', logement: '', prix_nuit: '', nb_nuits: '' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ConfirmResult | null>(null)

  // Chargement liste des mariés depuis l'API codes_promos
  useEffect(() => {
    fetch('/api/admin/liste-maries')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.maries)) setMaries(d.maries) })
      .catch(() => {})
      .finally(() => setLoadingMaries(false))
  }, [])

  const prixNuit = Number(form.prix_nuit) || 0
  const nbNuits = Number(form.nb_nuits) || 0
  const montantTotal = prixNuit * nbNuits
  const commissionCash = Math.round(montantTotal * 0.02)

  async function confirmer() {
    if (!form.marie_uid || !form.logement || prixNuit <= 0 || nbNuits <= 0) {
      setResult({ error: 'Tous les champs sont requis' }); return
    }
    setLoading(true); setResult(null)
    try {
      const res = await fetch('/api/admin/confirmer-reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marie_uid: form.marie_uid,
          logement: form.logement,
          prix_nuit: prixNuit,
          nb_nuits: nbNuits,
        }),
      })
      const data = await res.json()
      setResult(data)
      if (data.success) setForm({ marie_uid: '', logement: '', prix_nuit: '', nb_nuits: '' })
    } catch {
      setResult({ error: 'Erreur réseau' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-6 border-2 border-orange-400 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-xl">🏡</div>
        <div>
          <h2 className="font-bold text-[#1A1A1A] text-lg">Réservations Hébergements</h2>
          <p className="text-xs text-[#1A1A1A]/50">2% cash → cagnotte marié</p>
        </div>
      </div>

      <div className="space-y-2.5 mb-3">
        {/* Sélecteur marié */}
        <select
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 bg-white"
          value={form.marie_uid}
          onChange={e => setForm(p => ({ ...p, marie_uid: e.target.value }))}
          disabled={loadingMaries}
        >
          <option value="">{loadingMaries ? 'Chargement…' : 'Sélectionner un marié'}</option>
          {maries.map(m => (
            <option key={m.uid} value={m.uid}>{m.noms_maries} ({m.code})</option>
          ))}
        </select>

        {/* Nom du logement */}
        <input
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
          placeholder="Nom du logement (ex: Villa Cocotier Kribi)"
          value={form.logement}
          onChange={e => setForm(p => ({ ...p, logement: e.target.value }))}
        />

        {/* Prix/nuit + Nb nuits */}
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min="0"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
            placeholder="Prix / nuit (FCFA)"
            value={form.prix_nuit}
            onChange={e => setForm(p => ({ ...p, prix_nuit: e.target.value }))}
          />
          <input
            type="number"
            min="1"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
            placeholder="Nb nuits"
            value={form.nb_nuits}
            onChange={e => setForm(p => ({ ...p, nb_nuits: e.target.value }))}
          />
        </div>

        {/* Calcul automatique */}
        {montantTotal > 0 && (
          <div className="rounded-xl p-3 text-sm space-y-1" style={{ background: '#FFF7ED' }}>
            <div className="flex justify-between">
              <span className="text-[#888]">Montant total</span>
              <span className="font-semibold text-[#1A1A1A]">{formatFCFA(montantTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#888]">Commission 2% cash</span>
              <span className="font-bold" style={{ color: '#C9A84C' }}>+ {formatFCFA(commissionCash)}</span>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={confirmer}
        disabled={loading || !form.marie_uid || !form.logement || prixNuit <= 0 || nbNuits <= 0}
        className="w-full py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-colors"
        style={{ background: '#F97316' }}
      >
        {loading ? 'Confirmation…' : '✅ Confirmer la réservation'}
      </button>

      {result && (
        <div className={`mt-3 p-3 rounded-xl text-sm ${result.error ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-900'}`}>
          {result.error ? (
            <span>❌ {result.error}</span>
          ) : (
            <>
              <p className="font-semibold">✅ Réservation confirmée !</p>
              <p className="text-xs mt-1">Total : <strong>{result.montant_total ? formatFCFA(result.montant_total) : '—'}</strong></p>
              <p className="text-xs mt-0.5">Cagnotte créditée : <strong style={{ color: '#C9A84C' }}>+{result.commission_cash ? formatFCFA(result.commission_cash) : '—'}</strong></p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
