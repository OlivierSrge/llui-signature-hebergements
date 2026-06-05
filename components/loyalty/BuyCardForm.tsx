'use client'

import { useState } from 'react'
import type { LoyaltyProgram, LoyaltyCard } from '@/types/loyalty'
import { createLoyaltyCardAfterPurchase } from '@/actions/loyalty'
import LoyaltyCardDisplay from './LoyaltyCardDisplay'

const ORANGE_MONEY_NUMBER = '693407964'

interface Props {
  program: LoyaltyProgram
  partenaireId: string
  onCancel: () => void
}

type Step = 'form' | 'payment' | 'processing' | 'done'

export default function BuyCardForm({ program, partenaireId, onCancel }: Props) {
  const [step, setStep] = useState<Step>('form')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [card, setCard] = useState<LoyaltyCard | null>(null)

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setStep('payment')
  }

  const handleConfirmPayment = async () => {
    setStep('processing')
    setError('')

    console.log('🔄 [Loyalty] Création carte après paiement confirmé...')

    const result = await createLoyaltyCardAfterPurchase({
      program_id: program.program_id,
      client_id: `guest_${Date.now()}`,
      client_email: email,
      client_nom: nom,
      montant_achat: program.prix_fcfa,
      order_id: `LOYALTY_${program.program_id}_${Date.now()}`,
    })

    console.log('✅ [Loyalty] Résultat:', result)

    if (result.success && result.card_id) {
      console.log(`📧 [Loyalty] Email envoyé à ${email} — lien: /loyalty/card/${result.card_id}`)
      const expiresAt = new Date(
        Date.now() + program.duree_validite_mois * 30 * 24 * 60 * 60 * 1000
      )
      setCard({
        card_id: result.card_id,
        program_id: program.program_id,
        partenaire_id: partenaireId,
        client_id: `guest_${Date.now()}`,
        client_email: email,
        client_nom: nom,
        niveau_actuel: program.niveaux[0]?.id ?? 'bronze',
        points_cumules: 0,
        nombre_utilisations: 0,
        qr_code_data: `loyalty://${result.card_id}`,
        commission_lui_percent: program.commission_lui_percent,
        commission_partner_percent: program.commission_partner_percent,
        created_at: new Date(),
        expires_at: expiresAt,
        statut: 'ACTIVE',
        montant_achat: program.prix_fcfa,
        updated_at: new Date(),
      })
      setStep('done')
    } else {
      console.error('❌ [Loyalty] Erreur:', result.error)
      setError(result.error ?? 'Erreur lors de la création de la carte')
      setStep('payment')
    }
  }

  // ── ÉTAPE 1 : Formulaire ─────────────────────────────────────────────────────
  if (step === 'form') {
    return (
      <form onSubmit={handleSubmitForm} className="space-y-4">
        <h4 className="font-semibold text-[#1A1A1A] text-base">Vos informations</h4>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-[#1A1A1A]/70 text-sm mb-1">Prénom &amp; Nom *</label>
          <input
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            required
            placeholder="Ex : Marie Dupont"
            className="w-full border border-[#DDD] rounded-xl px-4 py-2.5 text-[#1A1A1A] focus:outline-none focus:border-[#C9A84C]"
          />
        </div>

        <div>
          <label className="block text-[#1A1A1A]/70 text-sm mb-1">Adresse email *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="votre@email.com"
            className="w-full border border-[#DDD] rounded-xl px-4 py-2.5 text-[#1A1A1A] focus:outline-none focus:border-[#C9A84C]"
          />
          <p className="text-xs text-[#1A1A1A]/40 mt-1">
            Le lien vers votre carte sera envoyé à cette adresse.
          </p>
        </div>

        <div className="bg-[#F9F5F2] rounded-xl p-4 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-[#1A1A1A]/70">Montant à régler</span>
            <span className="text-[#C9A84C] font-bold text-xl">
              {program.prix_fcfa.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
          <p className="text-[#1A1A1A]/40 text-xs mt-1">
            Validité : {program.duree_validite_mois} mois
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 bg-[#C9A84C] hover:bg-[#D4AF37] text-white font-semibold py-3 rounded-xl transition text-sm"
          >
            Continuer vers le paiement →
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-3 border border-[#DDD] rounded-xl text-[#1A1A1A]/50 hover:bg-[#F9F5F2] transition text-sm"
          >
            Annuler
          </button>
        </div>
      </form>
    )
  }

  // ── ÉTAPE 2 : Paiement Orange Money ──────────────────────────────────────────
  if (step === 'payment') {
    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-[#1A1A1A] text-base">Paiement Orange Money</h4>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
          <p className="font-semibold text-[#333] text-sm">📱 Instructions Orange Money</p>
          <ol className="space-y-2 text-sm text-[#555]">
            <li className="flex gap-2">
              <span className="font-bold text-[#C9A84C]">1.</span>
              <span>
                Composez{' '}
                <span className="font-mono bg-white border border-orange-200 px-2 py-0.5 rounded text-xs">
                  #150*{ORANGE_MONEY_NUMBER}#
                </span>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#C9A84C]">2.</span>
              <span>
                Entrez le montant :{' '}
                <strong className="text-[#C9A84C]">
                  {program.prix_fcfa.toLocaleString('fr-FR')} FCFA
                </strong>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#C9A84C]">3.</span>
              <span>Confirmez avec votre code PIN Orange Money</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#C9A84C]">4.</span>
              <span>Revenez ici et cliquez <strong>«&nbsp;Confirmer le paiement&nbsp;»</strong></span>
            </li>
          </ol>
        </div>

        {/* Récap commande */}
        <div className="bg-[#F9F5F2] rounded-xl p-4 text-sm space-y-1.5 border border-[#DDD]">
          <div className="flex justify-between">
            <span className="text-[#1A1A1A]/60">Client</span>
            <span className="font-medium text-[#1A1A1A]">{nom}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#1A1A1A]/60">Email</span>
            <span className="font-medium text-[#1A1A1A]">{email}</span>
          </div>
          <div className="flex justify-between border-t border-[#DDD] pt-2 mt-1">
            <span className="text-[#1A1A1A]/60">Montant</span>
            <span className="font-bold text-[#C9A84C]">
              {program.prix_fcfa.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#1A1A1A]/60">Bénéficiaire</span>
            <span className="font-mono font-bold text-[#1A1A1A]">{ORANGE_MONEY_NUMBER}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleConfirmPayment}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition text-sm"
          >
            ✅ Confirmer le paiement
          </button>
          <button
            onClick={() => { setError(''); setStep('form') }}
            className="px-5 py-3 border border-[#DDD] rounded-xl text-[#1A1A1A]/50 hover:bg-[#F9F5F2] transition text-sm"
          >
            ← Retour
          </button>
        </div>

        <p className="text-xs text-[#1A1A1A]/30 text-center">Orange Money · Paiement sécurisé</p>
      </div>
    )
  }

  // ── ÉTAPE 3 : Traitement ─────────────────────────────────────────────────────
  if (step === 'processing') {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="text-4xl animate-pulse">⏳</div>
        <p className="font-semibold text-[#1A1A1A]">Génération de votre carte…</p>
        <p className="text-sm text-[#1A1A1A]/50">Ne fermez pas cette page.</p>
      </div>
    )
  }

  // ── ÉTAPE 4 : Carte prête ────────────────────────────────────────────────────
  if (step === 'done' && card) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm">
          <p className="text-green-800 font-semibold">✅ Paiement confirmé — votre carte est prête !</p>
          <p className="text-green-700 text-xs mt-1">
            Un email contenant le lien permanent vers votre carte a été envoyé à{' '}
            <strong>{email}</strong>
          </p>
        </div>
        <LoyaltyCardDisplay card={card} program={program} />
      </div>
    )
  }

  return null
}
