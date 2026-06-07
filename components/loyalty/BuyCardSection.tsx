'use client'

import { useState, useEffect } from 'react'
import type { LoyaltyProgram } from '@/types/loyalty'
import BuyCardForm from './BuyCardForm'

interface Props {
  program: LoyaltyProgram
  partenaireId: string
}

export default function BuyCardSection({ program, partenaireId }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [savedCardId, setSavedCardId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const id = localStorage.getItem('loyalty_card_id')
      if (id) setSavedCardId(id)
    }
  }, [])

  const savedCardUrl = savedCardId
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://llui-signature-hebergements.vercel.app'}/loyalty/card/${savedCardId}`
    : ''

  const handleCopySavedLink = async () => {
    if (!savedCardUrl) return
    try {
      await navigator.clipboard.writeText(savedCardUrl)
    } catch {
      const el = document.createElement('textarea')
      el.value = savedCardUrl
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleNewCard = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('loyalty_card_id')
      localStorage.removeItem('loyalty_card_program')
    }
    setSavedCardId(null)
    setShowForm(true)
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      {/* Titre section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[#1A1A1A]">
          🎫 Carte de fidélité
        </h2>
        <span className="text-xs bg-[#C9A84C]/10 text-[#C9A84C] font-semibold px-3 py-1 rounded-full">
          {program.prix_fcfa.toLocaleString('fr-FR')} FCFA
        </span>
      </div>

      {/* Carte déjà existante (localStorage) */}
      {savedCardId && !showForm && (
        <div className="mb-4">
          <div className="bg-[#FFFBF0] border border-[#C9A84C]/30 rounded-xl p-4 mb-3">
            <p className="text-sm font-semibold text-[#1A1A1A] mb-1">
              🎫 Vous avez déjà une carte en cours
            </p>
            <p className="text-xs text-[#1A1A1A]/60 mb-3">
              Retrouvez votre carte ou vérifiez son état de validation.
            </p>

            {/* Lien privé sauvegardé */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={savedCardUrl}
                readOnly
                className="flex-1 border border-[#DDD] rounded-lg px-3 py-1.5 text-xs font-mono text-[#1A1A1A]/70 bg-white truncate focus:outline-none"
              />
              <button
                onClick={handleCopySavedLink}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-[#C9A84C] text-white hover:bg-[#D4AF37]'
                }`}
              >
                {copied ? '✅ Copié' : '📋 Copier'}
              </button>
            </div>

            <div className="flex gap-2">
              <a
                href={`/loyalty/card/${savedCardId}`}
                className="flex-1 text-center bg-[#1A1A1A] hover:bg-[#333] text-white text-xs font-semibold py-2.5 rounded-xl transition"
              >
                Voir ma carte →
              </a>
              <button
                onClick={handleNewCard}
                className="px-4 py-2.5 border border-[#DDD] rounded-xl text-xs text-[#1A1A1A]/50 hover:bg-[#F9F5F2] transition"
              >
                Nouvelle carte
              </button>
            </div>
          </div>

          <p className="text-[10px] text-[#1A1A1A]/30 text-center">
            ⚠️ Lien privé — gardez-le précieusement
          </p>
        </div>
      )}

      {/* Formulaire ou présentation */}
      {!showForm && !savedCardId && (
        <>
          {program.description && (
            <p className="text-xs text-[#1A1A1A]/60 mb-4">{program.description}</p>
          )}

          {program.niveaux.length > 0 && (
            <div className="flex gap-2 mb-4">
              {program.niveaux.map((n) => (
                <div
                  key={n.id}
                  className="flex-1 bg-[#F9F5F2] rounded-xl p-2.5 text-center"
                >
                  <div className="text-lg mb-0.5">{n.emoji}</div>
                  <p className="text-[10px] font-semibold" style={{ color: n.couleur }}>
                    {n.nom}
                  </p>
                </div>
              ))}
            </div>
          )}

          {program.niveaux[0]?.avantages?.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-semibold text-[#1A1A1A]/50 uppercase tracking-wider mb-2">
                Avantages inclus
              </p>
              <ul className="space-y-1">
                {program.niveaux[0].avantages.slice(0, 4).map((av, i) => (
                  <li key={i} className="text-xs text-[#1A1A1A]/70 flex items-center gap-1.5">
                    <span className="text-[#C9A84C]">✓</span> {av}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-[#1A1A1A]/40 mb-4">
            Valide {program.duree_validite_mois} mois · Cumulez des points à chaque visite
          </p>

          <button
            onClick={() => setShowForm(true)}
            className="w-full bg-[#C9A84C] hover:bg-[#D4AF37] text-white font-semibold py-3 rounded-xl text-sm transition"
          >
            Obtenir ma carte de fidélité
          </button>
        </>
      )}

      {showForm && (
        <BuyCardForm
          program={program}
          partenaireId={partenaireId}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
