'use client'

import { useState } from 'react'
import type { LoyaltyProgram } from '@/types/loyalty'
import BuyCardForm from './BuyCardForm'

interface Props {
  program: LoyaltyProgram
  partenaireId: string
}

export default function BuyCardSection({ program, partenaireId }: Props) {
  const [showForm, setShowForm] = useState(false)

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

      {!showForm ? (
        <>
          {/* Description */}
          {program.description && (
            <p className="text-xs text-[#1A1A1A]/60 mb-4">{program.description}</p>
          )}

          {/* Niveaux */}
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

          {/* Avantages du premier niveau */}
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

          {/* Info validité */}
          <p className="text-xs text-[#1A1A1A]/40 mb-4">
            Valide {program.duree_validite_mois} mois · Cumulez des points à chaque visite
          </p>

          {/* CTA */}
          <button
            onClick={() => setShowForm(true)}
            className="w-full bg-[#C9A84C] hover:bg-[#D4AF37] text-white font-semibold py-3 rounded-xl text-sm transition"
          >
            Obtenir ma carte de fidélité
          </button>
        </>
      ) : (
        <BuyCardForm
          program={program}
          partenaireId={partenaireId}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
