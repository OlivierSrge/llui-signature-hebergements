'use client'

import { useState } from 'react'

interface Props {
  token: string
  orderData: {
    nom_client: string
    email_client: string
    type_pass: string
    montant: number
  }
}

export default function ConfirmActions({ token, orderData }: Props) {
  const [loading, setLoading] = useState<'confirm' | 'cancel' | null>(null)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  async function handleAction(action: 'confirm' | 'cancel') {
    setLoading(action)
    try {
      const res = await fetch('/api/admin/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ ok: true, message: action === 'confirm' ? '✅ Paiement confirmé ! Email client envoyé.' : '❌ Commande annulée.' })
      } else {
        setResult({ ok: false, message: data.error ?? 'Erreur inconnue' })
      }
    } catch {
      setResult({ ok: false, message: 'Erreur réseau' })
    } finally {
      setLoading(null)
    }
  }

  if (result) {
    return (
      <div style={{
        padding: '20px',
        borderRadius: '12px',
        background: result.ok ? '#f0fdf4' : '#fef2f2',
        border: `2px solid ${result.ok ? '#86efac' : '#fca5a5'}`,
        textAlign: 'center',
      }}>
        <p style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: result.ok ? '#166534' : '#991b1b' }}>
          {result.message}
        </p>
        {result.ok && (
          <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#555' }}>
            Le client {orderData.nom_client} recevra son email d&apos;activation sous peu.
          </p>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <button
        onClick={() => handleAction('confirm')}
        disabled={!!loading}
        style={{
          width: '100%',
          padding: '18px',
          background: loading === 'confirm' ? '#86efac' : '#22c55e',
          color: '#fff',
          border: 'none',
          borderRadius: '12px',
          fontSize: '18px',
          fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
        }}
      >
        {loading === 'confirm' ? '⏳ Confirmation...' : '✅ Confirmer le paiement'}
      </button>

      <button
        onClick={() => handleAction('cancel')}
        disabled={!!loading}
        style={{
          width: '100%',
          padding: '14px',
          background: 'transparent',
          color: '#dc2626',
          border: '2px solid #dc2626',
          borderRadius: '12px',
          fontSize: '15px',
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading === 'cancel' ? '⏳ Annulation...' : '❌ Annuler la commande'}
      </button>
    </div>
  )
}
