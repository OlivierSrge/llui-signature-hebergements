'use client'
// app/stars/client/[token]/ClientScanView.tsx
// Vue partenaire : profil client + formulaire de transaction après scan QR.

import { useState, useEffect } from 'react'
import type { QrClientData } from '@/actions/stars-qr-token'
import type { ParametresPlateforme } from '@/actions/parametres'
import { calculateStars, calculateRemiseAmount } from '@/lib/loyaltyEngine'

interface Props {
  token: string
  clientData: QrClientData
  expiresAt: string
  params: ParametresPlateforme
}

type Step = 'form' | 'confirming' | 'done' | 'expired'

function fmt(n: number) { return n.toLocaleString('fr-FR') }

export default function ClientScanView({ token, clientData, expiresAt, params }: Props) {
  const [step, setStep] = useState<Step>('form')
  const [codePartenaire, setCodePartenaire] = useState('')
  const [montantStr, setMontantStr] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [resultStars, setResultStars] = useState(0)
  const [resultNet, setResultNet] = useState(0)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    const tick = () => {
      const secs = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
      setCountdown(secs)
      if (secs === 0) setStep('expired')
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [expiresAt])

  const montantBrut = parseFloat(montantStr.replace(/\s/g, '').replace(',', '.')) || 0
  const remiseAmount = calculateRemiseAmount(montantBrut, clientData.remise_pct)
  const montantNet = montantBrut - remiseAmount
  const starsGagnees = calculateStars(montantNet, clientData.remise_pct, clientData.multiplier)

  async function handleSubmit() {
    if (!codePartenaire.trim() || montantBrut <= 0) return
    setStep('confirming')
    setErrorMsg('')

    try {
      const res = await fetch('/api/stars/qr-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_token: token,
          montant_brut: montantBrut,
          code_promo_affilie: codePartenaire.trim().toUpperCase(),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setResultStars(data.stars_gagnees)
        setResultNet(data.montant_net)
        setStep('done')
      } else {
        setErrorMsg(data.error ?? 'Erreur lors du traitement')
        setStep('form')
      }
    } catch {
      setErrorMsg('Erreur réseau — réessayez')
      setStep('form')
    }
  }

  if (step === 'expired') {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-sm space-y-4">
          <div className="text-5xl">⏰</div>
          <h1 className="text-lg font-semibold text-[#1A1A1A]">QR Code expiré</h1>
          <p className="text-xs text-[#1A1A1A]/40">
            Demandez au client de générer un nouveau QR Code depuis son dashboard.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] px-4 py-8">
      <div className="max-w-sm mx-auto space-y-4">

        {/* Header */}
        <div className="text-center">
          <p className="text-xs font-medium text-[#C9A84C] uppercase tracking-widest mb-1">L&Lui Stars ⭐</p>
          <h1 className="text-lg font-serif font-semibold text-[#1A1A1A]">Encaissement client</h1>
        </div>

        {/* Client card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#F5F0E8] flex items-center justify-center text-2xl shrink-0">
              {clientData.membershipIcon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#1A1A1A] font-mono text-sm truncate">{clientData.telephone}</p>
              <p className="text-xs text-[#1A1A1A]/50 mt-0.5">{clientData.membershipLabel}</p>
              <p className="text-xs font-bold text-[#C9A84C] mt-0.5">{fmt(clientData.points_stars)} ⭐</p>
            </div>
            <div className={`text-xs font-mono px-2 py-1 rounded-lg shrink-0 ${
              countdown > 120 ? 'bg-green-100 text-green-700' :
              countdown > 30  ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
            </div>
          </div>
          {clientData.remise_pct > 0 && (
            <div className="mt-3 bg-[#F5F0E8]/60 rounded-xl px-3 py-2 text-xs text-[#C9A84C] font-semibold text-center">
              🎁 Remise fidélité {clientData.remise_pct}% · ×{clientData.multiplier} multiplicateur
            </div>
          )}
        </div>

        {/* Formulaire */}
        {(step === 'form' || step === 'confirming') && (
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">

            <div>
              <label className="text-xs font-medium text-[#1A1A1A]/60 block mb-1.5">Votre code partenaire</label>
              <input
                type="text"
                value={codePartenaire}
                onChange={e => setCodePartenaire(e.target.value.toUpperCase())}
                placeholder="Ex : MAMINDOR-2026"
                disabled={step === 'confirming'}
                className="w-full border border-[#F5F0E8] rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-[#C9A84C] disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#1A1A1A]/60 block mb-1.5">Montant de la transaction (FCFA)</label>
              <input
                type="number"
                value={montantStr}
                onChange={e => setMontantStr(e.target.value)}
                placeholder="Ex : 25 000"
                min={0}
                disabled={step === 'confirming'}
                className="w-full border border-[#F5F0E8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C] disabled:opacity-50"
              />
            </div>

            {montantBrut > 0 && (
              <div className="bg-[#F5F0E8]/60 rounded-xl p-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#1A1A1A]/60">Montant brut</span>
                  <span className="font-medium">{fmt(montantBrut)} FCFA</span>
                </div>
                {remiseAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#1A1A1A]/60">Remise {clientData.remise_pct}%</span>
                    <span className="font-medium text-green-700">−{fmt(remiseAmount)} FCFA</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-[#1A1A1A]/10 pt-1.5">
                  <span className="text-[#1A1A1A]/60">Montant net</span>
                  <span className="font-semibold">{fmt(montantNet)} FCFA</span>
                </div>
                <div className="flex justify-between border-t border-[#C9A84C]/30 pt-1.5">
                  <span className="text-[#1A1A1A]/70 font-semibold">Stars à attribuer</span>
                  <span className="font-bold text-[#C9A84C]">+{fmt(starsGagnees)} ⭐</span>
                </div>
                {clientData.multiplier > 1 && (
                  <p className="text-[10px] text-[#C9A84C]/70 text-right">×{clientData.multiplier} bonus niveau</p>
                )}
              </div>
            )}

            {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}

            <button
              onClick={handleSubmit}
              disabled={step === 'confirming' || !codePartenaire.trim() || montantBrut <= 0}
              className="w-full py-3 bg-[#C9A84C] text-white text-sm font-semibold rounded-xl disabled:opacity-50 hover:bg-[#b8963e] transition-colors flex items-center justify-center gap-2"
            >
              {step === 'confirming'
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Traitement...</>
                : '✅ Valider la transaction'}
            </button>

            <p className="text-[10px] text-[#1A1A1A]/40 text-center">
              Un lien de confirmation sera envoyé au client par WhatsApp.
            </p>
          </div>
        )}

        {/* Succès */}
        {step === 'done' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center space-y-4">
            <div className="text-5xl animate-bounce">⭐</div>
            <p className="text-2xl font-bold text-[#C9A84C]">+{fmt(resultStars)} Stars</p>
            <p className="text-sm font-semibold text-[#1A1A1A]">en attente de confirmation client</p>
            <div className="bg-[#F5F0E8]/60 rounded-xl px-4 py-3 text-xs text-center">
              <p className="text-[#1A1A1A]/60">Montant net</p>
              <p className="font-bold text-[#1A1A1A] text-base">{fmt(resultNet)} FCFA</p>
            </div>
            <p className="text-[10px] text-[#1A1A1A]/40">
              Le client doit confirmer via le lien WhatsApp reçu.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
