'use client'
// components/portail/DashboardClient.tsx
// Dashboard principal portail mariés — 8 blocs

import { useState } from 'react'
import CountdownRing from './CountdownRing'
import FastStartWidget from './FastStartWidget'
import { getCitationDuJour } from '@/lib/citations'
import type { FastStartWidgetProps } from './FastStartWidget'

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n)) + ' FCFA'
}

interface TodoItem { id: string; libelle: string; done: boolean }

interface DashboardProps {
  uid: string
  hasProjet: boolean
  displayName: string
  dateEvenement: string | null
  nomEvenement: string
  lieuEvenement: string
  budgetPrevisionnel: number
  budgetDepense: number
  nombreInvitesPrev: number
  invitesConfirmes: number
  walletCash: number
  walletCredits: number
  revLifetime: number
  todos: TodoItem[]
  panierCount: number
  fastStart: FastStartWidgetProps
}

function BudgetGauge({ depense, previsionnel }: { depense: number; previsionnel: number }) {
  const pct = previsionnel > 0 ? Math.min(100, Math.round((depense / previsionnel) * 100)) : 0
  const color = pct < 60 ? '#7C9A7E' : pct < 85 ? '#C9A84C' : '#C0392B'
  return (
    <div>
      <div className="flex justify-between text-xs text-[#888] mb-1">
        <span>Budget dépensé</span>
        <span>{pct}%</span>
      </div>
      <div className="h-3 bg-[#F5F0E8] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="flex justify-between text-[11px] mt-1">
        <span className="text-[#888]">{formatFCFA(depense)}</span>
        <span className="text-[#888]">{formatFCFA(previsionnel)}</span>
      </div>
    </div>
  )
}

function InvitesCircles({ confirmes, prevu }: { confirmes: number; prevu: number }) {
  const MAX = 20
  const total = Math.min(prevu, MAX)
  const conf = Math.min(confirmes, total)
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="w-5 h-5 rounded-full"
          style={{ background: i < conf ? '#C9A84C' : '#E8E0D0' }}
        />
      ))}
      {prevu > MAX && <span className="text-[10px] text-[#888] self-end">+{prevu - MAX}</span>}
    </div>
  )
}

