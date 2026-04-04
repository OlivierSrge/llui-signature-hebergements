'use client'
// app/admin/prescripteurs/[id]/error.tsx — Fallback d'erreur pour le détail prescripteur

import { useEffect } from 'react'
import { RefreshCw, AlertTriangle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function PrescripteurDetailError({ error, reset }: Props) {
  useEffect(() => {
    console.error('[admin/prescripteurs/[id]] Erreur serveur:', error)
  }, [error])

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0 flex flex-col items-center justify-center min-h-[50vh]">
      <div className="bg-white rounded-2xl border border-red-100 p-8 max-w-md w-full text-center space-y-4">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle size={24} className="text-red-500" />
        </div>
        <h2 className="font-serif text-xl font-semibold text-dark">
          Erreur lors du chargement
        </h2>
        <p className="text-dark/60 text-sm">
          Impossible de charger les données du prescripteur. Vérifiez que les index Firestore sont bien créés ou réessayez.
        </p>
        {error.message && (
          <p className="text-xs text-red-400 font-mono bg-red-50 px-3 py-2 rounded-lg break-words">
            {error.message}
          </p>
        )}
        {error.digest && (
          <p className="text-xs text-dark/30 font-mono">
            Digest : {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <Link
            href="/admin/prescripteurs"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dark/20 text-sm font-medium text-dark/70 hover:bg-dark/5 transition-colors"
          >
            <ArrowLeft size={14} /> Retour
          </Link>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-dark text-white rounded-xl text-sm font-medium hover:bg-dark/90 transition-colors"
          >
            <RefreshCw size={14} />
            Réessayer
          </button>
        </div>
      </div>
    </div>
  )
}
