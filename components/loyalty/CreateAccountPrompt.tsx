'use client'

import { useState } from 'react'

interface Props {
  onClose: () => void
}

export default function CreateAccountPrompt({ onClose }: Props) {
  const [done, setDone] = useState(false)

  if (done) {
    return (
      <div className="bg-[#1A1A1A] border border-[#C9A84C]/20 rounded-xl p-6 text-center">
        <div className="text-3xl mb-3">✅</div>
        <p className="text-[#F5F0E8] font-semibold mb-1">Demande enregistrée</p>
        <p className="text-[#F5F0E8]/50 text-sm">
          Nous vous contacterons dès que le dashboard client sera disponible.
        </p>
        <button
          onClick={onClose}
          className="mt-4 text-[#C9A84C] text-sm hover:underline"
        >
          Fermer
        </button>
      </div>
    )
  }

  return (
    <div className="bg-[#1A1A1A] border border-[#C9A84C]/20 rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[#C9A84C] font-semibold">Dashboard fidélité</h3>
          <p className="text-[#F5F0E8]/50 text-xs mt-1">
            Suivez toutes vos cartes en un seul endroit
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-[#F5F0E8]/30 hover:text-[#F5F0E8] text-lg leading-none"
        >
          ×
        </button>
      </div>

      <ul className="space-y-2">
        {[
          'Voir toutes vos cartes',
          'Historique des points',
          'Alertes niveau supérieur',
          'Avantages exclusifs membres',
        ].map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm text-[#F5F0E8]/70">
            <span className="text-[#C9A84C]">✓</span> {item}
          </li>
        ))}
      </ul>

      <div className="border-t border-[#C9A84C]/10 pt-4">
        <p className="text-[#F5F0E8]/40 text-xs mb-3">
          Fonctionnalité en cours de développement. Laissez votre email pour être notifié au lancement.
        </p>
        <button
          onClick={() => setDone(true)}
          className="w-full bg-[#C9A84C] hover:bg-[#D4AF37] text-black font-semibold py-2.5 rounded-lg text-sm transition"
        >
          M&apos;inscrire à la liste d&apos;attente
        </button>
      </div>
    </div>
  )
}
