'use client'

import { useState } from 'react'
import type { LoyaltyProgram, LoyaltyCard } from '@/types/loyalty'
import { createLoyaltyCardAfterPurchase } from '@/actions/loyalty'
import LoyaltyCardDisplay from './LoyaltyCardDisplay'

interface Props {
  program: LoyaltyProgram
  partenaireId: string
  onCancel: () => void
}

export default function BuyCardForm({ program, partenaireId, onCancel }: Props) {
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [card, setCard] = useState<LoyaltyCard | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await createLoyaltyCardAfterPurchase({
      program_id: program.program_id,
      client_id: `guest_${Date.now()}`,
      client_email: email,
      client_nom: nom,
      montant_achat: program.prix_fcfa,
      order_id: `LOYALTY_${program.program_id}_${Date.now()}`,
    })

    if (result.success && result.card_id) {
      // Construire un objet LoyaltyCard pour l'affichage
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
    } else {
      setError(result.error ?? 'Erreur lors de la création de la carte')
    }
    setLoading(false)
  }

  if (card) {
    return (
      <div className="space-y-4">
        <div className="text-center mb-2">
          <p className="text-[#22C55E] font-semibold text-lg">Bienvenue dans le programme !</p>
          <p className="text-[#1A1A1A]/60 text-sm mt-1">
            Votre carte est active. Présentez-la à chaque visite pour cumuler des points.
          </p>
        </div>
        <LoyaltyCardDisplay card={card} program={program} />
        {email && (
          <p className="text-center text-xs text-[#1A1A1A]/50">
            Un email de confirmation a été envoyé à <strong>{email}</strong>
          </p>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h4 className="font-semibold text-[#1A1A1A] text-base">
        Finaliser votre inscription
      </h4>

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
      </div>

      <div className="bg-[#F9F5F2] rounded-xl p-4 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-[#1A1A1A]/70">Montant à régler</span>
          <span className="text-[#C9A84C] font-bold text-lg">
            {program.prix_fcfa.toLocaleString('fr-FR')} FCFA
          </span>
        </div>
        <p className="text-[#1A1A1A]/50 text-xs mt-1">
          Validité : {program.duree_validite_mois} mois
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-[#C9A84C] hover:bg-[#D4AF37] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition"
        >
          {loading ? 'Traitement...' : 'Confirmer l\'achat'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-3 border border-[#DDD] rounded-xl text-[#1A1A1A]/60 hover:bg-[#F9F5F2] transition"
        >
          Annuler
        </button>
      </div>

      <p className="text-xs text-[#1A1A1A]/40 text-center">
        Paiement Orange Money · Sécurisé
      </p>
    </form>
  )
}
