'use client'
// BLOCS 1 & 2 — Hero countdown + CTA Boutique/Hébergements

import { useEffect, useState } from 'react'
import { useClientIdentity } from '@/hooks/useClientIdentity'
import { usePanier } from '@/hooks/usePanier'
import { getCodePromoUrl } from '@/lib/generatePromoCode'

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

function CountdownRingSvg({ jours, pctPreparation }: { jours: number | null; pctPreparation: number }) {
  const r = 54; const circ = 2 * Math.PI * r
  const pct = jours !== null ? Math.min(100, Math.round(((365 - jours) / 365) * 100)) : 0
  const offset = circ - (pct / 100) * circ
  return (
    <div className="flex flex-col items-center">
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={r} fill="none" stroke="#F5F0E8" strokeWidth="10" />
        <circle cx="65" cy="65" r={r} fill="none" stroke="#C9A84C" strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 65 65)" style={{ transition: 'stroke-dashoffset 1s ease' }} />
        {jours !== null && jours <= 0
          ? <text x="65" y="72" textAnchor="middle" className="fill-[#C9A84C]" fontSize="11" fontWeight="bold">{jours === 0 ? '🎉' : '✨'}</text>
          : <text x="65" y="60" textAnchor="middle" className="fill-[#1A1A1A]" fontSize="18" fontWeight="bold">{jours ?? '—'}</text>
        }
        {(jours === null || jours > 0) && <text x="65" y="76" textAnchor="middle" className="fill-[#888]" fontSize="9">jours</text>}
        <text x="65" y="90" textAnchor="middle" className="fill-[#C9A84C]" fontSize="8">{pctPreparation}% préparé</text>
      </svg>
    </div>
  )
}

interface Props { uid: string; todosDone: number; todosTotal: number }

export default function HeroCTA({ uid, todosDone, todosTotal }: Props) {
  const identity = useClientIdentity()
  const { totaux } = usePanier(uid)
  const pctPrep = todosTotal > 0 ? Math.round((todosDone / todosTotal) * 100) : 0
  const [toast, setToast] = useState('')

  // Compte à rebours live (secondes)
  const [, setSecondes] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setSecondes(s => (s + 1) % 60), 1000)
    return () => clearInterval(t)
  }, [])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000) }

  function openBoutique() {
    const url = identity.code_promo
      ? getCodePromoUrl(identity.code_promo, identity.uid || uid, 'boutique')
      : `https://letlui-signature.netlify.app?ref=${identity.uid || uid}`
    window.open(url, '_blank', 'noopener,noreferrer')
    showToast('Boutique ouverte ! Revenez ici pour enregistrer vos achats.')
  }

  function openHebergements() {
    const url = identity.code_promo
      ? getCodePromoUrl(identity.code_promo, identity.uid || uid, 'hebergement')
      : `https://llui-signature-hebergements.vercel.app/hebergements?ref=${identity.uid || uid}`
    window.open(url, '_blank', 'noopener,noreferrer')
    showToast('Site hébergements ouvert ! Revenez ici pour enregistrer votre réservation.')
  }

  return (
    <div className="space-y-4">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white text-xs px-4 py-2.5 rounded-xl shadow-lg text-center max-w-xs">{toast}</div>}

      {/* BLOC 1 — Hero countdown */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F5F0E8] text-center">
        <p className="font-serif italic text-base text-[#C9A84C] mb-0.5">{identity.noms_maries}</p>
        {identity.lieu && <p className="text-[10px] text-[#888]">{identity.lieu}</p>}
        <div className="flex justify-center my-3">
          <CountdownRingSvg jours={identity.jours_avant_mariage} pctPreparation={pctPrep} />
        </div>
        {identity.jours_avant_mariage !== null && identity.jours_avant_mariage > 0 && (
          <p className="text-xs text-[#888]">Plus que <strong className="text-[#1A1A1A]">{identity.jours_avant_mariage} jour{identity.jours_avant_mariage > 1 ? 's' : ''}</strong> avant le grand jour</p>
        )}
        {identity.jours_avant_mariage === 0 && (
          <p className="text-xs font-semibold text-[#C9A84C]">C&apos;est aujourd&apos;hui ! Félicitations ! 🎉</p>
        )}
        {identity.jours_avant_mariage !== null && identity.jours_avant_mariage < 0 && (
          <p className="text-xs font-semibold text-[#C9A84C]">Jour J passé — Félicitations ! ✨</p>
        )}
      </div>

      {/* Bouton paramètres */}
      <div className="text-center -mt-2">
        <a href="/portail/parametres" className="inline-flex items-center gap-1 text-xs text-[#888] hover:text-[#C9A84C] transition-colors">
          <span>⚙️</span> Paramétrer mon mariage
        </a>
      </div>

      {/* BLOC 2 — CTA Boutique + Hébergements (liens externes) */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
        <p className="text-sm font-semibold text-[#1A1A1A] text-center mb-3">Composez votre mariage ✨</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <button onClick={openBoutique} className="rounded-2xl p-4 flex flex-col items-center gap-1 transition-opacity hover:opacity-90 w-full" style={{ background: '#1A1A1A' }}>
            <span style={{ fontSize: 24 }}>🛍️</span>
            <p className="text-xs font-bold text-[#C9A84C] text-center leading-tight">Boutique L&amp;Lui Signature</p>
            <p className="text-[10px] text-white/50 text-center">26 prestations disponibles</p>
          </button>
          <button onClick={openHebergements} className="rounded-2xl p-4 flex flex-col items-center gap-1 transition-opacity hover:opacity-90 w-full" style={{ background: '#C9A84C' }}>
            <span style={{ fontSize: 24 }}>🏡</span>
            <p className="text-xs font-bold text-[#1A1A1A] text-center leading-tight">Sélection Hébergements</p>
            <p className="text-[10px] text-[#1A1A1A]/60 text-center">Kribi &amp; environs</p>
          </button>
        </div>

        {/* Bouton panier si articles */}
        {totaux.nb_articles > 0 && (
          <div className="flex items-center justify-between bg-[#F5F0E8] rounded-xl px-3 py-2.5 border border-[#C9A84C]/30">
            <div>
              <p className="text-xs font-semibold text-[#1A1A1A]">🛒 Mon Panier — {totaux.nb_articles} article{totaux.nb_articles > 1 ? 's' : ''}</p>
              <p className="text-[10px] text-[#888]">{formatFCFA(totaux.total_ht)}</p>
            </div>
            <a href="/portail/panier" className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white" style={{ background: '#1A1A1A' }}>Voir →</a>
          </div>
        )}
      </div>
    </div>
  )
}
