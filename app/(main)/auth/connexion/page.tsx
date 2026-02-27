'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

function ConnexionForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error('Email ou mot de passe incorrect')
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
          <label className="label">Adresse email</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark/30" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.cm"
              className="input-field pl-10"
              autoComplete="email"
            />
          </div>
        </div>

        <div>
          <label className="label">Mot de passe</label>
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

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-3.5 font-semibold"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={17} className="animate-spin" />
              Connexion...
            </span>
          ) : (
            'Se connecter'
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-dark/50">
        Pas encore de compte ?{' '}
        <Link href="/auth/inscription" className="text-gold-600 font-medium hover:underline">
          S&apos;inscrire
        </Link>
      </div>
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
            Bon retour !
          </h1>
          <p className="text-dark/50 text-sm">Connectez-vous à votre espace personnel</p>
        </div>
        <Suspense fallback={<div className="h-64 bg-white rounded-2xl animate-pulse" />}>
          <ConnexionForm />
        </Suspense>
      </div>
    </div>
  )
}
