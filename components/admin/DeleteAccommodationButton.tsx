'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Trash2, Loader2 } from 'lucide-react'
import { deleteAccommodation } from '@/actions/accommodations'

export default function DeleteAccommodationButton({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    const result = await deleteAccommodation(id)
    setLoading(false)
    if (result.success) {
      toast.success('Hébergement supprimé')
      router.push('/admin/hebergements')
    } else {
      toast.error((result as any).error || 'Erreur lors de la suppression')
      setOpen(false)
      setInput('')
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
      >
        <Trash2 size={14} /> Supprimer l'hébergement
      </button>
    )
  }

  return (
    <div className="max-w-3xl mt-6 p-4 bg-red-50 border border-red-300 rounded-2xl space-y-3">
      <p className="text-sm font-semibold text-red-800">⚠️ Suppression définitive de « {name} »</p>
      <p className="text-xs text-red-600">
        Cette action est irréversible. Les réservations liées seront conservées mais l'hébergement sera supprimé.
        Tapez <span className="font-mono font-bold">SUPPRIMER</span> pour confirmer.
      </p>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="SUPPRIMER"
        className="input-field text-sm font-mono"
      />
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          disabled={input !== 'SUPPRIMER' || loading}
          className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          Supprimer définitivement
        </button>
        <button
          onClick={() => { setOpen(false); setInput('') }}
          className="py-2 px-4 border border-beige-200 rounded-xl text-sm text-dark/50"
        >
          Annuler
        </button>
      </div>
    </div>
  )
}
