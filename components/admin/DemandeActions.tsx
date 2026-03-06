'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { markRequestCancelled } from '@/actions/availability-requests'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export default function DemandeActions({ demandeId }: { demandeId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleCancel = async () => {
    if (!confirm('Annuler cette demande ?')) return
    setLoading(true)
    const result = await markRequestCancelled(demandeId)
    setLoading(false)
    if (!result.success) { toast.error(result.error || 'Erreur'); return }
    toast.success('Demande annulée')
    router.refresh()
  }

  return (
    <button
      onClick={handleCancel}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-500 rounded-xl text-xs font-medium hover:bg-red-50 disabled:opacity-50 whitespace-nowrap"
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
      Annuler
    </button>
  )
}
