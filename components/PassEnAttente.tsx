'use client'

import { useState } from 'react'
import { GRADE_CONFIGS } from '@/types/stars-grade'
import type { PassVipAnonyme } from '@/types/pass-vip'

export default function PassEnAttente({ pass }: { pass: PassVipAnonyme }) {
  const config = GRADE_CONFIGS[pass.grade_pass]
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] px-4 py-8">
      <div className="max-w-sm mx-auto space-y-4">

        {/* Header */}
        <div className="text-center">
          <p className="text-xs font-medium text-[#C9A84C] uppercase tracking-widest mb-1">L&amp;Lui ✦ Signature</p>
          <h1 className="text-lg font-serif font-semibold text-[#1A1A1A]">Pass VIP Boutique</h1>
        </div>

        {/* Carte grade */}
        <div
          style={{ background: config.bgGradient, borderColor: config.borderColor }}
          className="rounded-3xl border-2 p-6 shadow-xl text-center"
        >
          <p style={{ color: config.textSecondary }} className="text-xs uppercase tracking-widest mb-2">
            Votre Pass réservé
          </p>
          <div className="text-5xl mb-2">{config.emoji}</div>
          <p style={{ color: config.textColor }} className="text-3xl font-bold mb-1">
            {pass.grade_pass}
          </p>
          <p style={{ color: config.textSecondary }} className="text-lg font-semibold mb-3">
            {pass.nom_usage}
          </p>
          {pass.ref_lisible && (
            <div
              style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}
              className="rounded-xl px-4 py-2 inline-block"
            >
              <p style={{ color: config.textColor }} className="text-xs font-mono tracking-wide">
                Réf. {pass.ref_lisible}
              </p>
            </div>
          )}
        </div>

        {/* Statut en attente */}
        <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 text-center">
          <p className="text-2xl mb-1">⏳</p>
          <p className="text-base font-bold text-amber-800 mb-1">Paiement en attente</p>
          <p className="text-sm text-amber-700 leading-relaxed">
            Effectuez votre paiement puis contactez-nous.<br />
            Votre carte sera activée dans les <strong>24h</strong>.
          </p>
        </div>

        {/* Instructions paiement */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-[#1A1A1A]/50 uppercase tracking-widest mb-3">
            💳 Instructions de paiement
          </p>
          <ol className="space-y-3 text-sm text-[#1A1A1A] leading-relaxed list-none">
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#C9A84C] text-white text-xs font-bold flex items-center justify-center">1</span>
              <span>Effectuez le virement via <strong>Orange Money</strong> ou <strong>MTN Mobile Money</strong></span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#C9A84C] text-white text-xs font-bold flex items-center justify-center">2</span>
              <span>Conservez votre <strong>reçu de transaction</strong></span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#C9A84C] text-white text-xs font-bold flex items-center justify-center">3</span>
              <span>
                Envoyez votre reçu avec la référence{' '}
                {pass.ref_lisible && (
                  <strong className="text-[#C9A84C] font-mono">{pass.ref_lisible}</strong>
                )}
              </span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#C9A84C] text-white text-xs font-bold flex items-center justify-center">4</span>
              <span>Rechargez cette page — votre carte <strong>s'affiche automatiquement</strong> dès activation</span>
            </li>
          </ol>
        </div>

        {/* Bouton WhatsApp admin */}
        <a
          href={`https://wa.me/237693407964?text=${encodeURIComponent(
            `Bonjour, j'ai effectué mon paiement pour le Pass VIP ${pass.grade_pass}.\nRéférence : ${pass.ref_lisible ?? pass.id.slice(0, 8).toUpperCase()}\nLien : ${typeof window !== 'undefined' ? window.location.href : ''}`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-4 bg-green-500 text-white text-center font-bold text-base rounded-2xl shadow-lg hover:bg-green-600 transition-colors"
        >
          📲 Envoyer mon reçu par WhatsApp
        </a>

        {/* Bouton copier lien */}
        <button
          onClick={handleCopy}
          className="w-full py-3 bg-white border border-[#C9A84C] text-[#C9A84C] font-semibold text-sm rounded-2xl hover:bg-[#FFF8E7] transition-colors"
        >
          {copied ? '✓ Lien copié !' : '📋 Copier le lien de ma carte'}
        </button>

        {/* Note bas */}
        <p className="text-xs text-gray-400 text-center pb-4 leading-relaxed">
          Ce lien est personnel — ne le partagez pas.
          Il devient votre carte VIP active dès validation.
        </p>

      </div>
    </div>
  )
}
