'use client'
// app/portail/login/page.tsx
// Page de connexion portail mariés

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PortailLoginPage() {
  const router = useRouter()
  const [uid, setUid] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uid.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/portail/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: uid.trim() }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Identifiant invalide')
        return
      }
      router.push('/portail')
      router.refresh()
    } catch {
      setError('Erreur réseau, veuillez réessayer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <p className="font-serif italic text-3xl text-[#1A1A1A]">L&amp;Lui</p>
          <p className="text-sm text-[#888] mt-1">Portail Mariés</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#F5F0E8]">
          <h1 className="text-lg font-semibold text-[#1A1A1A] mb-1">Accéder à mon espace</h1>
          <p className="text-[12px] text-[#888] mb-5">Entrez votre identifiant fourni par L&amp;Lui Signature</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-[#444] mb-1.5 uppercase tracking-wide">
                Identifiant
              </label>
              <input
                type="text"
                value={uid}
                onChange={e => setUid(e.target.value)}
                placeholder="ex: mariage_dupont_2025"
                className="w-full border border-[#E8E0D0] rounded-xl px-4 py-3 text-sm text-[#1A1A1A] placeholder-[#BBB] focus:outline-none focus:border-[#C9A84C] transition-colors bg-[#FAFAF8]"
                required
              />
            </div>

            {error && (
              <p className="text-[12px] text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !uid.trim()}
              className="w-full py-3 rounded-xl text-sm font-semibold text-[#1A1A1A] transition-all disabled:opacity-50"
              style={{ background: '#C9A84C' }}
            >
              {loading ? 'Connexion…' : 'Accéder à mon espace →'}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[#AAA] mt-6">
          Contactez L&amp;Lui Signature pour obtenir votre identifiant
        </p>
      </div>
    </div>
  )
}
