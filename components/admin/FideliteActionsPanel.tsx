'use client'

import { useState } from 'react'
import Link from 'next/link'
import { generateMissingPromoCodes, sendBirthdayPoints } from '@/actions/fidelite'

interface ActionItem {
  id: string
  name: string
  niveau?: string
  code?: string
  birthDate?: string
}

interface Props {
  levelUpWithoutPromo: ActionItem[]
  expiredCodes: ActionItem[]
  birthdayClients: ActionItem[]
}

export default function FideliteActionsPanel({ levelUpWithoutPromo, expiredCodes, birthdayClients }: Props) {
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const total = levelUpWithoutPromo.length + expiredCodes.length + birthdayClients.length

  const handleGenerateMissing = async () => {
    setLoading('generate')
    const res = await generateMissingPromoCodes()
    setMessage(res.success ? `✅ ${res.generated} codes générés` : `❌ ${res.error}`)
    setLoading(null)
  }

  const handleBirthdayPoints = async (clientId: string) => {
    setLoading(`birthday-${clientId}`)
    const res = await sendBirthdayPoints(clientId)
    setMessage(res.success ? '✅ Points anniversaire attribués' : `❌ ${res.error}`)
    setLoading(null)
  }

  if (total === 0) {
    return (
      <div className="bg-white rounded-2xl border border-beige-200 p-5">
        <h3 className="font-semibold text-dark text-sm mb-2">Actions requises</h3>
        <p className="text-sm text-dark/40">✅ Aucune action requise pour le moment.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-amber-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-dark text-sm flex items-center gap-2">
          <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold">{total}</span>
          Actions requises
        </h3>
        {message && (
          <span className="text-xs text-dark/60 bg-beige-50 px-2 py-1 rounded-lg">{message}</span>
        )}
      </div>

      <div className="space-y-4">
        {/* Montées de niveau sans code promo */}
        {levelUpWithoutPromo.length > 0 && (
          <div className="border border-beige-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-dark">
                🎯 {levelUpWithoutPromo.length} client(s) sans code promo après montée de niveau
              </p>
              <button
                onClick={handleGenerateMissing}
                disabled={loading === 'generate'}
                className="text-xs px-3 py-1.5 rounded-lg bg-gold-500 text-white hover:bg-gold-600 font-medium"
              >
                {loading === 'generate' ? '...' : 'Envoyer les codes manquants'}
              </button>
            </div>
            <div className="space-y-1">
              {levelUpWithoutPromo.slice(0, 3).map((c) => (
                <Link key={c.id} href={`/admin/fidelite/clients/${c.id}`}
                  className="flex items-center gap-2 text-xs text-dark/60 hover:text-gold-600">
                  <span>→</span><span>{c.name}</span>
                  {c.niveau && <span className="text-dark/40">({c.niveau})</span>}
                </Link>
              ))}
              {levelUpWithoutPromo.length > 3 && (
                <p className="text-xs text-dark/40">et {levelUpWithoutPromo.length - 3} autres...</p>
              )}
            </div>
          </div>
        )}

        {/* Codes expirés */}
        {expiredCodes.length > 0 && (
          <div className="border border-beige-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-dark">
                ⏰ {expiredCodes.length} code(s) promo expiré(s) non utilisé(s)
              </p>
              <button
                onClick={handleGenerateMissing}
                disabled={loading === 'generate'}
                className="text-xs px-3 py-1.5 rounded-lg border border-beige-200 text-dark/70 hover:bg-beige-50 font-medium"
              >
                Régénérer
              </button>
            </div>
            <div className="space-y-1">
              {expiredCodes.slice(0, 3).map((c) => (
                <Link key={c.id} href={`/admin/fidelite/clients/${c.id}`}
                  className="flex items-center gap-2 text-xs text-dark/60 hover:text-gold-600">
                  <span>→</span><span>{c.name}</span>
                  {c.code && <span className="font-mono text-dark/40">{c.code}</span>}
                </Link>
              ))}
              {expiredCodes.length > 3 && (
                <p className="text-xs text-dark/40">et {expiredCodes.length - 3} autres...</p>
              )}
            </div>
          </div>
        )}

        {/* Anniversaires à venir */}
        {birthdayClients.length > 0 && (
          <div className="border border-beige-100 rounded-xl p-4">
            <p className="text-sm font-medium text-dark mb-3">
              🎂 {birthdayClients.length} anniversaire(s) dans les 7 prochains jours
            </p>
            <div className="space-y-2">
              {birthdayClients.map((c) => (
                <div key={c.id} className="flex items-center justify-between">
                  <Link href={`/admin/fidelite/clients/${c.id}`}
                    className="text-xs text-dark/60 hover:text-gold-600">
                    {c.name}
                    {c.birthDate && <span className="text-dark/40 ml-2">({c.birthDate.slice(5).replace('-', '/')})</span>}
                  </Link>
                  <button
                    onClick={() => handleBirthdayPoints(c.id)}
                    disabled={loading === `birthday-${c.id}`}
                    className="text-xs px-2 py-1 rounded-lg bg-gold-100 text-gold-800 hover:bg-gold-200 font-medium"
                  >
                    {loading === `birthday-${c.id}` ? '...' : '+ Points'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
