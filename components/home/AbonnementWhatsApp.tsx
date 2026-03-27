'use client'
// Élément C — bloc inscription newsletter WhatsApp

import { useState } from 'react'
import { MessageCircle, Check, Loader2 } from 'lucide-react'

export default function AbonnementWhatsApp() {
  const [tel, setTel] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'already' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tel.trim()) return
    setStatus('loading')
    try {
      const res = await fetch('/api/evenements/abonnement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telephone: tel }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || 'Erreur')
        setStatus('error')
      } else if (data.already) {
        setStatus('already')
      } else {
        setStatus('success')
      }
    } catch {
      setStatus('error')
      setErrorMsg('Erreur réseau, réessayez.')
    }
  }

  return (
    <section className="py-14 px-4 bg-[#1A1A1A]">
      <div className="max-w-lg mx-auto text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#1D9E75] flex items-center justify-center mx-auto mb-4">
          <MessageCircle size={22} className="text-white" />
        </div>
        <h2 className="font-serif text-2xl font-semibold text-white mb-2">
          Les bons plans de Kribi chaque lundi
        </h2>
        <p className="text-white/50 text-sm mb-6">
          Recevez chaque semaine les 3 meilleures activités et hébergements disponibles, directement sur WhatsApp.
        </p>

        {status === 'success' && (
          <div className="flex items-center justify-center gap-2 text-[#1D9E75] font-medium">
            <Check size={18} />
            Abonnement confirmé — à lundi !
          </div>
        )}

        {status === 'already' && (
          <div className="flex items-center justify-center gap-2 text-[#C9A84C] font-medium text-sm">
            <Check size={16} />
            Vous êtes déjà abonné — merci !
          </div>
        )}

        {(status === 'idle' || status === 'loading' || status === 'error') && (
          <form onSubmit={handleSubmit} className="flex gap-2 max-w-sm mx-auto">
            <input
              type="tel"
              value={tel}
              onChange={(e) => setTel(e.target.value)}
              placeholder="+237 6XX XXX XXX"
              required
              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#C9A84C] transition-colors"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="px-5 py-3 bg-[#C9A84C] text-[#1A1A1A] rounded-xl font-semibold text-sm hover:bg-[#b8943d] transition-colors disabled:opacity-60 flex items-center gap-2 flex-shrink-0"
            >
              {status === 'loading' ? <Loader2 size={15} className="animate-spin" /> : null}
              S&apos;abonner
            </button>
          </form>
        )}

        {status === 'error' && (
          <p className="mt-2 text-red-400 text-xs">{errorMsg}</p>
        )}

        <p className="text-white/30 text-xs mt-3">Désinscription gratuite à tout moment · Sans spam</p>
      </div>
    </section>
  )
}
