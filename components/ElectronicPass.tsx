'use client'
// components/ElectronicPass.tsx — Pass électronique L&Lui Stars
// Affiche le solde stars, statut, niveau du pass, progression, et transactions pending.

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { ClientFidelite, TransactionFidelite } from '@/actions/stars'
import type { ParametresPlateforme } from '@/actions/parametres'
import {
  getMembershipStatus,
  getNiveauPass,
  getRemisePct,
  MEMBERSHIP_LABELS,
  PASS_LABELS,
  PASS_CARD_GRADIENTS,
  STATUS_ICONS,
  type NiveauPass,
} from '@/lib/loyaltyEngine'

function formatFr(n: number): string {
  return n.toLocaleString('fr-FR')
}

// ─── Compteur animé ────────────────────────────────────────────

function AnimatedCounter({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    if (value === 0) return
    const duration = 1400
    const start = performance.now()
    const from = 0

    function step(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // easeOut
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(from + (value - from) * eased))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [value])

  return <span>{formatFr(displayed)}</span>
}

// ─── Props ─────────────────────────────────────────────────────

interface Props {
  client: ClientFidelite
  params: ParametresPlateforme
  pendingTx?: TransactionFidelite | null
  onResendOtp?: () => void
  avantages?: string
}

// ─── Composant principal ───────────────────────────────────────

