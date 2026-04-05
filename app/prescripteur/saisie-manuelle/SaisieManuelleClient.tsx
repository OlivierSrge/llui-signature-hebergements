'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, XCircle, Delete, Loader2 } from 'lucide-react'
import { scannerCodeManuel } from '@/actions/prescripteurs'

type EtatPage = 'saisie' | 'success' | 'error'

interface ResultatScan {
  commission_fcfa?: number
  nouveau_solde?: number
  client_nom?: string
  hebergement_nom?: string
  error?: string
}

const TOUCHES = ['1','2','3','4','5','6','7','8','9','','0','⌫']

export default function SaisieManuelleClient() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [etat, setEtat] = useState<EtatPage>('saisie')
  const [resultat, setResultat] = useState<ResultatScan | null>(null)
  const [isPending, setIsPending] = useState(false)

  const ajouterChiffre = useCallback((val: string) => {
    if (val === '⌫') {
      setCode((c) => c.slice(0, -1))
      return
    }
    if (val === '') return
    setCode((c) => c.length < 6 ? c + val : c)
  }, [])

  const valider = useCallback(async () => {
    if (code.length !== 6 || isPending) return
    const uid = sessionStorage.getItem('prescripteur_uid')
    if (!uid) { router.replace('/prescripteur'); return }
    setIsPending(true)
    try {
      const res = await scannerCodeManuel(uid, code)
      if (res.success) {
        setResultat(res)
        if (res.nouveau_solde !== undefined) {
          sessionStorage.setItem('prescripteur_solde', String(res.nouveau_solde))
        }
        setEtat('success')
      } else {
        setResultat({ error: res.error ?? 'Code invalide' })
        setEtat('error')
      }
    } catch {
      setResultat({ error: 'Erreur reseau. Reessayez.' })
      setEtat('error')
    } finally {
      setIsPending(false)
    }
  }, [code, isPending, router])

  // ─── Succès ───────────────────────────────────────────────────
  if (etat === 'success' && resultat) {
    return (
      <div className="min-h-screen bg-dark text-white flex flex-col items-center justify-center px-6 gap-6 text-center">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
          <CheckCircle2 size={40} className="text-green-400" />
        </div>
        <div>
          <p className="text-xl font-semibold">Client enregistre !</p>
          <p className="text-white/50 text-sm mt-1">{resultat.client_nom}</p>
          <p className="text-white/40 text-xs">{resultat.hebergement_nom}</p>
        </div>
        <div className="rounded-2xl bg-green-500/10 border border-green-400/30 p-5 w-full max-w-xs">
          <p className="text-green-300 text-sm">Commission creditee</p>
          <p className="font-serif text-3xl font-semibold text-green-300 mt-1">
            +{(resultat.commission_fcfa ?? 1500).toLocaleString('fr-FR')} FCFA
          </p>
          {resultat.nouveau_solde !== undefined && (
            <p className="text-white/40 text-xs mt-2">
              Nouveau solde : {resultat.nouveau_solde.toLocaleString('fr-FR')} FCFA
            </p>
          )}
        </div>
        <button
          onClick={() => router.replace('/prescripteur/accueil')}
          className="w-full max-w-xs py-4 rounded-2xl bg-gold-500 hover:bg-gold-400 text-dark font-semibold text-sm transition-all active:scale-95"
        >
          Retour a l'accueil
        </button>
      </div>
    )
  }

  // ─── Erreur ───────────────────────────────────────────────────
  if (etat === 'error' && resultat) {
    return (
      <div className="min-h-screen bg-dark text-white flex flex-col items-center justify-center px-6 gap-6 text-center">
        <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
          <XCircle size={40} className="text-red-400" />
        </div>
        <div>
          <p className="text-xl font-semibold">Code invalide</p>
          <p className="text-red-300 text-sm mt-2 max-w-xs">{resultat.error}</p>
        </div>
        <button
          onClick={() => { setCode(''); setResultat(null); setEtat('saisie') }}
          className="w-full max-w-xs py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-all"
        >
          Reessayer
        </button>
        <button
          onClick={() => router.back()}
          className="text-white/40 text-sm underline"
        >
          Retour
        </button>
      </div>
    )
  }

  // ─── Saisie ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-dark text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
        <button
          onClick={() => router.back()}
          className="text-white/40 hover:text-white/70 p-1"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-serif text-base font-semibold">Code de reservation</h1>
          <p className="text-white/40 text-xs">Saisie manuelle</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        {/* Instructions */}
        <div className="text-center max-w-xs">
          <p className="text-white/60 text-sm">
            Demandez le code a 6 chiffres affiche chez le partenaire
          </p>
        </div>

        {/* Affichage du code */}
        <div className="flex gap-3 justify-center">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`w-10 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold transition-colors ${
                code[i]
                  ? 'border-gold-400 text-gold-300 bg-gold-400/10'
                  : i === code.length
                  ? 'border-white/40 text-white/20'
                  : 'border-white/20 text-white/20'
              }`}
            >
              {code[i] ?? ''}
            </div>
          ))}
        </div>

        {/* Clavier numérique */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
          {TOUCHES.map((t, i) => (
            <button
              key={i}
              onClick={() => ajouterChiffre(t)}
              disabled={t === '' || isPending}
              className={`h-14 rounded-2xl text-xl font-semibold transition-all active:scale-95 ${
                t === '⌫'
                  ? 'bg-white/10 text-white/70 hover:bg-white/20'
                  : t === ''
                  ? 'invisible'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {t === '⌫' ? <Delete size={20} className="mx-auto" /> : t}
            </button>
          ))}
        </div>

        {/* Bouton valider */}
        <button
          onClick={valider}
          disabled={code.length !== 6 || isPending}
          className="w-full max-w-xs py-4 rounded-2xl bg-gold-500 hover:bg-gold-400 text-dark font-semibold text-base transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isPending
            ? <><Loader2 size={18} className="animate-spin" /> Verification...</>
            : 'Valider le code'
          }
        </button>
      </div>
    </div>
  )
}
