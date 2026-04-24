'use client'

import { useState } from 'react'

export default function VerifyActions({ token, passNom }: { token: string; passNom: string }) {
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUse() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/pass-vip/use-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (res.ok) {
        setDone(true)
      } else {
        setError(data.error ?? 'Erreur')
      }
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
        <p style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 700, color: '#166534' }}>✅ Utilisation enregistrée</p>
        <p style={{ margin: 0, fontSize: '14px', color: '#555' }}>La réduction a été accordée à {passNom}.</p>
      </div>
    )
  }

  return (
    <div>
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#dc2626' }}>{error}</p>
        </div>
      )}
      <button
        onClick={handleUse}
        disabled={loading}
        style={{
          width: '100%', padding: '18px',
          background: loading ? '#86efac' : '#22c55e',
          color: '#fff', border: 'none', borderRadius: '12px',
          fontSize: '18px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? '⏳ Enregistrement...' : '✅ Enregistrer l\'utilisation'}
      </button>
    </div>
  )
}