function OnboardingForm({ uid }: { uid: string }) {
  const [form, setForm] = useState({ noms_maries: '', date_evenement: '', lieu: '', budget_previsionnel: '', nombre_invites_prevu: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.noms_maries || !form.date_evenement || !form.lieu) { setError('Veuillez remplir les champs obligatoires'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/portail/setup-projet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          noms_maries: form.noms_maries,
          date_evenement: form.date_evenement,
          lieu: form.lieu,
          budget_previsionnel: parseInt(form.budget_previsionnel || '0', 10),
          nombre_invites_prevu: parseInt(form.nombre_invites_prevu || '0', 10),
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erreur serveur')
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <h1 className="font-serif italic text-3xl text-[#1A1A1A] mb-1 text-center">Configurons votre mariage 💛</h1>
        <p className="text-sm text-[#888] text-center mb-8">Quelques informations pour personnaliser votre espace</p>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm border border-[#F5F0E8] space-y-4">
          <div>
            <label className="text-xs font-medium text-[#444] block mb-1">Vos prénoms *</label>
            <input id="noms_maries" value={form.noms_maries} onChange={e => set('noms_maries', e.target.value)}
              placeholder="Gaëlle & Junior" required
              className="w-full border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]" />
          </div>
          <div>
            <label className="text-xs font-medium text-[#444] block mb-1">Date du mariage *</label>
            <input id="date_evenement" type="date" value={form.date_evenement} onChange={e => set('date_evenement', e.target.value)} required
              className="w-full border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]" />
          </div>
          <div>
            <label className="text-xs font-medium text-[#444] block mb-1">Lieu de la cérémonie *</label>
            <input id="lieu" value={form.lieu} onChange={e => set('lieu', e.target.value)}
              placeholder="Kribi, Cameroun" required
              className="w-full border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]" />
          </div>
          <div>
            <label className="text-xs font-medium text-[#444] block mb-1">Budget prévisionnel (FCFA)</label>
            <input id="budget_previsionnel" type="number" value={form.budget_previsionnel} onChange={e => set('budget_previsionnel', e.target.value)}
              placeholder="5000000"
              className="w-full border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]" />
          </div>
          <div>
            <label className="text-xs font-medium text-[#444] block mb-1">Nombre d&apos;invités prévus</label>
            <input id="nombre_invites_prevu" type="number" value={form.nombre_invites_prevu} onChange={e => set('nombre_invites_prevu', e.target.value)}
              placeholder="200"
              className="w-full border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ background: '#C9A84C' }}>
            {loading ? 'Création…' : 'Créer mon espace →'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function DashboardClient(props: DashboardProps) {
  const {
    uid, hasProjet,
    displayName, dateEvenement, nomEvenement, lieuEvenement,
    budgetPrevisionnel, budgetDepense, nombreInvitesPrev, invitesConfirmes,
    walletCash, walletCredits, revLifetime, todos, panierCount, fastStart,
  } = props
  const citation = getCitationDuJour()
  const tachesRestantes = todos.filter(t => !t.done).length

  if (!hasProjet) return <OnboardingForm uid={uid} />

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Bloc 1 — Hero countdown */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F5F0E8] flex items-center gap-6">
        <CountdownRing dateEvenement={dateEvenement} nomEvenement={nomEvenement} />
        <div>
          <h1 className="font-serif italic text-2xl text-[#1A1A1A] leading-tight">
            {displayName.split(' ')[0]}
          </h1>
          <p className="text-sm text-[#888] mt-1">{nomEvenement || 'Mon mariage'}</p>
          {lieuEvenement && <p className="text-[11px] text-[#C9A84C] mt-0.5">{lieuEvenement}</p>}
        </div>
      </div>

      {/* Bloc 2 — 4 stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Invités confirmés', value: invitesConfirmes, sub: `/ ${nombreInvitesPrev} prévus` },
          { label: 'Tâches restantes', value: tachesRestantes, sub: `sur ${todos.length} total` },
          { label: 'Articles panier', value: panierCount, sub: 'à valider' },
          { label: 'REV cumulés', value: revLifetime, sub: 'points fidélité' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-sm border border-[#F5F0E8]">
            <p className="text-2xl font-bold text-[#1A1A1A]">{value}</p>
            <p className="text-[11px] font-medium text-[#444] mt-0.5">{label}</p>
            <p className="text-[10px] text-[#888]">{sub}</p>
          </div>
        ))}
      </div>

      {/* Bloc 3 — Budget gauge */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F5F0E8]">
        <p className="text-sm font-semibold text-[#1A1A1A] mb-3">Budget prévisionnel</p>
        <BudgetGauge depense={budgetDepense} previsionnel={budgetPrevisionnel} />
      </div>

      {/* Bloc 4 — Cagnotte */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F5F0E8]">
        <p className="text-sm font-semibold text-[#1A1A1A] mb-3">Ma Cagnotte</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#C9A84C]/10 rounded-xl p-3">
            <p className="text-[10px] text-[#888] mb-1">Cash retirable (70%)</p>
            <p className="font-bold text-[#C9A84C] text-sm">{formatFCFA(walletCash)}</p>
          </div>
          <div className="bg-[#0F52BA]/10 rounded-xl p-3">
            <p className="text-[10px] text-[#888] mb-1">Crédits services (30%)</p>
            <p className="font-bold text-[#0F52BA] text-sm">{formatFCFA(walletCredits)}</p>
          </div>
        </div>
      </div>

      {/* Bloc 4b — Fast Start Widget */}
      <FastStartWidget {...fastStart} />

      {/* Bloc 5 — Invités visuels */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F5F0E8]">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-semibold text-[#1A1A1A]">Mes invités</p>
          <span className="text-[11px] text-[#C9A84C]">
            {invitesConfirmes}/{nombreInvitesPrev} confirmés
          </span>
        </div>
        <InvitesCircles confirmes={invitesConfirmes} prevu={nombreInvitesPrev} />
      </div>

      {/* Bloc 6 — Météo mock */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F5F0E8] flex items-center gap-4">
        <div className="text-4xl">☀️</div>
        <div>
          <p className="text-sm font-semibold text-[#1A1A1A]">Météo prévue</p>
          <p className="text-[11px] text-[#888]">{lieuEvenement || 'Lieu non défini'}</p>
          <p className="text-[11px] text-[#C9A84C] mt-0.5">Données disponibles J-7 avant l&apos;événement</p>
        </div>
      </div>

      {/* Bloc 7 — Todo aperçu */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F5F0E8]">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-semibold text-[#1A1A1A]">Mes tâches</p>
          <a href="/portail/todo" className="text-[11px] text-[#C9A84C]">Voir tout →</a>
        </div>
        <div className="space-y-2">
          {todos.slice(0, 4).map(t => (
            <div key={t.id} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded border flex-shrink-0 ${t.done ? 'bg-[#7C9A7E] border-[#7C9A7E]' : 'border-[#DDD]'}`} />
              <span className={`text-[12px] ${t.done ? 'line-through text-[#AAA]' : 'text-[#444]'}`}>
                {t.libelle}
              </span>
            </div>
          ))}
          {todos.length === 0 && <p className="text-[12px] text-[#AAA]">Aucune tâche — commencez à planifier !</p>}
        </div>
      </div>

      {/* Bloc 8 — Citation */}
      <div className="bg-[#1A1A1A] rounded-2xl p-5 shadow-sm">
        <p className="text-[11px] text-[#C9A84C] mb-2">Citation du jour</p>
        <p className="font-serif italic text-white text-sm leading-relaxed">&ldquo;{citation}&rdquo;</p>
      </div>
    </div>
  )
}
