'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, User, Phone, Loader2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

export default function InscriptionPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (form.password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          first_name: form.first_name,
          last_name: form.last_name,
        },
      },
    })

    if (error) {
      toast.error(error.message || 'Erreur lors de l\'inscription')
      setLoading(false)
      return
    }

    // Update profile with phone
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({ phone: form.phone })
        .eq('id', user.id)
    }

    toast.success('Compte créé ! Bienvenue dans l\'espace L&Lui Signature.')
    router.push('/espace-client')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-beige-100 px-4 py-16">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="font-serif text-3xl font-semibold text-dark">
            L<span className="text-gold-500">&</span>Lui Signature
          </Link>
          <h1 className="font-serif text-2xl font-semibold text-dark mt-6 mb-2">
            Créer un compte
          </h1>
          <p className="text-dark/50 text-sm">
            Suivez vos réservations depuis votre espace personnel
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Prénom</label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark/30" />
                  <input
                    name="first_name"
                    type="text"
                    required
                    value={form.first_name}
                    onChange={handleChange}
                    placeholder="Amina"
                    className="input-field pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="label">Nom</label>
                <input
                  name="last_name"
                  type="text"
                  required
                  value={form.last_name}
                  onChange={handleChange}
                  placeholder="Ngono"
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark/30" />
                <input
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="votre@email.cm"
                  className="input-field pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="label">Téléphone</label>
              <div className="relative">
                <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark/30" />
                <input
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+237 6XX XXX XXX"
                  className="input-field pl-10"
                />
              </div>
            </div>

            <div>
              <label className="label">Mot de passe</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark/30" />
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Minimum 8 caractères"
                  className="input-field pl-10 pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark/30 hover:text-dark/60"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3.5 font-semibold mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={17} className="animate-spin" />
                  Création du compte...
                </span>
              ) : (
                'Créer mon compte'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-dark/50">
            Déjà un compte ?{' '}
            <Link href="/auth/connexion" className="text-gold-600 font-medium hover:underline">
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
