'use client'
// app/(main)/mon-stars/MonStarsClient.tsx — Dashboard client L&Lui Stars

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { getClientFidelite } from '@/actions/stars'
import { getActiveCardsForClient } from '@/actions/loyalty'
import type { ClientFidelite } from '@/actions/stars'
import type { ParametresPlateforme } from '@/actions/parametres'

const ElectronicPass = dynamic(() => import('@/components/ElectronicPass'), { ssr: false })
const QrScanModal = dynamic(() => import('@/components/QrScanModal'), { ssr: false })
const SectionWeekend = dynamic(() => import('@/components/home/SectionWeekend'), { ssr: false })

const BOUTIQUE_URL = process.env.NEXT_PUBLIC_BOUTIQUE_URL ?? 'https://l-et-lui-signature.com'

interface ActiveCard {
  card_id: string
  programme_nom: string
  partenaire_id: string
  niveau_actuel: string
  points_cumules: number
  expires_at: string
  statut: string
}

interface Props {
  params: ParametresPlateforme
  initialTel?: string | null
}

function normalizePhone(tel: string): string {
  let t = tel.replace(/[\s\-().]/g, '')
  if (t.startsWith('00')) t = '+' + t.slice(2)
  if (/^237\d{8,9}$/.test(t)) t = '+' + t
  if (!t.startsWith('+')) t = '+237' + t
  return t
}

function formatDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function MonStarsClient({ params, initialTel }: Props) {
  const [phoneInput, setPhoneInput] = useState(initialTel ?? '')
  const [client, setClient] = useState<ClientFidelite | null>(null)
  const [activeCards, setActiveCards] = useState<ActiveCard[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showQrModal, setShowQrModal] = useState(false)

  const loadClient = useCallback(async (tel: string) => {
    if (!tel.trim()) return
    setLoading(true)
    setError('')
    const [starsResult, cardsResult] = await Promise.all([
      getClientFidelite(tel),
      getActiveCardsForClient(tel),
    ])
    setLoading(false)
    if (!starsResult) {
      setError('Aucun compte trouvé pour ce numéro. Effectuez un premier achat chez un partenaire L&Lui.')
    } else {
      setClient(starsResult)
      localStorage.setItem('stars_client_tel', tel.trim())
    }
    if (cardsResult.success && cardsResult.cards) {
      setActiveCards(cardsResult.cards)
    }
  }, [])

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('stars_client_tel') : null
    const tel = initialTel ?? stored ?? ''
    if (tel) {
      setPhoneInput(tel)
      loadClient(tel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    loadClient(phoneInput)
  }

  function handleRefresh() {
    const tel = client?.telephone ?? phoneInput
    if (tel) loadClient(tel)
  }

  const normalizedTel = client?.telephone ?? (phoneInput ? normalizePhone(phoneInput) : '')

  return (
    <div className="min-h-screen bg-[#F5F0E8]">

      {/* ── Header ── */}
      <div className="flex flex-col items-center pt-8 pb-4 px-4">
        <p className="text-xs text-[#C9A84C] font-semibold tracking-widest uppercase">L&amp;Lui Stars</p>
        <h1 className="text-2xl font-serif font-bold text-[#1A1A1A] mt-1">Mes Stars</h1>
        <p className="text-xs text-[#1A1A1A]/50 mt-0.5">Votre espace fidélité L&amp;Lui Signature</p>
      </div>

      <div className="flex flex-col items-center px-4 pb-8 gap-5 max-w-sm mx-auto">

        {/* ── Formulaire téléphone ── */}
        {!client && (
          <div className="w-full bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <div className="text-center space-y-1">
              <p className="text-2xl">📱</p>
              <p className="text-sm font-semibold text-[#1A1A1A]">Accédez à votre compte</p>
              <p className="text-xs text-[#1A1A1A]/50">Saisissez votre numéro de téléphone</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="Ex : 693 407 964"
                autoFocus
                className="w-full border border-[#F5F0E8] rounded-xl px-3 py-3 text-center text-lg font-bold focus:outline-none focus:border-[#C9A84C]"
              />
              {error && <p className="text-xs text-red-500 text-center">{error}</p>}
              <button
                type="submit"
                disabled={loading || !phoneInput.trim()}
                className="w-full py-3 bg-[#C9A84C] text-white text-sm font-semibold rounded-xl disabled:opacity-50"
              >
                {loading ? 'Recherche...' : '⭐ Accéder à mes Stars'}
              </button>
            </form>
          </div>
        )}

        {/* ── Contenu compte ── */}
        {client && (
          <>
            {/* Actions rapides */}
            <div className="w-full flex gap-2">
              <button
                onClick={() => setShowQrModal(true)}
                className="flex-1 py-2.5 bg-[#C9A84C] text-white text-sm font-semibold rounded-xl"
              >
                📷 Scanner un QR
              </button>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="px-4 py-2.5 bg-white border border-[#E8E0D0] text-[#1A1A1A]/60 text-sm rounded-xl"
                title="Actualiser"
              >
                {loading ? '…' : '↺'}
              </button>
              <button
                onClick={() => { setClient(null); setActiveCards([]); setPhoneInput(''); setError(''); localStorage.removeItem('stars_client_tel') }}
                className="px-4 py-2.5 bg-white border border-[#E8E0D0] text-[#1A1A1A]/60 text-sm rounded-xl"
                title="Changer de compte"
              >
                ✕
              </button>
            </div>

            {/* Pass électronique Stars */}
            <div className="w-full">
              <ElectronicPass client={client} params={params} />
            </div>

            {/* Cartes de fidélité actives */}
            <div className="w-full bg-white rounded-2xl p-5 shadow-sm space-y-3">
              <p className="text-xs font-semibold text-[#1A1A1A]/50 uppercase tracking-widest">Mes cartes de fidélité</p>
              {activeCards.length === 0 ? (
                <div className="text-center py-3 space-y-3">
                  <p className="text-sm text-[#1A1A1A]/50">Vous n'avez pas encore de carte active.</p>
                  <Link
                    href="/pass-vip"
                    className="inline-block px-4 py-2 bg-[#C9A84C] text-white text-xs font-semibold rounded-xl"
                  >
                    💎 Obtenir un Pass VIP
                  </Link>
                </div>
              ) : (
                activeCards.map((card) => (
                  <div key={card.card_id} className="bg-[#F5F0E8]/60 rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-[#1A1A1A]">{card.programme_nom}</p>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Active</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#1A1A1A]/60">
                      <span>Niveau : <strong className="text-[#C9A84C]">{card.niveau_actuel || '—'}</strong></span>
                      <span>{card.points_cumules.toLocaleString('fr-FR')} pts</span>
                    </div>
                    <p className="text-[10px] text-[#1A1A1A]/40">Expire le {formatDate(card.expires_at)}</p>
                  </div>
                ))
              )}
              {activeCards.length > 0 && (
                <Link href="/pass-vip" className="block text-center text-xs text-[#C9A84C] font-semibold mt-1">
                  + Obtenir un autre Pass VIP
                </Link>
              )}
            </div>

            {/* Accès rapide écosystème */}
            <div className="w-full bg-white rounded-2xl p-5 shadow-sm space-y-3">
              <p className="text-xs font-semibold text-[#1A1A1A]/50 uppercase tracking-widest">L&amp;Lui Signature</p>
              <a
                href={BOUTIQUE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-[#F5F0E8]/60 rounded-xl hover:bg-[#F5F0E8] transition-colors"
              >
                <span className="text-2xl">🛍️</span>
                <div>
                  <p className="text-sm font-semibold text-[#1A1A1A]">Boutique en ligne</p>
                  <p className="text-xs text-[#1A1A1A]/50">Profitez de vos remises fidélité</p>
                </div>
                <span className="ml-auto text-[#1A1A1A]/30 text-xs">→</span>
              </a>
              <Link
                href="/hebergements"
                className="flex items-center gap-3 p-3 bg-[#F5F0E8]/60 rounded-xl hover:bg-[#F5F0E8] transition-colors"
              >
                <span className="text-2xl">🏠</span>
                <div>
                  <p className="text-sm font-semibold text-[#1A1A1A]">Hébergements à Kribi</p>
                  <p className="text-xs text-[#1A1A1A]/50">Villas, bungalows, hôtels partenaires</p>
                </div>
                <span className="ml-auto text-[#1A1A1A]/30 text-xs">→</span>
              </Link>
              <Link
                href="/pass-vip"
                className="flex items-center gap-3 p-3 bg-[#F5F0E8]/60 rounded-xl hover:bg-[#F5F0E8] transition-colors"
              >
                <span className="text-2xl">💎</span>
                <div>
                  <p className="text-sm font-semibold text-[#1A1A1A]">Pass VIP L&amp;Lui</p>
                  <p className="text-xs text-[#1A1A1A]/50">Avantages exclusifs & réductions</p>
                </div>
                <span className="ml-auto text-[#1A1A1A]/30 text-xs">→</span>
              </Link>
            </div>

            {/* Numéro connecté */}
            <p className="text-[10px] text-center text-[#1A1A1A]/30">
              Compte : {normalizedTel}
            </p>
          </>
        )}

        {/* QR Scan Modal */}
        {showQrModal && client && (
          <QrScanModal
            client_uid={normalizedTel}
            client_tel={normalizedTel}
            onClose={() => { setShowQrModal(false); handleRefresh() }}
          />
        )}

      </div>

      {/* ── Ce weekend à Kribi (pleine largeur) ── */}
      <SectionWeekend />

    </div>
  )
}
