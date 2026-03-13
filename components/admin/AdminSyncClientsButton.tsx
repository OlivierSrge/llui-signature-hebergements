'use client'

import { useState } from 'react'
import { RefreshCw, Loader2, CheckCircle } from 'lucide-react'

export default function AdminSyncClientsButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ created: number; updated: number; total: number } | null>(null)
  const [error, setError] = useState('')

  async function handleSync() {
    if (!confirm('Synchroniser tous les clients depuis les réservations confirmées ?')) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/admin/sync-clients', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erreur'); return }
      setResult(data)
    } catch {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
          <CheckCircle size={12} />
          {result.created} créé{result.created > 1 ? 's' : ''}, {result.updated} mis à jour ({result.total} emails uniques)
        </span>
      )}
      {error && <span className="text-xs text-red-600">⚠ {error}</span>}
      <button
        onClick={handleSync}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-beige-300 text-sm text-dark/70 hover:bg-beige-50 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        {loading ? 'Sync en cours…' : 'Sync depuis réservations'}
      </button>
    </div>
  )
}
