'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle2, Home, TrendingUp } from 'lucide-react'
import { Suspense } from 'react'

function SuccesContent() {
  const params = useSearchParams()
  const router = useRouter()

  const code = params.get('code') ?? ''
  const nomClient = params.get('nom') ?? ''
  const nuits = params.get('nuits') ?? '1'
  const montant = params.get('montant') ?? '0'
  const logement = params.get('logement') ?? ''

  const montantNum = Number(montant)
  const nuitsNum = Number(nuits)
  // Commission = 50% de (montant * commission_rate / 100) — approximation affichée
  // On affiche juste le montant total pour le commercial
  // La commission exacte est dans la BDD

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex flex-col items-center justify-center px-6 gap-8 text-center">
      {/* Icône succès */}
      <div className="w-24 h-24 rounded-full bg-green-100 border-4 border-green-300 flex items-center justify-center">
        <CheckCircle2 size={48} className="text-green-600" />
      </div>

      <div>
        <h1 className="font-serif text-2xl font-semibold text-dark">Reservation confirmee !</h1>
        <p className="text-dark/50 text-sm mt-2">
          Le partenaire a ete notifie par WhatsApp
        </p>
      </div>

      {/* Recap */}
      <div className="w-full max-w-sm bg-white rounded-2xl border border-beige-200 p-5 text-left space-y-3">
        {code && (
          <div className="flex justify-between text-sm">
            <span className="text-dark/50">Code</span>
            <span className="font-mono font-bold text-dark">{code}</span>
          </div>
        )}
        {nomClient && (
          <div className="flex justify-between text-sm">
            <span className="text-dark/50">Client</span>
            <span className="font-semibold text-dark">{nomClient}</span>
          </div>
        )}
        {logement && (
          <div className="flex justify-between text-sm">
            <span className="text-dark/50">Logement</span>
            <span className="font-semibold text-dark truncate max-w-[60%] text-right">{logement}</span>
          </div>
        )}
        {nuitsNum > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-dark/50">Duree</span>
            <span className="font-semibold text-dark">{nuitsNum} nuit{nuitsNum > 1 ? 's' : ''}</span>
          </div>
        )}
        {montantNum > 0 && (
          <div className="flex justify-between text-sm border-t border-beige-100 pt-3">
            <span className="text-dark/50">Montant total</span>
            <span className="font-bold text-dark">{montantNum.toLocaleString('fr-FR')} FCFA</span>
          </div>
        )}
        <div className="bg-gold-50 border border-gold-200 rounded-xl p-3 mt-2">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-gold-600 shrink-0" />
            <p className="text-sm text-gold-700 font-medium">
              Votre commission sera creditee apres paiement du client
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <button
          onClick={() => {
            // Réinitialiser pour un nouveau scan
            sessionStorage.removeItem('commercial_id')
            sessionStorage.removeItem('commercial_nom')
            sessionStorage.removeItem('commercial_partenaire_id')
            router.replace('/commercial')
          }}
          className="w-full py-4 rounded-2xl bg-dark text-white font-semibold text-base flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Home size={18} /> Nouvel enregistrement
        </button>
      </div>

      <p className="text-dark/30 text-xs">
        L&Lui Signature — Reseau commercial
      </p>
    </div>
  )
}

export default function CommercialSuccesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center">
        <CheckCircle2 size={40} className="text-green-500" />
      </div>
    }>
      <SuccesContent />
    </Suspense>
  )
}
