'use client'
// app/(main)/mon-stars/MonStarsClient.tsx — Dashboard client L&Lui Stars (QR scan)

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { getClientFidelite } from '@/actions/stars'
import type { ClientFidelite } from '@/actions/stars'
import type { ParametresPlateforme } from '@/actions/parametres'

const ElectronicPass = dynamic(() => import('@/components/ElectronicPass'), { ssr: false })
const QrScanModal = dynamic(() => import('@/components/QrScanModal'), { ssr: false })

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

export default function MonStarsClient({ params, initialTel }: Props) {
  const [phoneInput, setPhoneInput] = useState(initialTel ?? '')
  const [client, setClient] = useState<ClientFidelite | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showQrModal, setShowQrModal] = useState(false)

  const loadClient = useCallback(async (tel: string) => {
    if (!tel.trim()) return
    setLoading(true)
    setError('')
    const c = await getClientFidelite(tel)
    setLoading(false)
    if (!c) {
      setError('Aucun compte trouvé pour ce numéro. Effectuez un achat chez un partenaire L&Lui pour créer votre compte.')
    } else {
      setClient(c)
      localStorage.setItem('stars_client_tel', tel.trim())
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
    if (client?.telephone) loadClient(client.telephone)
  }

  const normalizedTel = client?.telephone ?? (phoneInput ? normalizePhone(phoneInput) : '')

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex flex-col items-center justify-start px-4 py-8 gap-6">

      {/* Header */}
      <div className="w-full max-w-sm text-center space-y-1">
        <p className="text-xs text-[#C9A84C] font-semibold tracking-widest uppercase">L&amp;Lui Stars</p>
        <h1 className="text-2xl font-serif font-bold text-[#1A1A1A]">Mes Stars</h1>
        <p className="text-xs text-[#1A1A1A]/50">Consultez vos Stars et gérez vos avantages</p>
      </div>

      {/* Formulaire téléphone */}
      {!client && (
        <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-sm space-y-4">
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

      {/* Pass électronique */}
      {client && (
        <div className="w-full max-w-sm space-y-4">

          {/* Actions rapides */}
          <div className="flex gap-2">
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
            >
              {loading ? '...' : '↺'}
            </button>
            <button
              onClick={() => { setClient(null); setPhoneInput(''); setError(''); localStorage.removeItem('stars_client_tel') }}
              className="px-4 py-2.5 bg-white border border-[#E8E0D0] text-[#1A1A1A]/60 text-sm rounded-xl"
            >
              ✕
            </button>
          </div>

          <ElectronicPass client={client} params={params} />

          <p className="text-[10px] text-center text-[#1A1A1A]/30">
            Compte : {normalizedTel}
          </p>
        </div>
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
  )
}
