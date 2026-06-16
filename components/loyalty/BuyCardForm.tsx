'use client'

import { useState } from 'react'
import type { LoyaltyProgram, LoyaltyCard } from '@/types/loyalty'
import { createLoyaltyCardPending } from '@/actions/loyalty'
import LoyaltyCardDisplay from './LoyaltyCardDisplay'

const ORANGE_MONEY_NUMBER = '693407964'

interface Props {
  program: LoyaltyProgram
  partenaireId: string
  onCancel: () => void
}

type Step = 'niveau' | 'form' | 'payment' | 'processing' | 'done'

export default function BuyCardForm({ program, partenaireId, onCancel }: Props) {
  const hasNiveaux = program.niveaux && program.niveaux.length > 0
  const [step, setStep] = useState<Step>(hasNiveaux ? 'niveau' : 'form')
  const [selectedNiveauId, setSelectedNiveauId] = useState<string | null>(null)
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')
  const [error, setError] = useState('')
  const [card, setCard] = useState<LoyaltyCard | null>(null)

  const niveauChoisi = program.niveaux.find((n) => n.id === selectedNiveauId) ?? null
  const prixAchat = niveauChoisi?.prix_fcfa ?? program.prix_fcfa

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setStep('payment')
  }

  const handleConfirmPayment = async () => {
    setStep('processing')
    setError('')

    const result = await createLoyaltyCardPending({
      program_id: program.program_id,
      client_email: email,
      client_nom: nom,
      client_prenom: prenom,
      client_phone: telephone,
      montant_achat: prixAchat,
      niveau_choisi: selectedNiveauId ?? program.niveaux[0]?.id,
    })

    if (result.success && result.card_id) {
      // Sauvegarder en localStorage pour récupération future
      if (typeof window !== 'undefined') {
        localStorage.setItem('loyalty_card_id', result.card_id)
        localStorage.setItem('loyalty_card_program', program.program_id)
      }

      const expiresAt = new Date(
        Date.now() + program.duree_validite_mois * 30 * 24 * 60 * 60 * 1000
      )
      setCard({
        card_id: result.card_id,
        program_id: program.program_id,
        programme_nom: program.nom,
        partenaire_id: partenaireId,
        client_id: `guest_${Date.now()}`,
        client_email: email,
        client_nom: nom,
        client_prenom: prenom,
        client_phone: telephone,
        niveau_actuel: selectedNiveauId ?? program.niveaux[0]?.id ?? 'bronze',
        niveau_initial: selectedNiveauId ?? program.niveaux[0]?.id ?? 'bronze',
        points_cumules: 0,
        nombre_utilisations: 0,
        qr_code_data: `loyalty://${result.card_id}`,
        commission_lui_percent: program.commission_lui_percent,
        commission_partner_percent: program.commission_partner_percent,
        created_at: new Date(),
        expires_at: expiresAt,
        statut: 'PENDING',
        montant_achat: prixAchat,
        prix_achat_fcfa: prixAchat,
        updated_at: new Date(),
      })
      setStep('done')
    } else {
      setError(result.error ?? 'Erreur lors de la création de la carte')
      setStep('payment')
    }
  }

  // ── ÉTAPE 0 : Sélection du niveau ────────────────────────────────────────────
  if (step === 'niveau') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-[#1A1A1A] text-base">🎫 Choisissez votre niveau</h4>
          <button
            type="button"
            onClick={onCancel}
            className="text-[#1A1A1A]/40 hover:text-[#1A1A1A] text-sm"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {program.niveaux.map((niveau) => {
            const prixNiveau = niveau.prix_fcfa ?? program.prix_fcfa
            return (
              <button
                key={niveau.id}
                onClick={() => {
                  setSelectedNiveauId(niveau.id)
                  setStep('form')
                }}
                className="p-4 rounded-xl border-2 border-[#C9A84C]/30 bg-[#F9F5F2] hover:border-[#C9A84C] hover:bg-[#FDF8F0] transition-all text-left space-y-2"
              >
                <div className="text-3xl">{niveau.emoji}</div>
                <div className="font-semibold text-[#1A1A1A] text-sm">{niveau.nom}</div>
                <div className="text-[#C9A84C] font-bold text-base">
                  {prixNiveau.toLocaleString('fr-FR')} FCFA
                </div>
                <div className="text-[#1A1A1A]/40 text-xs">
                  1 pt = {(program.taux_fcfa_par_point ?? 10000).toLocaleString('fr-FR')} FCFA
                </div>
                {niveau.avantages?.length > 0 && (
                  <div className="text-[#1A1A1A]/40 text-xs border-t border-[#C9A84C]/20 pt-2">
                    {niveau.avantages.length} avantage{niveau.avantages.length > 1 ? 's' : ''}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── ÉTAPE 1 : Formulaire ─────────────────────────────────────────────────────
  if (step === 'form') {
    return (
      <form onSubmit={handleSubmitForm} className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-[#1A1A1A] text-base">Vos informations</h4>
          {hasNiveaux && niveauChoisi && (
            <button
              type="button"
              onClick={() => { setStep('niveau'); setError('') }}
              className="text-[#C9A84C] text-xs hover:underline"
            >
              ← Changer de niveau
            </button>
          )}
        </div>

        {niveauChoisi && (
          <div className="bg-[#FDF8F0] border border-[#C9A84C]/30 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">{niveauChoisi.emoji}</span>
            <div>
              <p className="font-semibold text-[#1A1A1A] text-sm">{niveauChoisi.nom}</p>
              <p className="text-[#C9A84C] font-bold text-sm">
                {prixAchat.toLocaleString('fr-FR')} FCFA
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[#1A1A1A]/70 text-sm mb-1">Prénom *</label>
            <input
              type="text"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              required
              placeholder="Marie"
              className="w-full border border-[#DDD] rounded-xl px-4 py-2.5 text-[#1A1A1A] focus:outline-none focus:border-[#C9A84C]"
            />
          </div>
          <div>
            <label className="block text-[#1A1A1A]/70 text-sm mb-1">Nom *</label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
              placeholder="Dupont"
              className="w-full border border-[#DDD] rounded-xl px-4 py-2.5 text-[#1A1A1A] focus:outline-none focus:border-[#C9A84C]"
            />
          </div>
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

        <div>
          <label className="block text-[#1A1A1A]/70 text-sm mb-1">Téléphone *</label>
          <input
            type="tel"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            required
            placeholder="+237 6XX XXX XXX"
            className="w-full border border-[#DDD] rounded-xl px-4 py-2.5 text-[#1A1A1A] focus:outline-none focus:border-[#C9A84C]"
          />
        </div>

        <div className="bg-[#F9F5F2] rounded-xl p-4 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-[#1A1A1A]/70">Montant à régler</span>
            <span className="text-[#C9A84C] font-bold text-xl">
              {prixAchat.toLocaleString('fr-FR')} FCFA
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
                  {prixAchat.toLocaleString('fr-FR')} FCFA
                </strong>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#C9A84C]">3.</span>
              <span>Confirmez avec votre code PIN Orange Money</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#C9A84C]">4.</span>
              <span>Revenez ici et cliquez <strong>«&nbsp;J&apos;ai payé&nbsp;»</strong></span>
            </li>
          </ol>
        </div>

        <div className="bg-[#F9F5F2] rounded-xl p-4 text-sm space-y-1.5 border border-[#DDD]">
          <div className="flex justify-between">
            <span className="text-[#1A1A1A]/60">Client</span>
            <span className="font-medium text-[#1A1A1A]">{prenom} {nom}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#1A1A1A]/60">Téléphone</span>
            <span className="font-medium text-[#1A1A1A]">{telephone}</span>
          </div>
          <div className="flex justify-between border-t border-[#DDD] pt-2 mt-1">
            <span className="text-[#1A1A1A]/60">Montant</span>
            <span className="font-bold text-[#C9A84C]">
              {prixAchat.toLocaleString('fr-FR')} FCFA
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
            ✅ J&apos;ai payé — Soumettre ma demande
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
        <p className="font-semibold text-[#1A1A1A]">Envoi de votre demande…</p>
        <p className="text-sm text-[#1A1A1A]/50">Ne fermez pas cette page.</p>
      </div>
    )
  }

  // ── ÉTAPE 4 : Carte en attente ───────────────────────────────────────────────
  if (step === 'done' && card) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm">
          <p className="text-blue-800 font-semibold">📨 Demande envoyée avec succès !</p>
          <p className="text-blue-700 text-xs mt-1">
            L&apos;admin va vérifier votre paiement Orange Money et activer votre carte sous 24h.
            Un email vous sera envoyé à <strong>{email}</strong> à l&apos;activation.
          </p>
        </div>
        <LoyaltyCardDisplay card={card} program={program} />
      </div>
    )
  }

  return null
}
