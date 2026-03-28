'use client'

import { useState } from 'react'
import { MessageCircle, CheckCircle, AlertCircle } from 'lucide-react'

type State = 'idle' | 'loading' | 'success' | 'already' | 'error'

export default function KribiAbonnement() {
  const [tel, setTel] = useState('')
  const [state, setState] = useState<State>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tel.trim()) return
    setState('loading')
    try {
      const res = await fetch('/api/kribi/abonnement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telephone: tel }),
      })
      const data = await res.json()
      if (data.success) {
        setState(data.already ? 'already' : 'success')
      } else {
        setState('error')
      }
    } catch {
      setState('error')
    }
  }

  return (
    <section style={{ background: '#1A1A1A' }} className="py-14 px-4">
      <div className="max-w-md mx-auto text-center">
        {/* Icône WhatsApp */}
        <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[#25D366]/15 flex items-center justify-center">
          <MessageCircle size={32} className="text-[#25D366]" />
        </div>

        <h2 className="font-serif text-2xl font-semibold text-white mb-2">
          Les bons plans de Kribi chaque lundi
        </h2>
        <p className="text-white/50 text-sm mb-7 leading-relaxed">
          Recevez les 3 meilleures activités du weekend directement sur WhatsApp.{' '}
          <span className="text-white/70">Gratuit.</span>
        </p>

        {state === 'success' ? (
          <div className="flex items-center justify-center gap-2 text-[#25D366] font-medium text-sm">
            <CheckCircle size={18} />
            Vous recevrez les bons plans de Kribi chaque lundi matin !
          </div>
        ) : state === 'already' ? (
          <div className="flex items-center justify-center gap-2 text-[#C9A84C] text-sm">
            <CheckCircle size={18} />
            Vous êtes déjà abonné — à bientôt !
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="tel"
              value={tel}
              onChange={(e) => setTel(e.target.value)}
              placeholder="+237 6XX XXX XXX"
              required
              disabled={state === 'loading'}
              className="w-full px-4 py-3.5 rounded-xl bg-white/8 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#C9A84C] transition-colors"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            />
            <button
              type="submit"
              disabled={state === 'loading'}
              className="w-full py-3.5 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-60"
              style={{ background: '#C9A84C', color: '#1A1A1A' }}
            >
              {state === 'loading' ? 'Inscription…' : "S'abonner"}
            </button>
            {state === 'error' && (
              <div className="flex items-center gap-1.5 text-red-400 text-xs justify-center">
                <AlertCircle size={13} /> Une erreur est survenue, réessayez.
              </div>
            )}
          </form>
        )}

        <p className="text-white/25 text-xs mt-4">
          Désinscription gratuite · Sans spam · L&amp;Lui Signature
        </p>
      </div>
    </section>
  )
}
