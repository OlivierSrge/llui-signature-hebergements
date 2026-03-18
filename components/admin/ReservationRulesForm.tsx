'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { Loader2, Save, Shield } from 'lucide-react'
import { saveReservationRules } from '@/actions/reservation-source'
import type { ReservationRules } from '@/lib/reservationRules'

interface Props {
  initialRules: ReservationRules
}

export default function ReservationRulesForm({ initialRules }: Props) {
  const [rules, setRules] = useState<ReservationRules>(initialRules)
  const [saving, setSaving] = useState(false)

  const set = (key: keyof ReservationRules, value: number) =>
    setRules((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    const result = await saveReservationRules(rules)
    setSaving(false)
    if (result.success) toast.success('Règles sauvegardées')
    else toast.error(result.error || 'Erreur lors de la sauvegarde')
  }

  return (
    <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-5">
      <div className="flex items-center gap-2 mb-2">
        <Shield size={18} className="text-gold-500" />
        <h2 className="font-semibold text-dark">Règles de réservation</h2>
      </div>

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
        Ces valeurs s'appliquent à toutes les réservations QR Code partenaire. Elles protègent la trésorerie L&Lui Signature.
      </div>

      {/* Seuil d'escalade */}
      <div>
        <label className="block text-sm font-medium text-dark mb-1">
          Seuil d'escalade automatique (FCFA)
        </label>
        <p className="text-xs text-dark/50 mb-2">
          Toute réservation QR Code dépassant ce montant est automatiquement basculée en Flux L&Lui (traitement admin uniquement).
        </p>
        <input
          type="number"
          min={0}
          step={5000}
          value={rules.seuilEscaladeAdmin}
          onChange={(e) => set('seuilEscaladeAdmin', Number(e.target.value))}
          className="input-field"
          placeholder="100000"
        />
      </div>

      {/* Fenêtre admin */}
      <div>
        <label className="block text-sm font-medium text-dark mb-1">
          Durée de la fenêtre admin prioritaire (minutes)
        </label>
        <p className="text-xs text-dark/50 mb-2">
          Après réception d'une réservation QR Code, l'admin dispose de ce délai pour reprendre la main avant que le partenaire soit notifié.
        </p>
        <input
          type="number"
          min={5}
          max={1440}
          step={5}
          value={rules.fenetreAdminMinutes}
          onChange={(e) => set('fenetreAdminMinutes', Number(e.target.value))}
          className="input-field"
          placeholder="120"
        />
      </div>

      {/* Pourcentage acompte */}
      <div>
        <label className="block text-sm font-medium text-dark mb-1">
          Pourcentage acompte L&Lui sur QR Code (%)
        </label>
        <p className="text-xs text-dark/50 mb-2">
          Part du montant total encaissée par L&Lui Signature avant que le partenaire puisse traiter la réservation.
        </p>
        <div className="relative">
          <input
            type="number"
            min={0}
            max={100}
            step={5}
            value={Math.round(rules.acompteLluiPercent * 100)}
            onChange={(e) => set('acompteLluiPercent', Number(e.target.value) / 100)}
            className="input-field pr-8"
            placeholder="30"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-dark/40 text-sm">%</span>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary flex items-center gap-2"
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
        Sauvegarder les règles
      </button>
    </div>
  )
}
