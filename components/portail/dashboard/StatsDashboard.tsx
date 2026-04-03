'use client'
// BLOCS 3, 4, 5, 9 — Redesign "Velvet & Vow" — Budget premium + Cagnotte + Stats + Invités

import { useState, useEffect } from 'react'
import { useClientIdentity } from '@/hooks/useClientIdentity'
import { usePanier } from '@/hooks/usePanier'

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}
function formatFCFAShort(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k'
  return String(Math.round(n))
}

interface BudgetCategories {
  traiteur: number; decoration: number; hebergement: number
  beaute: number; photographie: number; autres: number
}

interface Props {
  uid: string
  todosDone: number
  todosTotal: number
  walletCash: number
  walletCredits: number
  nbCommandesInvites?: number
  derniereCommande?: { date: string; produit: string; montant: number } | null
  budgetTotal?: number
  budgetCategories?: BudgetCategories
  invitesConfirmesFirestore?: number
  nbInvitesPrevus?: number
}

const CAT_LABELS: Record<keyof BudgetCategories, string> = {
  traiteur: 'Traiteur', decoration: 'Décoration', hebergement: 'Hébergement',
  beaute: 'Beauté', photographie: 'Photographie', autres: 'Autres',
}
const CAT_COLORS: Record<keyof BudgetCategories, string> = {
  traiteur: '#C9A84C', decoration: '#7C9A7E', hebergement: '#3B82F6',
  beaute: '#EC4899', photographie: '#8B5CF6', autres: '#888',
}
const CAT_EMOJI: Record<keyof BudgetCategories, string> = {
  traiteur: '🍽️', decoration: '🌸', hebergement: '🏡',
  beaute: '💄', photographie: '📸', autres: '✨',
}

