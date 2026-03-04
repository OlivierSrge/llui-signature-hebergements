'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { KeyRound, Loader2, Eye, EyeOff } from 'lucide-react'
import { loginPartner } from '@/actions/partners'

export default function PartnerLoginPage() {
  const router = useRouter()
  const [accessCode, setAccessCode] = useState('')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const result = await loginPartner(accessCode, pin)
    setLoading(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Connexion réussie')
    router.push('/partenaire/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        {/* Logo / en-tête */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gold-100 mb-4">
            <KeyRound size={24} className="text-gold-600" />
          </div>
          <h1 className="font-serif text-2xl font-semibold text-dark">Espace partenaire</h1>
          <p className="text-dark/50 text-sm mt-1">L&Lui Signature</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-beige-200 p-6 space-y-4 shadow-sm">
          <div>
            <label className="label">Code d&apos;accès</label>
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              placeholder="PART-XXXXXX"
              required
              className="input-field uppercase tracking-widest font-mono"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="label">PIN</label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                required
                className="input-field pr-10"
                autoComplete="current-password"
                inputMode="numeric"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark/30 hover:text-dark transition-colors"
              >
                {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !accessCode || !pin}
            className="w-full btn-primary py-3 disabled:opacity-50"
          >
            {loading
              ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" />Connexion...</span>
              : 'Se connecter'
            }
          </button>
        </form>

        <p className="text-center text-xs text-dark/30 mt-4">
          Code et PIN communiqués par l&apos;équipe L&Lui Signature.
        </p>
      </div>
    </div>
  )
}
