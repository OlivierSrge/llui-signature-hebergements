'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Lock, Loader2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Suspense } from 'react'

function ConnexionForm() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/admin'
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (!res.ok) {
      toast.error('Mot de passe incorrect')
      setLoading(false)
      return
    }

    toast.success('Connexion réussie')
    router.push(redirectTo)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-2xl shadow-card p-8">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">Mot de passe administrateur</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark/30" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-field pl-10 pr-10"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark/30 hover:text-dark/60 transition-colors"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full btn-primary py-3.5 font-semibold">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={17} className="animate-spin" /> Connexion...
            </span>
          ) : (
            'Accéder au tableau de bord'
          )}
        </button>
      </form>
    </div>
  )
}

export default function ConnexionPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-beige-100 px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/" className="font-serif text-3xl font-semibold text-dark">
            L<span className="text-gold-500">&</span>Lui Signature
          </Link>
          <h1 className="font-serif text-2xl font-semibold text-dark mt-6 mb-2">
            Administration
          </h1>
          <p className="text-dark/50 text-sm">Accès réservé à l&apos;équipe L&amp;Lui</p>
        </div>
        <Suspense fallback={<div className="h-40 bg-white rounded-2xl animate-pulse" />}>
          <ConnexionForm />
        </Suspense>
        <p className="text-center mt-6 text-sm text-dark/40">
          <Link href="/" className="hover:text-dark transition-colors">← Retour au site</Link>
        </p>
      </div>
    </div>
  )
}
