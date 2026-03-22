'use client'
// BLOCS 3, 4, 5, 9, 10 — Stats 2×2 + Budget + Budget catégories + Cagnotte + Invités

import { useState, useEffect } from 'react'
import { useClientIdentity } from '@/hooks/useClientIdentity'
import { usePanier } from '@/hooks/usePanier'

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
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
  // Nouveaux (depuis Firestore SSR)
  budgetTotal?: number
  budgetCategories?: BudgetCategories
  invitesConfirmesFirestore?: number
  nbInvitesPrevus?: number
}

const CAT_LABELS: Record<keyof BudgetCategories, string> = {
  traiteur:     'Traiteur',
  decoration:   'Décoration',
  hebergement:  'Hébergement',
  beaute:       'Beauté',
  photographie: 'Photographie',
  autres:       'Autres',
}

const CAT_COLORS: Record<keyof BudgetCategories, string> = {
  traiteur:     '#C9A84C',
  decoration:   '#7C9A7E',
  hebergement:  '#3B82F6',
  beaute:       '#EC4899',
  photographie: '#8B5CF6',
  autres:       '#888',
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

  // Stats participation (chargées côté client depuis invites-stats enrichi)
  const [participationStats, setParticipationStats] = useState<{
    ayant_commande: number; silencieux: number; total: number
  } | null>(null)

  useEffect(() => {
    fetch('/api/portail/invites-stats')
      .then(r => r.json())
      .then(d => {
        if (d.stats) setParticipationStats(d.stats)
      })
      .catch(() => {})
  }, [])

  // BLOC 4 — Budget : priorité SSR (prop) > useClientIdentity
  const budgetTotal = budgetTotalProp ?? identity.budget_previsionnel
  const budgetDepense = totaux.total_ht
  const pctBudget = budgetTotal > 0 ? Math.min(100, Math.round((budgetDepense / budgetTotal) * 100)) : 0
  const budgetColor = pctBudget < 80 ? '#7C9A7E' : pctBudget < 100 ? '#C9A84C' : '#C0392B'

  // Vérifier si les catégories ont des valeurs non-nulles
  const hasBudgetCategories = budgetCategories && Object.values(budgetCategories).some(v => v > 0)
  const budgetCategoriesTotal = budgetCategories
    ? Object.values(budgetCategories).reduce((a, b) => a + b, 0)
    : 0

  // BLOC 9 — Invités : priorité invites[] Firestore > useClientIdentity
  const confirmes = invitesConfirmesFirestore > 0 ? invitesConfirmesFirestore : identity.invites_confirmes
  const prevus = nbInvitesPrevus > 0 ? nbInvitesPrevus : identity.nombre_invites_prevu
  const MAX_DOTS = 60
  const total = Math.min(prevus, MAX_DOTS)
  const dotsConf = Math.min(confirmes, total)

  return (
    <div className="space-y-4">
      {/* BLOC 3 — Stats 2×2 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
          <p className="text-xl font-bold text-[#C9A84C]">{confirmes}<span className="text-xs text-[#888] font-normal">/{prevus}</span></p>
          <p className="text-xs text-[#888] mt-0.5">Invités confirmés</p>
          {prevus > confirmes && <p className="text-[10px] text-[#AAA]">{prevus - confirmes} en attente</p>}
          {prevus === 0 && <p className="text-[10px] text-[#AAA]">Défini par votre coordinateur</p>}
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
          <p className="text-xl font-bold text-[#1A1A1A]">{todosDone}<span className="text-xs text-[#888] font-normal">/{todosTotal}</span></p>
          <p className="text-xs text-[#888] mt-0.5">Tâches complétées</p>
          {todosDone > 0 && <p className="text-[10px] text-[#7C9A7E]">+{todosDone} cette session</p>}
          {todosTotal === 0 && <p className="text-[10px] text-[#AAA]">Aucune tâche définie</p>}
        </div>
      </div>

      {/* BLOC 4 — Budget global */}
      {budgetTotal > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
          <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-2">Suivi Budget Global</p>
          <div className="flex justify-between text-xs text-[#888] mb-1">
            <span>Engagé via panier</span><span style={{ color: budgetColor }}>{pctBudget}%</span>
          </div>
          <div className="h-2.5 bg-[#F5F0E8] rounded-full overflow-hidden mb-2">
            <div className="h-full rounded-full transition-all" style={{ width: `${pctBudget}%`, background: budgetColor }} />
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-[#888]">{formatFCFA(budgetDepense)} engagé</span>
            <span className="text-[#888]">{formatFCFA(budgetTotal)} prévu</span>
          </div>
          {pctBudget >= 100
            ? <p className="text-[11px] text-red-500 mt-1">⚠ Budget dépassé de {formatFCFA(budgetDepense - budgetTotal)}</p>
            : <p className="text-[11px] text-[#7C9A7E] mt-1">Reste {formatFCFA(budgetTotal - budgetDepense)}</p>
          }
        </div>
      )}

      {/* BLOC 10 — Budget par catégorie (uniquement si des valeurs existent) */}
      {hasBudgetCategories && budgetCategories && budgetCategoriesTotal > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
          <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-3">Budget par Catégorie</p>
          <div className="space-y-2">
            {(Object.keys(budgetCategories) as Array<keyof BudgetCategories>)
              .filter(k => budgetCategories[k] > 0)
              .sort((a, b) => budgetCategories[b] - budgetCategories[a])
              .map(k => {
                const val = budgetCategories[k]
                const pct = budgetCategoriesTotal > 0 ? Math.round((val / budgetCategoriesTotal) * 100) : 0
                const color = CAT_COLORS[k]
                return (
                  <div key={k}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-[#555]">{CAT_LABELS[k]}</span>
                      <span style={{ color }}>{formatFCFA(val)}</span>
                    </div>
                    <div className="h-1.5 bg-[#F5F0E8] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                )
              })}
          </div>
          <p className="text-[10px] text-[#AAA] mt-2 text-right">Alloué par catégorie · Total {formatFCFA(budgetCategoriesTotal)}</p>
        </div>
      )}

      {/* BLOC 5 — Cagnotte */}
      <div className="rounded-2xl p-4" style={{ background: '#1A1A1A' }}>
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">Ma Cagnotte</p>
        <p className="text-xl font-bold mb-3" style={{ color: '#C9A84C' }}>{formatFCFA(walletCash + walletCredits)}</p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="rounded-xl p-2.5" style={{ background: '#222' }}>
            <p className="text-[10px] text-white/40">Cash</p>
            <p className="text-sm font-bold text-white">{formatFCFA(walletCash)}</p>
          </div>
          <div className="rounded-xl p-2.5" style={{ background: '#222' }}>
            <p className="text-[10px] text-white/40">Crédits services</p>
            <p className="text-sm font-bold text-[#C9A84C]">{formatFCFA(walletCredits)}</p>
          </div>
        </div>
        {nbCommandesInvites > 0 && (
          <div className="rounded-xl p-2.5 mt-1" style={{ background: '#222' }}>
            <p className="text-[10px] text-white/40 mb-1">{nbCommandesInvites} commande{nbCommandesInvites > 1 ? 's' : ''} invité{nbCommandesInvites > 1 ? 's' : ''} enregistrée{nbCommandesInvites > 1 ? 's' : ''}</p>
            {derniereCommande && (
              <p className="text-[11px] text-white/60 truncate">
                Dernière : {derniereCommande.produit} · {formatFCFA(derniereCommande.montant)}
              </p>
            )}
          </div>
        )}
        {nbCommandesInvites === 0 && (
          <div className="rounded-xl p-2.5 mt-1" style={{ background: '#222' }}>
            <p className="text-[10px] text-white/40">Partagez votre code avec vos invités pour alimenter votre cagnotte ✨</p>
          </div>
        )}
      </div>

      {/* BLOC 9 — Mes Invités (dots + récap participation) */}
      {prevus > 0 ? (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
          <div className="flex justify-between items-center mb-3">
            <p className="text-xs font-semibold text-[#888] uppercase tracking-wide">Mes Invités</p>
            <a href="/portail/invites" className="text-xs text-[#C9A84C]">Gérer →</a>
          </div>
          <div className="flex flex-wrap gap-1 mb-3">
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} className="w-3 h-3 rounded-full" style={{ background: i < dotsConf ? '#C9A84C' : '#E8E0D0' }} />
            ))}
          </div>

          {/* Récap participation boutique */}
          {participationStats && participationStats.total > 0 && (
            <div className="border-t border-[#F5F0E8] pt-3 mb-3 space-y-1">
              {participationStats.ayant_commande > 0 ? (
                <p className="text-xs text-[#7C9A7E] font-medium">
                  🎉 {participationStats.ayant_commande} invité{participationStats.ayant_commande > 1 ? 's' : ''} ont déjà commandé
                </p>
              ) : (
                <p className="text-xs text-[#AAA]">Aucun invité n&apos;a encore commandé</p>
              )}
              {participationStats.silencieux > 0 && (
                <p className="text-xs text-[#888]">
                  {participationStats.silencieux} invité{participationStats.silencieux > 1 ? 's' : ''} n&apos;ont pas encore utilisé votre code
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <a href="/portail/invites" className="flex-1 py-2 rounded-xl text-xs font-semibold text-center text-white" style={{ background: '#1A1A1A' }}>Gérer →</a>
            {participationStats && participationStats.silencieux > 0 ? (
              <a href="/portail/invites" className="flex-1 py-2 rounded-xl text-xs font-semibold text-center border transition-colors" style={{ borderColor: '#C9A84C', color: '#C9A84C' }}>
                Relancer {participationStats.silencieux} silencieux →
              </a>
            ) : (
              <a href="/portail/invites#envoyer" className="flex-1 py-2 rounded-xl text-xs font-semibold text-center text-[#1A1A1A] border border-[#C9A84C]">Envoyer invitations →</a>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-semibold text-[#888] uppercase tracking-wide">Mes Invités</p>
            <a href="/portail/invites" className="text-xs text-[#C9A84C]">Gérer →</a>
          </div>
          <p className="text-sm text-[#AAA] text-center py-2">Commencez à gérer votre liste d&apos;invités 💌</p>
          <a href="/portail/invites" className="block w-full py-2 rounded-xl text-xs font-semibold text-center text-white mt-1" style={{ background: '#1A1A1A' }}>
            + Ajouter des invités
          </a>
        </div>
      )}
    </div>
  )
}
