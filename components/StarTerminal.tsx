'use client'
// components/StarTerminal.tsx — Terminal partenaire : Encaisser Stars + Réduction Stars

import { useState, useEffect, useRef } from 'react'
import { getClientFidelite } from '@/actions/stars'
import type { ClientFidelite, SpendTransaction } from '@/actions/stars'
import type { ParametresPlateforme } from '@/actions/parametres'
import {
  getMembershipStatus,
  getRemisePct,
  getMultiplier,
  calculateStars,
  calculateRemiseAmount,
  canUseTransaction,
  MEMBERSHIP_LABELS,
  STATUS_ICONS,
} from '@/lib/loyaltyEngine'

interface ProcessTransactionResult {
  success: boolean
  transactionId?: string
  message?: string
  montant_net?: number
  stars_gagnees?: number
  remise_appliquee?: number
  error?: string
}

interface Props {
  codeSession: string
  partnerId: string
  soldeProvision: number
  params: ParametresPlateforme
  onSuccess?: (result: ProcessTransactionResult) => void
}

type Step = 'phone' | 'montant' | 'confirming' | 'done' | 'error'
type TerminalMode = 'earn' | 'spend'

function formatFr(n: number): string {
  return n.toLocaleString('fr-FR')
}

export default function StarTerminal({ codeSession, partnerId, soldeProvision, params, onSuccess }: Props) {
  // ── Earn states ─────────────────────────────────────────────
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [montantStr, setMontantStr] = useState('')
  const [client, setClient] = useState<ClientFidelite | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [result, setResult] = useState<ProcessTransactionResult | null>(null)

  // ── Spend states ─────────────────────────────────────────────
  const [terminalMode, setTerminalMode] = useState<TerminalMode>('earn')
  const [pendingSpend, setPendingSpend] = useState<(SpendTransaction & { client_points: number }) | null>(null)
  const [spendLoading, setSpendLoading] = useState(false)
  const [spendFeedback, setSpendFeedback] = useState('')
  const [countdown, setCountdown] = useState(0)

  // ── Refs for polling/countdown cleanup ───────────────────────
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  // ── Polling (5s) when in spend mode ─────────────────────────
  useEffect(() => {
    if (terminalMode !== 'spend' || !partnerId) return

    const fetchPending = async () => {
      try {
        const res = await fetch(`/api/stars/poll-spend?partnerId=${encodeURIComponent(partnerId)}`)
        const data = await res.json() as { success: boolean; transactions?: (SpendTransaction & { client_points: number })[] }
        if (data.success && data.transactions && data.transactions.length > 0) {
          setPendingSpend(data.transactions[0])
        } else {
          setPendingSpend(null)
        }
      } catch { /* non bloquant */ }
    }

    fetchPending()
    pollRef.current = setInterval(fetchPending, 5000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [terminalMode, partnerId])

  // ── Countdown on pending spend ───────────────────────────────
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current)
    if (!pendingSpend) { setCountdown(0); return }

    const update = () => {
      const remaining = Math.max(0, Math.floor((new Date(pendingSpend.expires_at).getTime() - Date.now()) / 1000))
      setCountdown(remaining)
    }
    update()
    countdownRef.current = setInterval(update, 1000)
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [pendingSpend])

  // ── Earn computed values ─────────────────────────────────────
  const valeurStar = params.fidelite_valeur_star_fcfa ?? 1
  const thresholds = {
    seuil_novice: params.fidelite_seuil_novice ?? 0,
    seuil_explorateur: params.fidelite_seuil_explorateur ?? 25000,
    seuil_ambassadeur: params.fidelite_seuil_ambassadeur ?? 75000,
    seuil_excellence: params.fidelite_seuil_excellence ?? 150000,
  }
  const montantBrut = parseFloat(montantStr.replace(/\s/g, '').replace(',', '.')) || 0
  const clientStatus = client ? getMembershipStatus(client.total_stars_historique, thresholds) : 'novice'
  const remisePct = client
    ? getRemisePct(clientStatus, {
        remise_argent_pct: params.fidelite_remise_argent_pct ?? 5,
        remise_or_pct: params.fidelite_remise_or_pct ?? 10,
        remise_platine_pct: params.fidelite_remise_platine_pct ?? 20,
      })
    : 0
  const multiplier = client
    ? getMultiplier(clientStatus, {
        multiplicateur_argent: params.fidelite_multiplicateur_argent ?? 1,
        multiplicateur_or: params.fidelite_multiplicateur_or ?? 1.5,
        multiplicateur_platine: params.fidelite_multiplicateur_platine ?? 2,
      })
    : 1
  const remiseAmount = calculateRemiseAmount(montantBrut, remisePct)
  const montantNet = montantBrut - remiseAmount
  const starsGagnees = calculateStars(montantNet, remisePct, multiplier)
  const provisionOk = canUseTransaction(soldeProvision, starsGagnees, valeurStar)

  // ── Handlers earn ────────────────────────────────────────────
  async function handleLookupClient() {
    if (!phone.trim()) return
    setLoading(true)
    setErrorMsg('')
    const found = await getClientFidelite(phone.trim())
    setLoading(false)
    if (!found) {
      setErrorMsg("Client non trouvé ou non vérifié. Demandez-lui de scanner le QR code et de s'inscrire.")
      return
    }
    setClient(found)
    setStep('montant')
  }

  async function handleSubmit() {
    if (!client || montantBrut <= 0) return
    setStep('confirming')
    setErrorMsg('')
    try {
      const response = await fetch('/api/stars/process-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code_session: codeSession,
          montant_brut: montantBrut,
          telephone_client: phone.trim(),
        }),
      })
      const res: ProcessTransactionResult = await response.json()
      if (res.success) {
        setResult(res)
        setStep('done')
        onSuccess?.(res)
      } else {
        setErrorMsg(res.error ?? 'Erreur lors de la transaction')
        setStep('montant')
      }
    } catch {
      setErrorMsg('Erreur réseau — réessayez')
      setStep('montant')
    }
  }

  function reset() {
    setStep('phone')
    setPhone('')
    setMontantStr('')
    setClient(null)
    setErrorMsg('')
    setResult(null)
  }

  // ── Handlers spend ────────────────────────────────────────────
  async function handleConfirmSpend() {
    if (!pendingSpend) return
    setSpendLoading(true)
    setSpendFeedback('')
    try {
      const res = await fetch('/api/stars/confirm-spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: pendingSpend.id,
          partnerId,
          clientTel: pendingSpend.client_id,
        }),
      })
      const data = await res.json() as { success: boolean; reductionFcfa?: number; error?: string }
      if (data.success) {
        setSpendFeedback(`✅ Réduction de ${formatFr(data.reductionFcfa ?? 0)} FCFA confirmée !`)
        setPendingSpend(null)
      } else {
        setSpendFeedback(`❌ ${data.error ?? 'Erreur lors de la confirmation'}`)
      }
    } catch {
      setSpendFeedback('❌ Erreur réseau — réessayez')
    }
    setSpendLoading(false)
  }

  async function handleCancelSpend() {
    if (!pendingSpend) return
    setSpendLoading(true)
    setSpendFeedback('')
    try {
      const res = await fetch('/api/stars/cancel-spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: pendingSpend.id,
          reason: 'Refusé par le partenaire',
        }),
      })
      const data = await res.json() as { success: boolean; error?: string }
      if (data.success) {
        setSpendFeedback('Demande annulée.')
        setPendingSpend(null)
      } else {
        setSpendFeedback(`❌ ${data.error ?? 'Erreur'}`)
      }
    } catch {
      setSpendFeedback('❌ Erreur réseau — réessayez')
    }
    setSpendLoading(false)
  }

  return (
    <div className="space-y-4">

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <div className="flex rounded-xl overflow-hidden border border-[#F5F0E8]">
        <button
          onClick={() => setTerminalMode('earn')}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
            terminalMode === 'earn'
              ? 'bg-[#1A1A1A] text-white'
              : 'bg-white text-[#1A1A1A]/50 hover:bg-[#F5F0E8]'
          }`}
        >
          ⭐ Encaisser
        </button>
        <button
          onClick={() => { setTerminalMode('spend'); setSpendFeedback('') }}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
            terminalMode === 'spend'
              ? 'bg-[#C9A84C] text-white'
              : 'bg-white text-[#1A1A1A]/50 hover:bg-[#F5F0E8]'
          }`}
        >
          🎁 Réduction Stars
        </button>
      </div>

      {/* ── Mode Encaisser ─────────────────────────────────────── */}
      {terminalMode === 'earn' && (
        <>
          {/* Provision indicator */}
          <div className={`rounded-xl px-4 py-3 flex items-center justify-between text-sm ${
            soldeProvision > 0
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            <span className={soldeProvision > 0 ? 'text-green-700' : 'text-red-700'}>
              {soldeProvision > 0 ? '✅ Provision disponible' : '⚠️ Provision insuffisante'}
            </span>
            <span className={`font-bold text-xs ${soldeProvision > 0 ? 'text-green-800' : 'text-red-800'}`}>
              {formatFr(soldeProvision)} FCFA
            </span>
          </div>

          {/* Étape 1 : Téléphone */}
          {step === 'phone' && (
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
              <p className="text-sm font-semibold text-[#1A1A1A]">📱 Téléphone du client</p>
              <p className="text-xs text-[#1A1A1A]/50">Saisissez le numéro WhatsApp vérifié du client.</p>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleLookupClient()}
                placeholder="Ex : 6 XX XX XX XX"
                className="w-full border border-[#F5F0E8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]"
              />
              {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}
              <button
                onClick={handleLookupClient}
                disabled={loading || !phone.trim()}
                className="w-full py-3 bg-[#1A1A1A] text-white text-sm font-semibold rounded-xl disabled:opacity-50 hover:bg-[#333] transition-colors"
              >
                {loading ? 'Recherche...' : '🔍 Rechercher le client'}
              </button>
            </div>
          )}

          {/* Étape 2 : Montant + calcul */}
          {step === 'montant' && client && (
            <>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#F5F0E8] flex items-center justify-center text-lg">
                    {STATUS_ICONS[clientStatus]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A]">{client.telephone}</p>
                    <p className="text-xs text-[#1A1A1A]/50">
                      {MEMBERSHIP_LABELS[clientStatus]} · {formatFr(client.points_stars)} ⭐
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
                <p className="text-sm font-semibold text-[#1A1A1A]">💰 Montant de la transaction</p>
                <input
                  type="number"
                  value={montantStr}
                  onChange={(e) => setMontantStr(e.target.value)}
                  placeholder="Ex : 25000"
                  min={0}
                  className="w-full border border-[#F5F0E8] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]"
                />

                {montantBrut > 0 && (
                  <div className="bg-[#F5F0E8]/60 rounded-xl p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#1A1A1A]/60">Montant brut</span>
                      <span className="font-medium">{formatFr(montantBrut)} FCFA</span>
                    </div>
                    {remiseAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-[#1A1A1A]/60">Remise {remisePct}%</span>
                        <span className="font-medium text-green-700">−{formatFr(remiseAmount)} FCFA</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-[#1A1A1A]/10 pt-1.5">
                      <span className="text-[#1A1A1A]/60">Montant net</span>
                      <span className="font-semibold">{formatFr(montantNet)} FCFA</span>
                    </div>
                    <div className="flex justify-between border-t border-[#C9A84C]/30 pt-1.5 mt-1">
                      <span className="text-[#1A1A1A]/70 font-semibold">Stars à attribuer</span>
                      <span className="font-bold text-[#C9A84C]">+{starsGagnees} ⭐</span>
                    </div>
                    {multiplier > 1 && (
                      <p className="text-[10px] text-[#C9A84C]/70 text-right">×{multiplier} (bonus niveau)</p>
                    )}
                    {!provisionOk && montantBrut > 0 && (
                      <p className="text-[10px] text-red-600 font-semibold pt-1">
                        ⚠️ Provision insuffisante ({formatFr(starsGagnees * valeurStar)} FCFA requis)
                      </p>
                    )}
                  </div>
                )}

                {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}

                <div className="flex gap-2">
                  <button
                    onClick={reset}
                    className="flex-1 py-2.5 border border-[#1A1A1A]/10 text-[#1A1A1A]/50 text-sm rounded-xl hover:bg-[#F5F0E8] transition-colors"
                  >
                    ← Retour
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={montantBrut <= 0 || !provisionOk || loading}
                    className="flex-2 flex-grow py-2.5 bg-[#C9A84C] text-white text-sm font-semibold rounded-xl disabled:opacity-50 hover:bg-[#b8963e] transition-colors"
                  >
                    ✅ Envoyer le lien
                  </button>
                </div>
              </div>
            </>
          )}

          {step === 'confirming' && (
            <div className="bg-white rounded-2xl p-8 shadow-sm text-center space-y-3">
              <div className="w-10 h-10 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-[#1A1A1A]/60">Envoi du lien WhatsApp au client...</p>
            </div>
          )}

          {step === 'done' && result && (
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
              <div className="text-center space-y-1">
                <div className="text-4xl">⭐</div>
                <p className="text-lg font-bold text-[#1A1A1A]">+{result.stars_gagnees} Stars</p>
                <p className="text-xs text-[#1A1A1A]/50">Lien de confirmation envoyé sur WhatsApp</p>
              </div>
              <div className="bg-[#F5F0E8]/60 rounded-xl p-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#1A1A1A]/60">Montant net</span>
                  <span className="font-medium">{formatFr(result.montant_net ?? 0)} FCFA</span>
                </div>
                {(result.remise_appliquee ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#1A1A1A]/60">Remise</span>
                    <span className="font-medium text-green-700">−{formatFr(result.remise_appliquee ?? 0)} FCFA</span>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-[#1A1A1A]/40 text-center">
                Le client doit confirmer via le lien WhatsApp reçu pour créditer ses Stars.
              </p>
              <button
                onClick={reset}
                className="w-full py-2.5 bg-[#1A1A1A] text-white text-sm font-semibold rounded-xl hover:bg-[#333] transition-colors"
              >
                + Nouvelle transaction
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Mode Réduction Stars ───────────────────────────────── */}
      {terminalMode === 'spend' && (
        <div className="space-y-3">
          {spendFeedback && (
            <div className={`rounded-xl px-4 py-3 text-sm text-center font-medium ${
              spendFeedback.startsWith('✅')
                ? 'bg-green-50 border border-green-200 text-green-700'
                : spendFeedback.startsWith('❌')
                  ? 'bg-red-50 border border-red-200 text-red-700'
                  : 'bg-[#F5F0E8] text-[#1A1A1A]/60'
            }`}>
              {spendFeedback}
            </div>
          )}

          {!pendingSpend ? (
            <div className="bg-white rounded-2xl p-8 shadow-sm text-center space-y-3">
              <div className="w-10 h-10 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-semibold text-[#1A1A1A]">En attente d&apos;une demande de réduction</p>
              <p className="text-xs text-[#1A1A1A]/40">
                Le client envoie sa demande depuis la page séjour.<br />
                Actualisation automatique toutes les 5 secondes.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-[#1A1A1A]">🎁 Demande de réduction</p>
                <span className={`text-xs font-mono px-2 py-1 rounded-lg ${
                  countdown > 120 ? 'bg-green-100 text-green-700' :
                  countdown > 30 ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                </span>
              </div>

              <div className="bg-[#F5F0E8]/60 rounded-xl p-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#1A1A1A]/60">Client</span>
                  <span className="font-medium font-mono">{pendingSpend.client_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#1A1A1A]/60">Solde client</span>
                  <span className="font-medium">{formatFr(pendingSpend.client_points)} ⭐</span>
                </div>
                <div className="flex justify-between border-t border-[#1A1A1A]/10 pt-1.5">
                  <span className="text-[#1A1A1A]/60">Stars à utiliser</span>
                  <span className="font-semibold text-[#C9A84C]">{formatFr(pendingSpend.points_used)} ⭐</span>
                </div>
                <div className="flex justify-between border-t border-[#C9A84C]/30 pt-1.5">
                  <span className="text-[#1A1A1A]/70 font-bold">Réduction accordée</span>
                  <span className="font-bold text-green-700 text-sm">{formatFr(pendingSpend.reduction_fcfa)} FCFA</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCancelSpend}
                  disabled={spendLoading}
                  className="flex-1 py-2.5 border border-red-200 text-red-500 text-sm font-semibold rounded-xl disabled:opacity-50 hover:bg-red-50 transition-colors"
                >
                  ✕ Refuser
                </button>
                <button
                  onClick={handleConfirmSpend}
                  disabled={spendLoading}
                  className="flex-2 flex-grow py-2.5 bg-[#C9A84C] text-white text-sm font-semibold rounded-xl disabled:opacity-50 hover:bg-[#b8963e] transition-colors"
                >
                  {spendLoading ? 'Traitement...' : '✅ Confirmer la réduction'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
