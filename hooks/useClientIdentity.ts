'use client'
// hooks/useClientIdentity.ts — Identité client centralisée pour toutes les pages portail
//
// IMPORTANT : le cookie portail_uid est httpOnly → document.cookie ne peut pas le lire.
// On appelle /api/portail/me qui lit le cookie côté serveur et retourne les données.

import { useState, useEffect } from 'react'

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
    // /api/portail/me lit le cookie httpOnly côté serveur — pas besoin d'uid côté client
    fetch('/api/portail/me')
      .then(r => {
        if (!r.ok) throw new Error('Non authentifié')
        return r.json()
      })
      .then(d => {
        const noms_maries = d.noms_maries || d.displayName || 'Mon mariage'
        const prenom_principal = noms_maries.split(/[&/]/)[0].trim()
        const budget_previsionnel = d.budget_previsionnel ?? 0
        const wallet_credits = d.wallet_credits ?? 0
        const pourcentage_budget = budget_previsionnel > 0
          ? Math.min(100, Math.round((wallet_credits / budget_previsionnel) * 100))
          : 0
        const budget_restant = Math.max(0, budget_previsionnel - wallet_credits)
        let jours_avant_mariage: number | null = null
        const dateRef = d.date_evenement ?? d.date_mariage
        if (dateRef) {
          const diff = new Date(dateRef).getTime() - Date.now()
          jours_avant_mariage = Math.ceil(diff / 86400000) // négatif si passé, 0 = aujourd'hui
        }
        setIdentity({
          uid: d.uid ?? '',
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
      .catch(() => {
        // Non authentifié ou erreur réseau — garder les valeurs par défaut
      })
  }, [])

  return identity
}
