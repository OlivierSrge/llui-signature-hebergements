'use client'
// components/admin/portail/EcosystemeClient.tsx

import { useState } from 'react'
import Link from 'next/link'
import GestionMaries from './GestionMaries'

interface RapportResult {
  caSemaine?: number
  message?: string
  error?: string
}

interface SyncResult {
  synced?: number
  produits_synced?: number
  commandes_synced?: number
  categories?: string[]
  errors?: string[]
  error?: string
}

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

export default function EcosystemeClient() {
  const [rapportLoading, setRapportLoading] = useState(false)
  const [rapportResult, setRapportResult] = useState<RapportResult | null>(null)
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)

  async function lancerRapport() {
    setRapportLoading(true)
    setRapportResult(null)
    try {
      const res = await fetch('/api/cron/rapport-hebdo')
      const data = await res.json()
      setRapportResult(data)
    } catch {
      setRapportResult({ error: 'Erreur réseau' })
    } finally {
      setRapportLoading(false)
    }
  }

  async function syncBoutique() {
    setSyncLoading(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/cron/sync-boutique')
      const data = await res.json()
      setSyncResult(data)
    } catch {
      setSyncResult({ error: 'Erreur réseau' })
    } finally {
      setSyncLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-1">🌐 Écosystème L&amp;Lui Signature</h1>
        <p className="text-[#1A1A1A]/60 text-sm mb-8">Vue d&apos;ensemble de toutes les plateformes connectées</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

          {/* Portail Client */}
          <Link href="/portail" className="block bg-white rounded-2xl p-6 border-2 border-[#C9A84C] shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center text-xl">🏠</div>
              <div>
                <h2 className="font-bold text-[#1A1A1A] text-lg group-hover:text-[#C9A84C] transition-colors">Portail Client</h2>
                <p className="text-xs text-[#1A1A1A]/50">Espace partenaires &amp; mariés</p>
              </div>
            </div>
            <p className="text-sm text-[#1A1A1A]/70 mb-4">Tableau de bord des partenaires, wallet, commissions, Fast Start et suivi invités.</p>
            <span className="inline-flex items-center gap-1 text-[#C9A84C] text-sm font-medium">Ouvrir le portail →</span>
          </Link>

          {/* Boutique Signature */}
          <div className="bg-white rounded-2xl p-6 border-2 border-teal-500 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-xl">🛍️</div>
              <div>
                <h2 className="font-bold text-[#1A1A1A] text-lg">Boutique Signature</h2>
                <p className="text-xs text-[#1A1A1A]/50">letlui-signature.netlify.app</p>
              </div>
            </div>
            <p className="text-sm text-[#1A1A1A]/70 mb-3">Boutique en ligne avec suivi de conversions. Les achats invités déclenchent les commissions partenaires.</p>
            <div className="flex gap-2 mb-3">
              <a href="https://letlui-signature.netlify.app" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-teal-600 text-sm font-medium hover:underline">
                Ouvrir la boutique ↗
              </a>
            </div>
            <button
              onClick={syncBoutique}
              disabled={syncLoading}
              className="w-full py-2 rounded-xl bg-teal-500 text-white text-sm font-semibold hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {syncLoading ? 'Synchronisation…' : '🔄 Synchroniser maintenant'}
            </button>
            {syncResult && (
              <div className={`mt-2 p-3 rounded-xl text-sm ${syncResult.error || (syncResult.errors?.length ?? 0) > 0 ? 'bg-red-50 text-red-700' : 'bg-teal-50 text-teal-800'}`}>
                {syncResult.error ? (
                  <span>❌ {syncResult.error}</span>
                ) : (
                  <>
                    <p className="font-semibold">✅ Sync réussie</p>
                    <p className="text-xs mt-0.5">🛍 {syncResult.produits_synced ?? syncResult.synced ?? 0} produits</p>
                    <p className="text-xs mt-0.5">📋 {syncResult.commandes_synced ?? 0} nouvelles commandes</p>
                    {(syncResult.errors?.length ?? 0) > 0 && (
                      <p className="text-xs mt-1 text-red-600">⚠ {syncResult.errors![0]}</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Dashboard Hébergements */}
          <Link href="/admin/dashboard" className="block bg-white rounded-2xl p-6 border-2 border-blue-500 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl">📊</div>
              <div>
                <h2 className="font-bold text-[#1A1A1A] text-lg group-hover:text-blue-600 transition-colors">Dashboard Hébergements</h2>
                <p className="text-xs text-[#1A1A1A]/50">KPIs temps réel</p>
              </div>
            </div>
            <p className="text-sm text-[#1A1A1A]/70 mb-4">CA temps réel, flux transactions, alertes paiements en attente, retraits et Fast Start.</p>
            <span className="inline-flex items-center gap-1 text-blue-600 text-sm font-medium">Voir le dashboard →</span>
          </Link>

          {/* Rapport en direct */}
          <div className="bg-white rounded-2xl p-6 border-2 border-green-500 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-xl">📤</div>
              <div>
                <h2 className="font-bold text-[#1A1A1A] text-lg">Rapport en direct</h2>
                <p className="text-xs text-[#1A1A1A]/50">WhatsApp admin — rapport hebdo</p>
              </div>
            </div>
            <p className="text-sm text-[#1A1A1A]/70 mb-4">
              Déclenche l&apos;envoi du résumé hebdomadaire WhatsApp à l&apos;admin (automatique le lundi 7h).
            </p>
            <button onClick={lancerRapport} disabled={rapportLoading}
              className="w-full py-2.5 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {rapportLoading ? 'Envoi en cours…' : '📨 Envoyer le rapport maintenant'}
            </button>
            {rapportResult && (
              <div className={`mt-3 p-3 rounded-xl text-sm ${rapportResult.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'}`}>
                {rapportResult.error ? (
                  <span>❌ {rapportResult.error}</span>
                ) : (
                  <>
                    <p className="font-semibold">✅ Rapport envoyé !</p>
                    {rapportResult.caSemaine !== undefined && (
                      <p className="mt-1">CA semaine : <strong>{formatFCFA(rapportResult.caSemaine)}</strong></p>
                    )}
                    {rapportResult.message && (
                      <p className="mt-1 text-xs text-green-700 italic">{rapportResult.message}</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Gestion Mariés */}
          <GestionMaries />

          {/* Codes Promos */}
          <div className="bg-white rounded-2xl p-6 border-2 border-purple-400 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-xl">🎁</div>
              <div>
                <h2 className="font-bold text-[#1A1A1A] text-lg">Codes Promos</h2>
                <p className="text-xs text-[#1A1A1A]/50">Codes actifs + CA généré</p>
              </div>
            </div>
            <p className="text-sm text-[#1A1A1A]/70 mb-4">Collection Firestore <code className="bg-gray-100 px-1 rounded text-xs">codes_promos</code> — un code par espace marié. Initialiser pour créer la structure.</p>
            <div className="flex gap-2">
              <a href={`/api/admin/init-codes-sheet?token=${encodeURIComponent(typeof window !== 'undefined' ? localStorage.getItem('admin_token') ?? '' : '')}`}
                className="flex-1 py-2 rounded-xl bg-purple-500 text-white text-sm font-semibold hover:bg-purple-600 transition-colors text-center">
                🔧 Initialiser collection
              </a>
            </div>
          </div>

        </div>

        {/* Exports rapides */}
        <div className="mt-8 bg-white rounded-2xl p-6 border border-[#1A1A1A]/10">
          <h3 className="font-bold text-[#1A1A1A] mb-4">Exports rapides</h3>
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'CSV Transactions', type: 'transactions' },
              { label: 'CSV Utilisateurs', type: 'utilisateurs' },
              { label: 'CSV Commissions', type: 'commissions' },
              { label: 'CSV Retraits', type: 'retraits' },
              { label: 'CSV Mariés', type: 'maries' },
              { label: 'CSV Commandes Boutique', type: 'commandes_boutique' },
            ].map(({ label, type }) => (
              <a key={type} href={`/api/admin/export/csv?type=${type}`}
                className="px-4 py-2 bg-[#F5F0E8] text-[#1A1A1A] text-sm font-medium rounded-lg hover:bg-[#C9A84C]/20 transition-colors border border-[#C9A84C]/30">
                ⬇ {label}
              </a>
            ))}
            <a href="/api/admin/export/pdf-rapport"
              className="px-4 py-2 bg-[#1A1A1A] text-white text-sm font-medium rounded-lg hover:bg-[#1A1A1A]/80 transition-colors">
              📄 PDF Rapport mensuel
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
