'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { User, Mail, Phone, CalendarDays, Users, MessageSquare, Loader2 } from 'lucide-react'
import { requestPack } from '@/actions/packs'

interface Props {
  packName: string
}

export default function PackRequestForm({ packName }: Props) {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.set('pack_name', packName)

    const result = await requestPack(formData)
    setLoading(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }
    setSent(true)
    toast.success('Votre demande a bien été envoyée !')
  }

  if (sent) {
    return (
      <div className="bg-white rounded-2xl shadow-card-hover border border-beige-200 p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✓</span>
        </div>
        <h3 className="font-serif text-xl font-semibold text-dark mb-2">Demande envoyée !</h3>
        <p className="text-dark/60 text-sm leading-relaxed">
          Notre équipe vous contactera dans les 24 heures pour vous proposer un devis personnalisé.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-card-hover border border-beige-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-beige-200 bg-dark">
        <h3 className="font-serif text-lg font-semibold text-white">Demander ce pack</h3>
        <p className="text-white/50 text-xs mt-1">Réponse sous 24h</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Prénom <span className="text-red-500">*</span></label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/30" />
              <input name="first_name" type="text" required placeholder="Amina" className="input-field pl-9 text-sm" />
            </div>
          </div>
          <div>
            <label className="label">Nom <span className="text-red-500">*</span></label>
            <input name="last_name" type="text" required placeholder="Ngono" className="input-field text-sm" />
          </div>
        </div>

        <div>
          <label className="label">Email <span className="text-red-500">*</span></label>
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/30" />
            <input name="email" type="email" required placeholder="amina@exemple.cm" className="input-field pl-9 text-sm" />
          </div>
        </div>

        <div>
          <label className="label">Téléphone <span className="text-red-500">*</span></label>
          <div className="relative">
            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/30" />
            <input name="phone" type="tel" required placeholder="+237 6XX XXX XXX" className="input-field pl-9 text-sm" />
          </div>
        </div>

        <div>
          <label className="label">Date de l&apos;événement</label>
          <div className="relative">
            <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/30" />
            <input name="event_date" type="date" className="input-field pl-9 text-sm" />
          </div>
        </div>

        <div>
          <label className="label">Nombre de personnes</label>
          <div className="relative">
            <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/30" />
            <input name="guests" type="number" min="1" placeholder="ex: 20" className="input-field pl-9 text-sm" />
          </div>
        </div>

        <div>
          <label className="label">Message</label>
          <div className="relative">
            <MessageSquare size={14} className="absolute left-3 top-3.5 text-dark/30" />
            <textarea name="message" rows={3} placeholder="Décrivez votre événement..." className="input-field pl-9 text-sm resize-none" />
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full btn-primary py-3.5 text-sm font-semibold disabled:opacity-50">
          {loading ? (
            <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" />Envoi en cours...</span>
          ) : 'Envoyer ma demande'}
        </button>

        <p className="text-center text-xs text-dark/40">Aucun engagement · Devis gratuit</p>
      </form>
    </div>
  )
}
