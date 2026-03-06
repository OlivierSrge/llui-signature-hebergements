'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { User, Phone, Mail, CalendarDays, Users, MessageSquare, Send, CheckCircle } from 'lucide-react'
import { createAvailabilityRequest } from '@/actions/availability-requests'

interface Props {
  packId: string
  packName: string
}

export default function PackRequestForm({ packId, packName }: Props) {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      toast.error('Veuillez remplir les champs obligatoires')
      return
    }
    setLoading(true)
    const result = await createAvailabilityRequest({
      product_type: 'pack',
      product_id: packId,
      product_name: packName,
      guest_first_name: firstName,
      guest_last_name: lastName,
      guest_phone: phone,
      guest_email: email,
      check_in: checkIn,
      check_out: checkOut,
      guests: Number(guests) || 1,
      message,
    })
    setLoading(false)
    if (!result.success) { toast.error(result.error); return }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="bg-white rounded-2xl shadow-card-hover border border-beige-200 p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-green-600" />
        </div>
        <h3 className="font-serif text-xl font-semibold text-dark mb-2">Demande envoyée !</h3>
        <p className="text-dark/60 text-sm leading-relaxed">
          Notre équipe va étudier votre demande et vous recontactera par WhatsApp dans les plus brefs délais.
        </p>
        <p className="text-xs text-dark/40 mt-4">Aucun paiement demandé à ce stade.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-card-hover border border-beige-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-beige-200 bg-dark">
        <h3 className="font-serif text-lg font-semibold text-white">Demander ce pack</h3>
        <p className="text-white/50 text-xs mt-1">Confirmation par WhatsApp — aucun paiement immédiat</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Prénom <span className="text-red-500">*</span></label>
            <div className="relative">
              <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/30" />
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required placeholder="Jean" className="input-field pl-9 text-sm" />
            </div>
          </div>
          <div>
            <label className="label">Nom <span className="text-red-500">*</span></label>
            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required placeholder="Dupont" className="input-field text-sm" />
          </div>
        </div>

        <div>
          <label className="label">Téléphone / WhatsApp <span className="text-red-500">*</span></label>
          <div className="relative">
            <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/30" />
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+237 6XX XXX XXX" className="input-field pl-9 text-sm" />
          </div>
        </div>

        <div>
          <label className="label">Email</label>
          <div className="relative">
            <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/30" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@exemple.com" className="input-field pl-9 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Date arrivée</label>
            <div className="relative">
              <CalendarDays size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/30" />
              <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="input-field pl-9 text-sm" />
            </div>
          </div>
          <div>
            <label className="label">Date départ</label>
            <div className="relative">
              <CalendarDays size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/30" />
              <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="input-field pl-9 text-sm" />
            </div>
          </div>
        </div>

        <div>
          <label className="label">Nombre de personnes</label>
          <div className="relative">
            <Users size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/30" />
            <input type="number" min="1" value={guests} onChange={(e) => setGuests(e.target.value)} placeholder="ex: 20" className="input-field pl-9 text-sm" />
          </div>
        </div>

        <div>
          <label className="label">Message</label>
          <div className="relative">
            <MessageSquare size={13} className="absolute left-3 top-3.5 text-dark/30" />
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Décrivez votre événement, besoins spéciaux..." className="input-field pl-9 text-sm resize-none" />
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full btn-primary py-3.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? (
            <span className="flex items-center gap-2"><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />Envoi...</span>
          ) : <><Send size={15} /> Envoyer ma demande</>}
        </button>
        <p className="text-center text-xs text-dark/40">Aucun engagement · Réponse par WhatsApp</p>
      </form>
    </div>
  )
}
