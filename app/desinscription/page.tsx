'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, MessageCircle } from 'lucide-react'

type State = 'idle' | 'loading' | 'success' | 'not_found' | 'error'

function DesinscriptionForm() {
  const searchParams = useSearchParams()
  const tel = searchParams.get('tel') ?? ''
  const [state, setState] = useState<State>('idle')

  // Si un tel est passé en URL, confirmer automatiquement au clic
  const handleConfirm = async () => {
    if (!tel) return
    setState('loading')
    try {
      const res = await fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telephone: tel }),
      })
      const data = await res.json()
      if (data.success) {
        setState(data.found ? 'success' : 'not_found')
      } else {
        setState('error')
      }
    } catch {
      setState('error')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16" style={{ background: '#F5F0E8' }}>
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: '#1A1A1A', border: '1px solid rgba(201,168,76,0.3)' }}
      >
        {/* Logo */}
        <div className="text-center mb-6">
          <Link href="/" className="text-[#C9A84C] font-serif text-lg font-semibold">
            L&amp;Lui Signature
          </Link>
        </div>

        {state === 'idle' && (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-[#C9A84C]/15 flex items-center justify-center">
                <MessageCircle size={26} className="text-[#C9A84C]" />
              </div>
            </div>
            <h1 className="text-white font-serif text-xl font-semibold text-center mb-2">
              Se désinscrire
            </h1>
            <p className="text-white/50 text-sm text-center mb-6 leading-relaxed">
              Vous ne souhaitez plus recevoir les bons plans Kribi chaque lundi ?
            </p>
            {tel ? (
              <>
                <p className="text-white/40 text-xs text-center mb-5">
                  Numéro :{' '}
                  <span className="text-[#C9A84C] font-mono">
                    {tel.slice(0, 6)}{'X'.repeat(Math.max(0, tel.replace(/\s/g, '').length - 7))}{tel.slice(-1)}
                  </span>
                </p>
                <button
                  onClick={handleConfirm}
                  className="w-full py-3 rounded-xl font-semibold text-sm mb-3 transition-opacity hover:opacity-80"
                  style={{ background: '#C9A84C', color: '#1A1A1A' }}
                >
                  Confirmer la désinscription
                </button>
              </>
            ) : (
              <p className="text-white/30 text-xs text-center">
                Lien invalide. Retrouvez le lien de désinscription dans votre message WhatsApp.
              </p>
            )}
            <Link
              href="/"
              className="block text-center text-white/30 text-xs hover:text-white/50 transition-colors"
            >
              Annuler — rester abonné
            </Link>
          </>
        )}

        {state === 'loading' && (
          <div className="text-center py-4">
            <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-white/50 text-sm">Traitement…</p>
          </div>
        )}

        {state === 'success' && (
          <div className="text-center">
            <CheckCircle size={40} className="text-[#1D9E75] mx-auto mb-4" />
            <h2 className="text-white font-serif text-lg font-semibold mb-2">
              Vous êtes désinscrit
            </h2>
            <p className="text-white/50 text-sm mb-6 leading-relaxed">
              Vous ne recevrez plus les bons plans Kribi.{' '}
              À bientôt sur L&amp;Lui Signature !
            </p>
            <Link
              href="/"
              className="inline-block px-5 py-2.5 rounded-xl text-sm font-medium"
              style={{ border: '1px solid rgba(201,168,76,0.4)', color: '#C9A84C' }}
            >
              Retour à l&apos;accueil →
            </Link>
          </div>
        )}

        {state === 'not_found' && (
          <div className="text-center">
            <XCircle size={40} className="text-[#C9A84C] mx-auto mb-4" />
            <h2 className="text-white font-serif text-lg font-semibold mb-2">
              Numéro introuvable
            </h2>
            <p className="text-white/50 text-sm mb-6">
              Ce numéro n&apos;est pas dans notre liste. Il est peut-être déjà désinscrit.
            </p>
            <Link href="/" className="text-[#C9A84C] text-sm underline underline-offset-2">
              Retour à l&apos;accueil
            </Link>
          </div>
        )}

        {state === 'error' && (
          <div className="text-center">
            <XCircle size={40} className="text-red-400 mx-auto mb-4" />
            <p className="text-white/50 text-sm mb-4">Une erreur est survenue.</p>
            <button
              onClick={() => setState('idle')}
              className="text-[#C9A84C] text-sm underline underline-offset-2"
            >
              Réessayer
            </button>
          </div>
        )}
      </div>

      <p className="text-[#1A1A1A]/30 text-xs mt-6">
        L&amp;Lui Signature · Kribi, Cameroun
      </p>
    </div>
  )
}

export default function DesinscriptionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F0E8' }}>
        <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DesinscriptionForm />
    </Suspense>
  )
}
