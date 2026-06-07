'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { LoyaltyCard, LoyaltyProgram } from '@/types/loyalty'
import { generateQRData } from '@/lib/generate-qr-data'

interface Props {
  card: LoyaltyCard
  program: LoyaltyProgram
}

export default function LoyaltyCardDisplay({ card, program }: Props) {
  const [showQR, setShowQR] = useState(false)

  const currentNiveau =
    program.niveaux.find((n) => n.id === card.niveau_actuel) ?? program.niveaux[0]
  const nextNiveauIdx = program.niveaux.indexOf(currentNiveau) + 1
  const nextNiveau =
    nextNiveauIdx < program.niveaux.length ? program.niveaux[nextNiveauIdx] : null

  const progressPct = nextNiveau
    ? Math.min(
        100,
        Math.round(
          ((card.points_cumules - currentNiveau.seuil_points) /
            (nextNiveau.seuil_points - currentNiveau.seuil_points)) *
            100
        )
      )
    : 100

  const expiresAt =
    card.expires_at instanceof Date
      ? card.expires_at
      : new Date(
          (card.expires_at as any)?.seconds
            ? (card.expires_at as any).seconds * 1000
            : card.expires_at
        )

  const qrData = generateQRData(card, program)

  // ── État PENDING ─────────────────────────────────────────────────────────────
  if (card.statut === 'PENDING') {
    return (
      <div className="bg-gradient-to-br from-[#C9A84C] to-[#8B6914] rounded-2xl p-6 text-black shadow-xl max-w-sm mx-auto">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-xs font-medium opacity-60 uppercase tracking-widest mb-1">
              Carte de fidélité
            </p>
            <h3 className="text-xl font-serif font-bold">{program.nom}</h3>
          </div>
          <span className="text-3xl opacity-40">{currentNiveau.emoji}</span>
        </div>

        <div className="bg-black/15 rounded-xl px-4 py-2 mb-5 font-mono text-sm tracking-widest opacity-50">
          {card.card_id.slice(0, 4).toUpperCase()}{' '}
          {card.card_id.slice(4, 8).toUpperCase()}{' '}
          {card.card_id.slice(8, 12).toUpperCase()}
        </div>

        {/* Badge EN ATTENTE */}
        <div className="bg-blue-500/20 border border-blue-300/40 rounded-xl p-4 mb-4 text-center">
          <p className="text-base font-bold">⏳ EN ATTENTE DE VALIDATION</p>
          <p className="text-sm opacity-80 mt-1">Votre paiement est en cours de vérification</p>
          <p className="text-xs opacity-60 mt-1">L&apos;admin activera votre carte sous 24h</p>
        </div>

        {/* QR grisé */}
        <div
          className="bg-white rounded-xl p-4 mb-4 flex flex-col items-center"
          style={{ filter: 'grayscale(1)', opacity: 0.35 }}
        >
          <div className="w-[120px] h-[120px] bg-gray-200 rounded flex items-center justify-center">
            <span className="text-5xl">🔒</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">QR Code disponible après validation</p>
        </div>

        {/* Titulaire */}
        <div className="flex items-end justify-between border-t border-black/15 pt-4 mb-4">
          <div>
            <p className="text-xs opacity-50 mb-0.5">Titulaire</p>
            <p className="text-sm font-semibold">
              {card.client_prenom ? `${card.client_prenom} ` : ''}{card.client_nom}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-50 mb-0.5">Programme</p>
            <p className="text-sm font-semibold">{program.nom}</p>
          </div>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="w-full bg-black/20 hover:bg-black/30 rounded-xl py-2.5 text-sm font-semibold transition"
        >
          🔄 Vérifier l&apos;état de ma carte
        </button>
      </div>
    )
  }

  // ── État REJECTED ────────────────────────────────────────────────────────────
  if (card.statut === 'REJECTED') {
    return (
      <div className="bg-gradient-to-br from-gray-500 to-gray-700 rounded-2xl p-6 text-white shadow-xl max-w-sm mx-auto">
        <div className="text-center py-4">
          <div className="text-4xl mb-3">❌</div>
          <h3 className="text-lg font-bold mb-2">Demande rejetée</h3>
          <p className="text-sm opacity-70">Cette demande de carte a été rejetée. Contactez-nous pour plus d&apos;informations.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-[#C9A84C] to-[#8B6914] rounded-2xl p-6 text-black shadow-xl max-w-sm mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-xs font-medium opacity-60 uppercase tracking-widest mb-1">
            Carte de fidélité
          </p>
          <h3 className="text-xl font-serif font-bold">{program.nom}</h3>
        </div>
        <span className="text-3xl">{currentNiveau.emoji}</span>
      </div>

      {/* Numéro carte */}
      <div className="bg-black/15 rounded-xl px-4 py-2 mb-5 font-mono text-sm tracking-widest opacity-80">
        {card.card_id.slice(0, 4).toUpperCase()}{' '}
        {card.card_id.slice(4, 8).toUpperCase()}{' '}
        {card.card_id.slice(8, 12).toUpperCase()}
      </div>

      {/* Niveau */}
      <div className="text-center mb-5">
        <p className="text-xs opacity-60 mb-1">Niveau actuel</p>
        <p className="text-lg font-bold">{currentNiveau.nom}</p>
      </div>

      {/* Points */}
      <div className="bg-black/15 rounded-xl p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium opacity-70">Points cumulés</span>
          <span className="text-3xl font-bold">{card.points_cumules.toLocaleString('fr-FR')}</span>
        </div>
        {nextNiveau && (
          <div>
            <div className="w-full bg-black/25 rounded-full h-2 mb-1.5">
              <div
                className="bg-white h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs opacity-70 text-right">
              {(nextNiveau.seuil_points - card.points_cumules).toLocaleString('fr-FR')} pts avant{' '}
              <strong>{nextNiveau.nom}</strong>
            </p>
          </div>
        )}
        {!nextNiveau && (
          <p className="text-xs opacity-70 text-center">Niveau maximum atteint !</p>
        )}
      </div>

      {/* Avantages */}
      {currentNiveau.avantages.length > 0 && (
        <div className="mb-4">
          <p className="text-xs opacity-60 mb-2 font-medium uppercase tracking-wide">Vos avantages</p>
          <ul className="space-y-1">
            {currentNiveau.avantages.map((av, i) => (
              <li key={i} className="text-xs flex items-center gap-1.5">
                <span className="opacity-60">✓</span> {av}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* QR Code toggle */}
      <button
        onClick={() => setShowQR((v) => !v)}
        className="w-full bg-black/20 hover:bg-black/30 rounded-xl py-2.5 text-sm font-semibold transition mb-3"
      >
        {showQR ? '🔒 Masquer le QR Code' : '📱 Afficher le QR Code'}
      </button>

      {showQR && (
        <div className="bg-white rounded-xl p-4 mb-3 flex flex-col items-center">
          <QRCodeSVG
            value={qrData}
            size={180}
            level="H"
            includeMargin={false}
          />
          <p className="text-xs text-gray-500 mt-2 text-center">
            Présentez ce code au partenaire
          </p>
        </div>
      )}

      {/* Nom client + expiration */}
      <div className="flex items-end justify-between border-t border-black/15 pt-4 mt-2">
        <div>
          <p className="text-xs opacity-50 mb-0.5">Titulaire</p>
          <p className="text-sm font-semibold">{card.client_nom}</p>
        </div>
        <div className="text-right">
          <p className="text-xs opacity-50 mb-0.5">Expire le</p>
          <p className="text-sm font-semibold">
            {expiresAt.toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>
    </div>
  )
}