export default function StatsDashboard({
  uid,
  todosDone,
  todosTotal,
  walletCash,
  walletCredits,
  nbCommandesInvites = 0,
  derniereCommande = null,
  budgetTotal: budgetTotalProp,
  budgetCategories,
  invitesConfirmesFirestore = 0,
  nbInvitesPrevus = 0,
}: Props) {
  const identity = useClientIdentity()
  const { totaux } = usePanier(uid)

  const [participationStats, setParticipationStats] = useState<{
    ayant_commande: number; silencieux: number; total: number
  } | null>(null)

  useEffect(() => {
    fetch('/api/portail/invites-stats')
      .then(r => r.json())
      .then(d => { if (d.stats) setParticipationStats(d.stats) })
      .catch(() => {})
  }, [])

  const budgetTotal = budgetTotalProp ?? identity.budget_previsionnel
  const budgetDepense = totaux.total_ht
  const pctBudget = budgetTotal > 0 ? Math.min(100, Math.round((budgetDepense / budgetTotal) * 100)) : 0
  const budgetRestant = budgetTotal > 0 ? Math.max(0, budgetTotal - budgetDepense) : 0
  const budgetColor = pctBudget < 70 ? '#7C9A7E' : pctBudget < 90 ? '#C9A84C' : '#C0392B'
  const budgetDepasse = budgetDepense > budgetTotal && budgetTotal > 0

  const hasBudgetCategories = budgetCategories && Object.values(budgetCategories).some(v => v > 0)
  const budgetCategoriesTotal = budgetCategories
    ? Object.values(budgetCategories).reduce((a, b) => a + b, 0) : 0

  const confirmes = invitesConfirmesFirestore > 0 ? invitesConfirmesFirestore : identity.invites_confirmes
  const prevus = nbInvitesPrevus > 0 ? nbInvitesPrevus : identity.nombre_invites_prevu
  const pctInvites = prevus > 0 ? Math.round((confirmes / prevus) * 100) : 0

  return (
    <div className="space-y-4">
      {/* ══ BLOC 3 — Stats rapides 2×2 ══════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-3">
        {/* Invités */}
        <div
          className="rounded-2xl p-4 shadow-sm"
          style={{ background: '#fff', border: '1px solid rgba(201,168,76,0.12)' }}
        >
          <p className="text-[10px] font-semibold text-[#888] uppercase tracking-wider mb-2">Invités</p>
          <div className="flex items-end gap-1 mb-1">
            <span className="text-2xl font-bold text-[#C9A84C]">{confirmes}</span>
            <span className="text-sm text-[#888] mb-0.5">/ {prevus > 0 ? prevus : '—'}</span>
          </div>
          {prevus > 0 && (
            <div className="h-1 bg-[#F5F0E8] rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pctInvites}%`, background: '#C9A84C' }} />
            </div>
          )}
          <p className="text-[9px] text-[#AAA] mt-1">
            {prevus > confirmes ? `${prevus - confirmes} en attente` : prevus === 0 ? 'À définir' : 'Tous confirmés ✅'}
          </p>
        </div>

        {/* Tâches */}
        <div
          className="rounded-2xl p-4 shadow-sm"
          style={{ background: '#fff', border: '1px solid rgba(201,168,76,0.12)' }}
        >
          <p className="text-[10px] font-semibold text-[#888] uppercase tracking-wider mb-2">Tâches</p>
          <div className="flex items-end gap-1 mb-1">
            <span className="text-2xl font-bold text-[#1A1A1A]">{todosDone}</span>
            <span className="text-sm text-[#888] mb-0.5">/ {todosTotal}</span>
          </div>
          {todosTotal > 0 && (
            <div className="h-1 bg-[#F5F0E8] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.round((todosDone / todosTotal) * 100)}%`,
                  background: '#7C9A7E',
                }}
              />
            </div>
          )}
          <p className="text-[9px] text-[#AAA] mt-1">
            {todosTotal === 0 ? 'Aucune tâche' : `${Math.round((todosDone / todosTotal) * 100)}% complétées`}
          </p>
        </div>
      </div>

      {/* ══ BLOC 4 — BUDGET GLOBAL REDESIGNÉ ══════════════════════════════ */}
      {budgetTotal > 0 ? (
        <div
          className="rounded-2xl overflow-hidden shadow-sm"
          style={{ border: '1px solid rgba(201,168,76,0.15)' }}
        >
          {/* En-tête sombre */}
          <div className="px-5 py-4" style={{ background: '#1A1A1A' }}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Budget Mariage</p>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: budgetColor + '22',
                  color: budgetColor,
                  border: `1px solid ${budgetColor}44`,
                }}
              >
                {pctBudget}% engagé
              </span>
            </div>
            <p className="text-2xl font-bold text-white">{formatFCFA(budgetTotal)}</p>
            <p className="text-xs text-white/40">Budget prévisionnel total</p>
          </div>

          {/* Corps */}
          <div className="px-5 py-4 bg-white">
            {/* Barre de progression épaisse */}
            <div className="h-3 bg-[#F5F0E8] rounded-full overflow-hidden mb-3">
              <div
                className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
                style={{ width: `${pctBudget}%`, background: budgetColor }}
              >
                {/* Effet shimmer */}
                <div
                  aria-hidden
                  style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)',
                    animation: 'shimmer 2s infinite',
                  }}
                />
              </div>
            </div>

            {/* Chiffres côte à côte */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs font-bold" style={{ color: budgetColor }}>
                  {formatFCFAShort(budgetDepense)}
                </p>
                <p className="text-[9px] text-[#888]">Engagé</p>
              </div>
              <div style={{ borderLeft: '1px solid #F5F0E8', borderRight: '1px solid #F5F0E8' }}>
                <p className="text-xs font-bold text-[#7C9A7E]">{formatFCFAShort(budgetRestant)}</p>
                <p className="text-[9px] text-[#888]">Disponible</p>
              </div>
              <div>
                <p className="text-xs font-bold text-[#1A1A1A]">{formatFCFAShort(budgetTotal)}</p>
                <p className="text-[9px] text-[#888]">Prévu</p>
              </div>
            </div>

            {budgetDepasse && (
              <p className="text-xs text-red-500 mt-2 text-center">
                ⚠ Dépassement de {formatFCFA(budgetDepense - budgetTotal)}
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Budget non défini — invite à le paramétrer */
        <div
          className="rounded-2xl p-4 text-center shadow-sm"
          style={{ background: '#fff', border: '1px solid rgba(201,168,76,0.12)' }}
        >
          <p className="text-2xl mb-1">💰</p>
          <p className="text-sm font-semibold text-[#1A1A1A] mb-0.5">Budget non défini</p>
          <p className="text-xs text-[#888] mb-3">Définissez votre budget prévisionnel pour suivre vos dépenses</p>
          <a href="/portail/parametres" className="inline-block px-4 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: '#C9A84C' }}>
            Définir mon budget →
          </a>
        </div>
      )}

      {/* ══ BLOC 10 — Budget par catégorie (magazine style) ═══════════════ */}
      {hasBudgetCategories && budgetCategories && budgetCategoriesTotal > 0 && (
        <div
          className="rounded-2xl p-5 shadow-sm"
          style={{ background: '#fff', border: '1px solid rgba(201,168,76,0.12)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-semibold text-[#888] uppercase tracking-wider">Répartition Budget</p>
            <p className="text-xs font-semibold text-[#C9A84C]">{formatFCFA(budgetCategoriesTotal)}</p>
          </div>

          <div className="space-y-3">
            {(Object.keys(budgetCategories) as Array<keyof BudgetCategories>)
              .filter(k => budgetCategories[k] > 0)
              .sort((a, b) => budgetCategories[b] - budgetCategories[a])
              .map(k => {
                const val = budgetCategories[k]
                const pct = budgetCategoriesTotal > 0 ? Math.round((val / budgetCategoriesTotal) * 100) : 0
                const color = CAT_COLORS[k]
                return (
                  <div key={k}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{CAT_EMOJI[k]}</span>
                        <span className="text-xs text-[#555] font-medium">{CAT_LABELS[k]}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#888]">{pct}%</span>
                        <span className="text-xs font-semibold" style={{ color }}>{formatFCFA(val)}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-[#F5F0E8] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* ══ BLOC 5 — CAGNOTTE L&LUI SIGNATURE ═══════════════════════════════ */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: '#1A1A1A', border: '1px solid rgba(201,168,76,0.2)' }}
      >
        {/* En-tête cagnotte */}
        <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1">
                Ma Cagnotte L&amp;Lui
              </p>
              <p className="text-3xl font-bold" style={{ color: '#C9A84C' }}>
                {formatFCFA(walletCash + walletCredits)}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
              style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}
            >
              💎
            </div>
          </div>
        </div>

        {/* Détail cash / crédits */}
        <div className="grid grid-cols-2 gap-px p-4 pt-3">
          <div
            className="rounded-xl p-3 mr-1"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <p className="text-[9px] text-white/30 uppercase tracking-wide mb-1">Cash</p>
            <p className="text-sm font-bold text-white">{formatFCFA(walletCash)}</p>
            <p className="text-[9px] text-white/25">Retirable</p>
          </div>
          <div
            className="rounded-xl p-3 ml-1"
            style={{ background: 'rgba(201,168,76,0.06)' }}
          >
            <p className="text-[9px] text-white/30 uppercase tracking-wide mb-1">Crédits</p>
            <p className="text-sm font-bold" style={{ color: '#C9A84C' }}>{formatFCFA(walletCredits)}</p>
            <p className="text-[9px] text-white/25">Services L&amp;Lui</p>
          </div>
        </div>

        {/* Activité invités */}
        <div className="px-4 pb-4">
          <div
            className="rounded-xl p-3"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            {nbCommandesInvites > 0 ? (
              <>
                <p className="text-[10px] text-white/40 mb-1">
                  🎉 {nbCommandesInvites} commande{nbCommandesInvites > 1 ? 's' : ''} d&apos;invités
                </p>
                {derniereCommande && (
                  <p className="text-xs text-white/50 truncate">
                    Dernière · {derniereCommande.produit} — {formatFCFA(derniereCommande.montant)}
                  </p>
                )}
              </>
            ) : (
              <p className="text-[10px] text-white/30 leading-relaxed">
                Partagez votre code privilège avec vos invités pour alimenter votre cagnotte ✨
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ══ BLOC 9 — MES INVITÉS ═════════════════════════════════════════════ */}
      {prevus > 0 ? (
        <div
          className="rounded-2xl p-4 shadow-sm"
          style={{ background: '#fff', border: '1px solid rgba(201,168,76,0.12)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold text-[#888] uppercase tracking-wider">Mes Invités</p>
            <a href="/portail/invites" className="text-xs font-medium" style={{ color: '#C9A84C' }}>Gérer →</a>
          </div>

          {/* Barre de progression invités */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-2xl font-bold text-[#C9A84C]">{confirmes}</span>
              <span className="text-xs text-[#888]">sur {prevus} invités</span>
            </div>
            <div className="h-2.5 bg-[#F5F0E8] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pctInvites}%`, background: 'linear-gradient(90deg, #C9A84C, #E8C87A)' }}
              />
            </div>
            <p className="text-[9px] text-[#AAA] mt-1">{pctInvites}% ont confirmé leur présence</p>
          </div>

          {/* Récap participation */}
          {participationStats && participationStats.total > 0 && (
            <div
              className="p-3 rounded-xl mb-3"
              style={{ background: '#F5F0E8' }}
            >
              {participationStats.ayant_commande > 0 ? (
                <p className="text-xs font-medium text-[#7C9A7E]">
                  🎉 {participationStats.ayant_commande} invité{participationStats.ayant_commande > 1 ? 's' : ''} ont déjà commandé
                </p>
              ) : (
                <p className="text-xs text-[#888]">Aucun invité n&apos;a encore commandé</p>
              )}
              {participationStats.silencieux > 0 && (
                <p className="text-[10px] text-[#888] mt-0.5">
                  {participationStats.silencieux} invité{participationStats.silencieux > 1 ? 's' : ''} n&apos;ont pas encore utilisé votre code
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <a
              href="/portail/invites"
              className="flex-1 py-2 rounded-xl text-xs font-semibold text-center text-white"
              style={{ background: '#1A1A1A' }}
            >
              Gérer ma liste →
            </a>
            {participationStats && participationStats.silencieux > 0 ? (
              <a
                href="/portail/invites"
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-center border"
                style={{ borderColor: '#C9A84C', color: '#C9A84C' }}
              >
                Relancer {participationStats.silencieux} →
              </a>
            ) : (
              <a
                href="/portail/invites#envoyer"
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-center border"
                style={{ borderColor: '#C9A84C', color: '#C9A84C' }}
              >
                Envoyer invitations →
              </a>
            )}
          </div>
        </div>
      ) : (
        <div
          className="rounded-2xl p-4 shadow-sm"
          style={{ background: '#fff', border: '1px solid rgba(201,168,76,0.12)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-[#888] uppercase tracking-wider">Mes Invités</p>
            <a href="/portail/invites" className="text-xs" style={{ color: '#C9A84C' }}>Gérer →</a>
          </div>
          <p className="text-sm text-[#AAA] text-center py-2">Commencez à gérer votre liste d&apos;invités 💌</p>
          <a
            href="/portail/invites"
            className="block w-full py-2 rounded-xl text-xs font-semibold text-center text-white mt-1"
            style={{ background: '#1A1A1A' }}
          >
            + Ajouter des invités
          </a>
        </div>
      )}
    </div>
  )
}
