'use client'

import { useState, useEffect, useRef } from 'react'
import type { LoyaltyCard, LoyaltyProgram } from '@/types/loyalty'
import LoyaltyCardDisplay from './LoyaltyCardDisplay'
import Link from 'next/link'

interface Props {
  card: LoyaltyCard
  program: LoyaltyProgram
  nomEtablissement?: string
}

interface LiveState {
  statut: string
  points_cumules: number
  niveau_actuel: string
}

const POLL_INTERVAL_MS = 5000

export default function LoyaltyCardPageClient({ card: initialCard, program, nomEtablissement = 'L&Lui' }: Props) {
  const [live, setLive] = useState<LiveState>({
    statut: initialCard.statut,
    points_cumules: initialCard.points_cumules,
    niveau_actuel: initialCard.niveau_actuel,
  })
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'info' } | null>(null)
  const prevPoints = useRef(initialCard.points_cumules)
  const prevStatut = useRef(initialCard.statut)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ text, type })
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }

  // Polling toutes les 5s
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/loyalty/card-status?card_id=${initialCard.card_id}`, {
          cache: 'no-store',
        })
        if (!res.ok) return
        const data: LiveState = await res.json()

        // Notification : PENDING → ACTIVE
        if (prevStatut.current === 'PENDING' && data.statut === 'ACTIVE') {
          showToast('🎉 Votre carte est maintenant active !', 'success')
        }

        // Notification : points ajoutés
        if (data.points_cumules > prevPoints.current) {
          const diff = data.points_cumules - prevPoints.current
          showToast(`⭐ +${diff} point${diff > 1 ? 's' : ''} crédités !`, 'success')
        }

        // Notification : level-up
        if (prevStatut.current !== 'PENDING' && data.niveau_actuel !== live.niveau_actuel) {
          const niveauObj = program.niveaux.find((n) => n.id === data.niveau_actuel)
          if (niveauObj) {
            showToast(`${niveauObj.emoji} Niveau ${niveauObj.nom} atteint !`, 'success')
          }
        }

        prevPoints.current = data.points_cumules
        prevStatut.current = data.statut
        setLive(data)
      } catch {
        // Silencieux — pas de notification en cas d'erreur réseau
      }
    }

    // Premier poll immédiat si carte est PENDING
    if (live.statut === 'PENDING') poll()

    const interval = setInterval(poll, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCard.card_id])

  // Carte reconstituée avec données live
  const card: LoyaltyCard = {
    ...initialCard,
    statut: live.statut as LoyaltyCard['statut'],
    points_cumules: live.points_cumules,
    niveau_actuel: live.niveau_actuel,
  }

  const isExpired = card.statut === 'EXPIRED' || card.statut === 'CANCELLED'
  const niveauCourant = program.niveaux.find((n) => n.id === live.niveau_actuel) ?? program.niveaux[0]

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-8">
      <div className="max-w-sm mx-auto space-y-6">

        {/* Toast notification */}
        {toast && (
          <div
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-semibold shadow-2xl transition-all duration-300 ${
              toast.type === 'success'
                ? 'bg-green-500 text-white'
                : 'bg-[#C9A84C] text-black'
            }`}
          >
            {toast.text}
          </div>
        )}

        {/* Header */}
        <div className="text-center">
          <p className="text-xs font-medium text-[#C9A84C] uppercase tracking-widest mb-1">
            L&Lui Signature ✨
          </p>
          <h1 className="text-2xl font-serif text-[#F5F0E8]">Votre carte de fidélité</h1>
          <p className="text-[#F5F0E8]/50 text-sm mt-1">{program.nom}</p>
        </div>

        {/* Badge expiré/annulé */}
        {isExpired && (
          <div className="bg-red-900/30 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm text-center">
            Cette carte est {card.statut === 'CANCELLED' ? 'annulée' : 'expirée'}.
          </div>
        )}

        {/* Indicateur de mise à jour si PENDING */}
        {live.statut === 'PENDING' && (
          <div className="flex items-center gap-2 bg-blue-900/20 border border-blue-500/30 rounded-xl px-4 py-3 text-sm text-blue-300">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
            <span>En attente de validation · Cette page se met à jour automatiquement</span>
          </div>
        )}

        {/* Carte (données live) */}
        <LoyaltyCardDisplay card={card} program={program} />

        {/* Résumé points si carte active */}
        {live.statut === 'ACTIVE' && (
          <div className="bg-[#1A1A1A] border border-[#C9A84C]/20 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[#F5F0E8]/50 text-xs mb-0.5">Points cumulés</p>
                <p className="text-[#C9A84C] text-2xl font-bold">
                  {live.points_cumules.toLocaleString('fr-FR')}
                  <span className="text-sm font-normal ml-1">pts</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[#F5F0E8]/50 text-xs mb-0.5">Niveau</p>
                <p className="text-[#F5F0E8] font-semibold">
                  {niveauCourant?.emoji} {niveauCourant?.nom}
                </p>
              </div>
            </div>

            {/* Progression vers niveau suivant */}
            {(() => {
              const idx = program.niveaux.findIndex((n) => n.id === live.niveau_actuel)
              const next = program.niveaux[idx + 1]
              if (!next || !niveauCourant) return null
              const pct = Math.min(100, Math.round(
                ((live.points_cumules - niveauCourant.seuil_points) /
                  (next.seuil_points - niveauCourant.seuil_points)) * 100
              ))
              const restant = next.seuil_points - live.points_cumules
              return (
                <div>
                  <div className="w-full bg-white/10 rounded-full h-2 mb-1.5">
                    <div
                      className="bg-[#C9A84C] h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[#F5F0E8]/40 text-xs text-right">
                    {restant.toLocaleString('fr-FR')} pts avant {next.emoji} {next.nom}
                  </p>
                </div>
              )
            })()}
          </div>
        )}

        {/* Instructions d'utilisation */}
        <div className="bg-[#1A1A1A] border border-[#C9A84C]/20 rounded-xl p-4 space-y-2">
          <h3 className="text-[#F5F0E8]/60 text-xs uppercase tracking-wider font-medium mb-3">
            Comment utiliser ma carte ?
          </h3>
          <p className="text-[#F5F0E8]/60 text-sm">
            • Présentez cette page à chaque visite chez{' '}
            <strong className="text-[#F5F0E8]">{nomEtablissement}</strong>
          </p>
          <p className="text-[#F5F0E8]/60 text-sm">
            • Le partenaire scanne votre QR Code et crédite vos points
          </p>
          <p className="text-[#F5F0E8]/60 text-sm">
            • Vos points s&apos;affichent ici en temps réel — pas besoin d&apos;email
          </p>
          <p className="text-[#F5F0E8]/60 text-sm">
            • Progressez vers les niveaux supérieurs pour plus d&apos;avantages
          </p>
        </div>

        {/* Lien permanent */}
        <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-4">
          <p className="text-[#F5F0E8]/40 text-xs mb-2">🔐 Votre lien personnel</p>
          <p className="text-[#F5F0E8]/30 text-[11px] leading-relaxed">
            Sauvegardez l&apos;URL de cette page dans vos favoris — c&apos;est votre seul accès à la carte.
          </p>
        </div>

        {/* Footer */}
        <div className="text-center text-[#F5F0E8]/30 text-xs space-y-1 pb-4">
          <Link href="/hebergements" className="text-[#C9A84C]/60 hover:text-[#C9A84C] underline">
            Découvrir nos hébergements
          </Link>
        </div>
      </div>
    </div>
  )
}