export default function ElectronicPass({ client, params, pendingTx, onResendOtp, avantages }: Props) {

  const thresholds = {
    seuil_novice: params.fidelite_seuil_novice ?? 0,
    seuil_explorateur: params.fidelite_seuil_explorateur ?? 25000,
    seuil_ambassadeur: params.fidelite_seuil_ambassadeur ?? 75000,
    seuil_excellence: params.fidelite_seuil_excellence ?? 150000,
  }

  const status = getMembershipStatus(client.total_stars_historique, thresholds)
  const niveau: NiveauPass | null = getNiveauPass(status)
  const remisePct = getRemisePct(status, {
    remise_argent_pct: params.fidelite_remise_argent_pct ?? 5,
    remise_or_pct: params.fidelite_remise_or_pct ?? 10,
    remise_platine_pct: params.fidelite_remise_platine_pct ?? 20,
  })
  const dureePass = params.fidelite_duree_pass_jours ?? 365
  const valeurStar = params.fidelite_valeur_star_fcfa ?? 1

  // Calcul expiration du pass (à partir de created_at)
  const createdAt = client.created_at ? new Date(client.created_at) : new Date()
  const expiresAt = new Date(createdAt.getTime() + dureePass * 86400000)
  const msTotal = expiresAt.getTime() - createdAt.getTime()
  const msRemaining = Math.max(0, expiresAt.getTime() - Date.now())
  const passPercent = Math.min(100, Math.round((msRemaining / msTotal) * 100))
  const joursRestants = Math.ceil(msRemaining / 86400000)
  const passExpire = msRemaining === 0

  // Prochain palier
  const seuils = [
    { label: 'Explorateur', seuil: thresholds.seuil_explorateur },
    { label: 'Ambassadeur', seuil: thresholds.seuil_ambassadeur },
    { label: 'Excellence', seuil: thresholds.seuil_excellence },
  ]
  const nextPalier = seuils.find((s) => s.seuil > client.total_stars_historique)
  const progressToNext = nextPalier
    ? Math.min(100, Math.round((client.total_stars_historique / nextPalier.seuil) * 100))
    : 100

  const gradient = niveau ? PASS_CARD_GRADIENTS[niveau] : 'from-[#1A1A1A] to-[#2D2D2D]'

  return (
    <div className="space-y-4">

      {/* ── Carte Pass ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className={`relative overflow-hidden rounded-2xl shadow-xl bg-gradient-to-br ${gradient}`}
        style={{ minHeight: 210 }}
      >
        {/* Reflet de luxe */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 25% 20%, rgba(255,255,255,0.18) 0%, transparent 55%)',
          }}
        />

        <div className="relative p-6 flex flex-col h-full">
          {/* En-tête */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-white/50 mb-0.5">
                L&amp;Lui Signature
              </p>
              <p className="text-white font-bold text-lg leading-tight font-serif">
                {niveau ? PASS_LABELS[niveau] : 'Programme Stars'}
              </p>
            </div>
            <div className="text-right space-y-1">
              <span className="inline-block text-[10px] px-2.5 py-1 rounded-full bg-white/20 text-white font-semibold backdrop-blur-sm">
                {STATUS_ICONS[status]} {MEMBERSHIP_LABELS[status]}
              </span>
              {!passExpire && (
                <p className="text-[9px] text-white/40 text-right">
                  Pass valable encore {joursRestants}j
                </p>
              )}
            </div>
          </div>

          {/* Solde stars */}
          <div className="mb-4">
            <p className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Solde Stars</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-5xl font-bold text-white font-mono tracking-tight leading-none">
                <AnimatedCounter value={client.points_stars} />
              </span>
              <span className="text-2xl">⭐</span>
            </div>
            <p className="text-[10px] text-white/40 mt-1">
              ≈ {formatFr(client.points_stars * valeurStar)} FCFA
            </p>
          </div>

          {/* Remise active */}
          {remisePct > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-1.5 mb-4 self-start"
            >
              <span className="text-xs">🎁</span>
              <p className="text-white font-semibold text-xs">
                -{remisePct}% sur vos achats boutique
              </p>
            </motion.div>
          )}

          {/* Barre validité pass */}
          {passExpire ? (
            <p className="text-xs text-red-300 font-semibold">⚠️ Pass expiré — Contactez L&Lui Signature</p>
          ) : (
            <div className="mt-auto">
              <div className="flex justify-between text-[9px] text-white/40 mb-1.5">
                <span>Validité du pass</span>
                <span>{passPercent}%</span>
              </div>
              <div className="h-1.5 bg-white/15 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${passPercent}%` }}
                  transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
                  className="h-full bg-white/60 rounded-full"
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Transaction en attente ──────────────────────────────── */}
      {pendingTx && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg animate-pulse">⏳</span>
            <p className="text-sm font-semibold text-amber-800">Transaction en attente</p>
          </div>
          <div className="space-y-1 text-xs text-amber-700">
            <div className="flex justify-between">
              <span>Montant réglé</span>
              <span className="font-bold">{formatFr(pendingTx.montant_net)} FCFA</span>
            </div>
            {pendingTx.remise_appliquee > 0 && (
              <div className="flex justify-between">
                <span>Remise appliquée</span>
                <span className="font-bold text-green-700">-{formatFr(pendingTx.remise_appliquee)} FCFA</span>
              </div>
            )}
            <div className="flex justify-between border-t border-amber-200 pt-1 mt-1">
              <span>Stars à recevoir</span>
              <span className="font-bold text-amber-900">+{pendingTx.stars_gagnees} ⭐</span>
            </div>
          </div>
          <p className="text-[10px] text-amber-500 mt-2">
            Confirmez via le lien WhatsApp reçu pour créditer vos stars.
          </p>
        </motion.div>
      )}

      {/* ── Progression vers prochain palier ───────────────────── */}
      {nextPalier && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <p className="text-[10px] font-semibold text-[#1A1A1A]/40 uppercase tracking-widest mb-2">
            Progression
          </p>
          <div className="flex justify-between text-xs text-[#1A1A1A]/60 mb-2">
            <span>{formatFr(client.total_stars_historique)} ⭐</span>
            <span className="font-semibold text-[#1A1A1A]/80">
              → {nextPalier.label} ({formatFr(nextPalier.seuil)} ⭐)
            </span>
          </div>
          <div className="h-2.5 bg-[#F5F0E8] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressToNext}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
              className="h-full bg-gradient-to-r from-[#C9A84C] to-[#F0C040] rounded-full"
            />
          </div>
          <p className="text-[10px] text-[#1A1A1A]/40 mt-1.5">
            Encore {formatFr(nextPalier.seuil - client.total_stars_historique)} stars pour atteindre le niveau {nextPalier.label}
          </p>
        </motion.div>
      )}

      {/* ── Petits plus de l'établissement ─────────────────────── */}
      {avantages && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <p className="text-[10px] font-semibold text-[#1A1A1A]/40 uppercase tracking-widest mb-2">
            Les petits plus de cet établissement
          </p>
          <p className="text-xs text-[#1A1A1A]/70 leading-relaxed whitespace-pre-line">
            {avantages}
          </p>
        </motion.div>
      )}

      {/* ── Renvoyer OTP ────────────────────────────────────────── */}
      {onResendOtp && (
        <button
          onClick={onResendOtp}
          className="w-full py-2.5 text-xs text-[#1A1A1A]/40 hover:text-[#C9A84C] transition-colors"
        >
          📱 Renvoyer le code de vérification
        </button>
      )}
    </div>
  )
}
