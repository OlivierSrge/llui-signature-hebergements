'use client'
// components/portail/FastStartSection.tsx
// Section Fast Start avec 5 états visuels + formulaire Orange Money

import { useState } from 'react'

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n)) + ' FCFA'
}

export interface PalierState {
  palier: 30 | 60 | 90
  rev_requis: number
  montant_prime: number
  unlocked: boolean
  claimed: boolean
  expire: boolean
  paye: boolean
  jours_restants: number | null   // null si expiré ou payé
  paye_at?: string | null
  reference_om?: string | null
  telephone_claimed?: string | null
}

interface Props {
  uid: string
  displayName: string
  joursEcoules: number | null
  paliers: PalierState[]
  revLifetime: number
}

function PalierCard({ p, uid, displayName }: { p: PalierState; uid: string; displayName: string }) {
  const [nom, setNom] = useState(displayName)
  const [tel, setTel] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [claimed, setClaimed] = useState(p.claimed)

  // État PAYÉ
  if (p.paye) {
    return (
      <div className="rounded-xl p-4 border border-[#7C9A7E] bg-[#7C9A7E]/10">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold text-[#7C9A7E] uppercase">Palier J{p.palier} — Payé</p>
            <p className="text-xl font-bold text-[#7C9A7E] mt-1">{formatFCFA(p.montant_prime)}</p>
            {p.paye_at && <p className="text-[10px] text-[#888] mt-1">Viré le {new Date(p.paye_at).toLocaleDateString('fr-FR')}</p>}
            {p.reference_om && <p className="text-[10px] text-[#888]">Réf. OM : {p.reference_om}</p>}
          </div>
          <div className="text-2xl">✅</div>
        </div>
      </div>
    )
  }

  // État EXPIRÉ
  if (p.expire) {
    return (
      <div className="rounded-xl p-4 border border-red-200 bg-red-50/50 opacity-80">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs font-semibold text-red-400 uppercase">Palier J{p.palier} — Expiré</p>
            <p className="text-[11px] text-[#888] mt-0.5">{p.rev_requis} REV requis — délai dépassé</p>
          </div>
          <div className="text-xl">❌</div>
        </div>
      </div>
    )
  }

  // État EN ATTENTE (claimed mais pas encore payé)
  if (claimed) {
    return (
      <div className="rounded-xl p-4 border border-[#0F52BA] bg-[#0F52BA]/10">
        <p className="text-xs font-semibold text-[#0F52BA] uppercase mb-1">Palier J{p.palier} — En attente</p>
        <p className="text-xl font-bold text-[#0F52BA]">{formatFCFA(p.montant_prime)}</p>
        <p className="text-[11px] text-[#888] mt-1">Demande envoyée — traitement sous 48h</p>
        {p.telephone_claimed && <p className="text-[10px] text-[#888]">N° OM : {p.telephone_claimed}</p>}
      </div>
    )
  }

  // État DÉBLOQUÉ non réclamé
  if (p.unlocked) {
    const handleClaim = async () => {
      if (!/^\+237[0-9]{9}$/.test(tel)) {
        setToast('Format invalide. Attendu : +237XXXXXXXXX')
        return
      }
      setLoading(true)
      setToast(null)
      try {
        const res = await fetch('/api/portail/fast-start/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid, palier: p.palier, nom_complet: nom, telephone_om: tel }),
        })
        const json = await res.json()
        if (json.success) {
          setClaimed(true)
          setToast('Demande envoyée ! Traitement sous 48h.')
        } else {
          setToast(json.error ?? 'Erreur lors de la demande.')
        }
      } catch {
        setToast('Erreur réseau — réessayez.')
      } finally {
        setLoading(false)
      }
    }

    return (
      <div className="rounded-xl p-4 border-2 border-[#C9A84C] bg-[#C9A84C]/10 animate-pulse-subtle">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-xs font-semibold text-[#C9A84C] uppercase">🎯 Palier J{p.palier} débloqué !</p>
            <p className="text-xl font-bold text-[#C9A84C]">{formatFCFA(p.montant_prime)}</p>
          </div>
          <div className="text-2xl">🟡</div>
        </div>
        <input
          type="text" placeholder="Nom complet" value={nom}
          onChange={e => setNom(e.target.value)}
          className="w-full border border-[#E8E0D0] rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:border-[#C9A84C]"
        />
        <input
          type="tel" placeholder="+237XXXXXXXXX (Orange Money)"
          value={tel} onChange={e => setTel(e.target.value)}
          className="w-full border border-[#E8E0D0] rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-[#C9A84C]"
        />
        {toast && <p className="text-[11px] text-red-500 mb-2">{toast}</p>}
        <button
          onClick={handleClaim} disabled={loading}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: loading ? '#888' : '#C9A84C' }}
        >
          {loading ? 'Envoi…' : 'Réclamer ma prime →'}
        </button>
      </div>
    )
  }

  // État NON DÉBLOQUÉ
  const urgent = p.jours_restants !== null && p.jours_restants <= 7
  return (
    <div className="rounded-xl p-4 border border-[#E8E0D0] bg-[#F9F6F0]">
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-[#888] uppercase">Palier J{p.palier}</p>
            {urgent && (
              <span className="text-[10px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full font-semibold">
                ⚡ Urgent ! {p.jours_restants}j
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#888] mt-0.5">{p.rev_requis} REV requis</p>
        </div>
        <p className="text-sm font-bold text-[#888]">{formatFCFA(p.montant_prime)}</p>
      </div>
      {p.jours_restants !== null && (
        <p className="text-[10px] text-[#888]">{p.jours_restants} jour(s) restant(s)</p>
      )}
    </div>
  )
}

export default function FastStartSection({ uid, displayName, joursEcoules, paliers, revLifetime }: Props) {
  return (
    <div id="fast-start" className="bg-white rounded-2xl p-5 shadow-sm border border-[#F5F0E8]">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm font-semibold text-[#1A1A1A]">Fast Start Cameroun</p>
        {joursEcoules !== null && (
          <span className="text-[11px] text-[#888]">J+{joursEcoules} / 90</span>
        )}
      </div>
      <div className="space-y-3">
        {paliers.map(p => (
          <PalierCard key={p.palier} p={p} uid={uid} displayName={displayName} />
        ))}
      </div>
    </div>
  )
}
