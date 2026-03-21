'use client'
// hooks/useClientIdentity.ts — Identité client centralisée pour toutes les pages portail

import { useState, useEffect } from 'react'

function getUidFromCookie(): string {
  if (typeof document === 'undefined') return ''
  return decodeURIComponent(document.cookie.match(/portail_uid=([^;]+)/)?.[1] ?? '')
}

export interface ClientIdentity {
  uid: string
  noms_maries: string
  prenom_principal: string
  grade_actuel: string
  rev_lifetime: number
  wallet_cash: number
  wallet_credits: number
  jours_avant_mariage: number | null
  budget_previsionnel: number
  budget_restant: number
  pourcentage_budget: number
  invites_confirmes: number
  nombre_invites_prevu: number
  lieu: string
  code_promo: string
}

const DEFAULT: ClientIdentity = {
  uid: '',
  noms_maries: 'Mon mariage',
  prenom_principal: '',
  grade_actuel: 'START',
  rev_lifetime: 0,
  wallet_cash: 0,
  wallet_credits: 0,
  jours_avant_mariage: null,
  budget_previsionnel: 0,
  budget_restant: 0,
  pourcentage_budget: 0,
  invites_confirmes: 0,
  nombre_invites_prevu: 0,
  lieu: 'Kribi',
  code_promo: '',
}

export function useClientIdentity(): ClientIdentity {
  const [identity, setIdentity] = useState<ClientIdentity>(DEFAULT)

  useEffect(() => {
    const uid = getUidFromCookie()
    if (!uid) return
    fetch(`/api/portail/user?uid=${uid}`)
      .then(r => r.json())
      .then(d => {
        const noms_maries = d.noms_maries || d.displayName || 'Mon mariage'
        const prenom_principal = noms_maries.split(/[&\/&]/)[0].trim()
        const budget_previsionnel = d.budget_previsionnel ?? 0
        const wallet_credits = d.wallet_credits ?? 0
        const pourcentage_budget = budget_previsionnel > 0
          ? Math.min(100, Math.round((wallet_credits / budget_previsionnel) * 100))
          : 0
        const budget_restant = Math.max(0, budget_previsionnel - wallet_credits)
        let jours_avant_mariage: number | null = null
        if (d.date_evenement) {
          const diff = new Date(d.date_evenement).getTime() - Date.now()
          if (diff > 0) jours_avant_mariage = Math.ceil(diff / 86400000)
        }
        setIdentity({
          uid,
          noms_maries,
          prenom_principal,
          grade_actuel: d.grade ?? 'START',
          rev_lifetime: d.rev_lifetime ?? 0,
          wallet_cash: d.wallet_cash ?? 0,
          wallet_credits,
          jours_avant_mariage,
          budget_previsionnel,
          budget_restant,
          pourcentage_budget,
          invites_confirmes: d.invites_confirmes ?? 0,
          nombre_invites_prevu: d.nombre_invites_prevu ?? 0,
          lieu: d.lieu || 'Kribi',
          code_promo: d.code_promo ?? '',
        })
      })
      .catch(() => {})
  }, [])

  return identity
}
