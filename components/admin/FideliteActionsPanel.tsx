'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  generateMissingPromoCodes,
  sendBirthdayPoints,
  checkClientBirthdays,
  checkStayAnniversaries,
  checkExpiringPromoCodes,
} from '@/actions/fidelite'
import FideliteNotificationsTable from '@/components/admin/FideliteNotificationsTable'

interface ActionItem {
  id: string
  name: string
  niveau?: string
  code?: string
  birthDate?: string
}

interface Notification {
  id: string
  clientId: string
  clientName: string
  clientPhone: string | null
  type: string
  status: string
  message: string
  waUrl: string
  triggeredAt: string
  meta?: Record<string, any>
}

interface Props {
  levelUpWithoutPromo: ActionItem[]
  expiredCodes: ActionItem[]
  birthdayClients: ActionItem[]
  pendingNotifications: Notification[]
}

export default function FideliteActionsPanel({
  levelUpWithoutPromo,
  expiredCodes,
  birthdayClients,
  pendingNotifications: initialPendingNotifs,
}: Props) {
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

  const handleCheckBirthdays = async () => {
    setLoading('checkBirthdays')
    const res = await checkClientBirthdays()
    setMessage(res.success ? `✅ ${res.processed} anniversaire(s) traité(s)` : `❌ ${res.error}`)
    setLoading(null)
  }

  const handleCheckStayAnniversaries = async () => {
    setLoading('checkStay')
    const res = await checkStayAnniversaries()
    setMessage(res.success ? `✅ ${res.processed} anniversaire(s) de séjour traité(s)` : `❌ ${res.error}`)
    setLoading(null)
  }

  const handleCheckExpiringCodes = async () => {
    setLoading('checkExpiring')
    const res = await checkExpiringPromoCodes()
    setMessage(res.success ? `✅ ${res.created} notification(s) créée(s)` : `❌ ${res.error}`)
    setLoading(null)
  }

  return (
    <div className="space-y-4">
      {/* Feedback message */}
      {message && (
        <div className="px-4 py-2 bg-beige-50 border border-beige-200 rounded-xl text-sm text-dark/70">
          {message}
        </div>
      )}

      {/* Vérifications automatiques */}
      <div className="bg-white rounded-2xl border border-beige-200 p-5">
        <h3 className="font-semibold text-dark text-sm mb-3">🔔 Déclencheurs automatiques</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            onClick={handleCheckBirthdays}
            disabled={loading === 'checkBirthdays'}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-beige-200 text-xs font-medium text-dark/70 hover:bg-beige-50 disabled:opacity-50"
          >
            {loading === 'checkBirthdays' ? '...' : '🎂 Envoyer les voeux anniversaires'}
          </button>
          <button
            onClick={handleCheckStayAnniversaries}
            disabled={loading === 'checkStay'}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-beige-200 text-xs font-medium text-dark/70 hover:bg-beige-50 disabled:opacity-50"
          >
            {loading === 'checkStay' ? '...' : '🏠 Anniversaires de séjour'}
          </button>
          <button
            onClick={handleCheckExpiringCodes}
            disabled={loading === 'checkExpiring'}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-beige-200 text-xs font-medium text-dark/70 hover:bg-beige-50 disabled:opacity-50"
          >
            {loading === 'checkExpiring' ? '...' : '⏰ Codes promo expirants'}
          </button>
        </div>
      </div>

      {/* Actions manuelles requises */}
      {total > 0 && (
        <div className="bg-white rounded-2xl border border-amber-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-dark text-sm flex items-center gap-2">
              <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold">{total}</span>
              Actions requises
            </h3>
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
                    {loading === 'generate' ? '...' : 'Générer les codes manquants'}
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
      )}

      {/* Notifications en attente */}
      <div className="bg-white rounded-2xl border border-beige-200 p-5">
        <h3 className="font-semibold text-dark text-sm mb-3 flex items-center gap-2">
          {initialPendingNotifs.length > 0 && (
            <span className="w-5 h-5 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-xs font-bold">
              {initialPendingNotifs.length}
            </span>
          )}
          📱 Notifications en attente d'envoi
        </h3>
        <FideliteNotificationsTable notifications={initialPendingNotifs} />
      </div>
    </div>
  )
}
