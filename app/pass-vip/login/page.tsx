'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PassVipLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/pass-vip/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      })
      const data = await res.json()
      if (res.ok) {
        router.push('/pass-vip/dashboard')
      } else {
        setError(data.error ?? 'Identifiants incorrects')
      }
    } catch {
      setError('Erreur réseau, réessayez')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0E8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '.1em' }}>L&Lui ✦ Signature</p>
          <h1 style={{ margin: '0 0 8px', fontFamily: 'Georgia,serif', fontSize: '26px', color: '#1a1a1a' }}>Espace Pass VIP</h1>
          <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>Connectez-vous avec vos identifiants</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,.08)' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="votre@email.com"
              style={{
                width: '100%', padding: '12px 14px', border: '2px solid #e5e7eb',
                borderRadius: '10px', fontSize: '15px', outline: 'none',
                boxSizing: 'border-box', transition: 'border-color 0.2s',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#C9A84C' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="VIP2026XX00"
              style={{
                width: '100%', padding: '12px 14px', border: '2px solid #e5e7eb',
                borderRadius: '10px', fontSize: '15px', outline: 'none',
                boxSizing: 'border-box', transition: 'border-color 0.2s',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#C9A84C' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb' }}
            />
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#dc2626' }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px',
              background: loading ? '#e5c882' : '#C9A84C',
              color: '#fff', border: 'none', borderRadius: '10px',
              fontSize: '16px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? '⏳ Connexion...' : '✦ Se connecter'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#aaa', marginTop: '20px', lineHeight: 1.5 }}>
          Votre mot de passe temporaire vous a été envoyé par email lors de l&apos;activation de votre Pass VIP.
        </p>
      </div>
    </div>
  )
}
