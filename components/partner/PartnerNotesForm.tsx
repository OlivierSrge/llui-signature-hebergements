'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { StickyNote, Save } from 'lucide-react'
import { savePartnerNotes } from '@/actions/partner-reservations'

interface Props {
  reservationId: string
  initialNotes: string
}

export default function PartnerNotesForm({ reservationId, initialNotes }: Props) {
  const [notes, setNotes] = useState(initialNotes)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const handleSave = async () => {
    setSaving(true)
    const result = await savePartnerNotes(reservationId, notes)
    setSaving(false)
    if (result.success) {
      toast.success('Notes sauvegardées')
      router.refresh()
    } else {
      toast.error(result.error || 'Erreur lors de la sauvegarde')
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-beige-200 p-5 space-y-3">
      <h2 className="font-semibold text-dark text-sm flex items-center gap-2">
        <StickyNote size={14} className="text-gold-500" /> Notes internes
      </h2>
      <p className="text-xs text-dark/40">
        Visibles uniquement par vous et l&apos;admin. Non communiquées au client.
      </p>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        className="input-field text-sm resize-none"
        placeholder="Remarques internes sur ce séjour..."
      />
      <button
        onClick={handleSave}
        disabled={saving || notes === initialNotes}
        className="flex items-center gap-2 px-4 py-2 bg-dark text-white rounded-xl text-xs font-medium hover:bg-dark/80 disabled:opacity-40 transition-colors"
      >
        <Save size={12} />
        {saving ? 'Sauvegarde...' : 'Sauvegarder les notes'}
      </button>
    </div>
  )
}
