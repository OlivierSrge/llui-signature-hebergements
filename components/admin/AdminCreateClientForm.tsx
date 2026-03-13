'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, X, Loader2 } from 'lucide-react'
import { createClient } from '@/actions/clients'

export default function AdminCreateClientForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const formData = new FormData(e.currentTarget)
    const result = await createClient(formData)
    setLoading(false)
    if (!result.success) {
      setError(result.error || 'Erreur inconnue')
      return
    }
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-primary flex items-center gap-2"
      >
        <UserPlus size={16} /> Créer un client
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-xl font-semibold text-dark">Nouveau client L&Lui Stars</h2>
              <button onClick={() => setOpen(false)} className="text-dark/40 hover:text-dark">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-dark/60 mb-1">Prénom *</label>
                  <input name="firstName" required className="input-field w-full" placeholder="Olivier" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-dark/60 mb-1">Nom *</label>
                  <input name="lastName" required className="input-field w-full" placeholder="Serge" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-dark/60 mb-1">Email *</label>
                <input name="email" type="email" required className="input-field w-full" placeholder="client@email.com" />
              </div>

              <div>
                <label className="block text-xs font-medium text-dark/60 mb-1">Téléphone WhatsApp</label>
                <input name="phone" type="tel" className="input-field w-full" placeholder="693407964" />
              </div>

              <div>
                <label className="block text-xs font-medium text-dark/60 mb-1">Date de naissance</label>
                <input name="birthDate" type="date" className="input-field w-full" />
              </div>

              {error && <p className="text-sm text-red-600">⚠ {error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-outline flex-1"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                  {loading ? 'Création…' : 'Créer le compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
