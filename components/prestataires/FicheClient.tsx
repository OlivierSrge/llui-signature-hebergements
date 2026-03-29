'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Phone, Star, MapPin, X, ChevronRight, ShieldCheck, Maximize2 } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface Service {
  id: string
  titre: string
  description: string
  prix: number
  unite: string
  disponible: boolean
}

interface Avis {
  auteur: string
  note: number
  commentaire: string
  date: string
}

interface Prestataire {
  id: string
  nom: string
  slogan: string
  categorie: string
  description: string
  contact: { telephone: string; whatsapp: string; localisation: string; email?: string }
  services: Service[]
  portfolio: { url: string; legende: string; type: string }[]
  avis: Avis[]
  note_moyenne: number
  nb_avis: number
  certifie: boolean
  commission_taux: number
}

const CAT_LABELS: Record<string, string> = {
  restauration: 'Restauration',
  photo_video: 'Photo & Vidéo',
  decoration: 'Décoration',
  son_animation: 'Son & Animation',
  beaute_bienetre: 'Beauté & Bien-être',
  experiences: 'Expériences',
  mariage_evenements: 'Mariage & Événements',
}

const UNITE_LABELS: Record<string, string> = {
  forfait: 'forfait',
  heure: '/h',
  journee: '/journée',
  personne: '/personne',
  piece: '/pièce',
}

function Stars({ note, size = 14 }: { note: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= Math.round(note) ? 'fill-[#C9A84C] text-[#C9A84C]' : 'text-[#1A1A1A]/20'} />
      ))}
    </div>
  )
}

export default function FicheClient({ prestataire }: { prestataire: Prestataire }) {
  const [bookingOpen, setBookingOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [form, setForm] = useState({ prenom: '', telephone: '', date: '', notes: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { setMounted(true) }, [])

  const openBooking = (service: Service) => {
    setSelectedService(service)
    setBookingOpen(true)
    setSent(false)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.prenom || !form.telephone || !selectedService) return
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/prestataires/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prestataire_id: prestataire.id,
          prestataire_nom: prestataire.nom,
          prestataire_whatsapp: prestataire.contact.whatsapp,
          service_id: selectedService.id,
          service_titre: selectedService.titre,
          service_prix: selectedService.prix,
          client_prenom: form.prenom,
          client_telephone: form.telephone,
          date_prestation: form.date || null,
          notes: form.notes,
          source: 'site',
          commission_taux: prestataire.commission_taux,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setSent(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const whatsappUrl = `https://wa.me/${prestataire.contact.whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(`Bonjour, j'ai trouvé votre profil sur L&Lui Signature et je souhaite en savoir plus sur vos services.`)}`

  const Modal = bookingOpen && (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center px-0 sm:px-4" style={{ animation: 'fadeIn 0.15s ease' }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setBookingOpen(false)} />
      <div
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 overflow-y-auto"
        style={{ background: '#fff', maxHeight: '90vh', animation: 'slideUp 0.2s ease' }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-serif text-lg font-semibold text-[#1A1A1A]">Demander une réservation</h3>
            {selectedService && (
              <p className="text-sm text-[#1A1A1A]/60 mt-0.5">{selectedService.titre} · {formatPrice(selectedService.prix)}</p>
            )}
          </div>
          <button onClick={() => setBookingOpen(false)} className="w-8 h-8 rounded-full bg-[#1A1A1A]/8 flex items-center justify-center">
            <X size={15} className="text-[#1A1A1A]/60" />
          </button>
        </div>

        {sent ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">✅</div>
            <h4 className="font-serif text-lg font-semibold text-[#1A1A1A] mb-2">Demande envoyée !</h4>
            <p className="text-sm text-[#1A1A1A]/60 leading-relaxed">
              <strong>{prestataire.nom}</strong> vous contactera sur WhatsApp très rapidement.
            </p>
            <button onClick={() => setBookingOpen(false)} className="mt-5 w-full py-3 rounded-xl text-sm font-semibold" style={{ background: '#C9A84C', color: '#1A1A1A' }}>
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Service */}
            <div>
              <label className="block text-xs font-semibold text-[#1A1A1A]/60 mb-1.5 uppercase tracking-wide">Service souhaité</label>
              <select
                value={selectedService?.id ?? ''}
                onChange={(e) => setSelectedService(prestataire.services.find((s) => s.id === e.target.value) ?? null)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#1A1A1A]/15 text-sm bg-[#F5F0E8] focus:outline-none focus:border-[#C9A84C]"
              >
                {prestataire.services.filter((s) => s.disponible).map((s) => (
                  <option key={s.id} value={s.id}>{s.titre} — {formatPrice(s.prix)}</option>
                ))}
              </select>
            </div>
            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-[#1A1A1A]/60 mb-1.5 uppercase tracking-wide">Date souhaitée</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-[#1A1A1A]/15 text-sm bg-[#F5F0E8] focus:outline-none focus:border-[#C9A84C]"
              />
            </div>
            {/* Prénom */}
            <div>
              <label className="block text-xs font-semibold text-[#1A1A1A]/60 mb-1.5 uppercase tracking-wide">Votre prénom *</label>
              <input
                required
                value={form.prenom}
                onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))}
                placeholder="Votre prénom"
                className="w-full px-3 py-2.5 rounded-xl border border-[#1A1A1A]/15 text-sm bg-[#F5F0E8] focus:outline-none focus:border-[#C9A84C]"
              />
            </div>
            {/* Téléphone */}
            <div>
              <label className="block text-xs font-semibold text-[#1A1A1A]/60 mb-1.5 uppercase tracking-wide">WhatsApp *</label>
              <input
                required
                type="tel"
                value={form.telephone}
                onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))}
                placeholder="+237 6XX XXX XXX"
                className="w-full px-3 py-2.5 rounded-xl border border-[#1A1A1A]/15 text-sm bg-[#F5F0E8] focus:outline-none focus:border-[#C9A84C]"
              />
            </div>
            {/* Message */}
            <div>
              <label className="block text-xs font-semibold text-[#1A1A1A]/60 mb-1.5 uppercase tracking-wide">Message (optionnel)</label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Précisions sur votre demande..."
                className="w-full px-3 py-2.5 rounded-xl border border-[#1A1A1A]/15 text-sm bg-[#F5F0E8] focus:outline-none focus:border-[#C9A84C] resize-none"
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={sending}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ background: '#C9A84C', color: '#1A1A1A' }}
            >
              {sending ? 'Envoi en cours...' : 'Envoyer ma demande →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )

  const Lightbox = lightboxUrl && (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90" onClick={() => setLightboxUrl(null)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={lightboxUrl} alt="" className="max-w-full max-h-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
      <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white" onClick={() => setLightboxUrl(null)}>
        <X size={18} />
      </button>
    </div>
  )

  return (
    <>
      {/* ── Bouton WhatsApp flottant ── */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg font-semibold text-sm"
        style={{ background: '#25D366', color: '#fff' }}
      >
        <Phone size={16} />
        WhatsApp direct
      </a>

      {/* ── Services ── */}
      <section className="px-4 py-8" style={{ background: '#F5F0E8' }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="font-serif text-2xl font-semibold text-[#1A1A1A] mb-1">Services & Tarifs</h2>
          <div className="h-0.5 w-12 mb-6" style={{ background: '#C9A84C' }} />
          <div className="flex flex-col gap-4">
            {prestataire.services.map((s) => (
              <div key={s.id} className="bg-white rounded-2xl p-4 border border-[#1A1A1A]/8 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-[#1A1A1A] text-base leading-snug">{s.titre}</h3>
                  {s.description && <p className="text-sm text-[#1A1A1A]/55 mt-1">{s.description}</p>}
                  <p className="font-bold mt-2" style={{ color: '#C9A84C' }}>
                    {formatPrice(s.prix)}{s.unite !== 'forfait' ? <span className="font-normal text-[#1A1A1A]/50"> {UNITE_LABELS[s.unite] ?? s.unite}</span> : null}
                  </p>
                </div>
                {s.disponible && (
                  <button
                    onClick={() => openBooking(s)}
                    className="flex-shrink-0 flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                    style={{ background: '#C9A84C', color: '#1A1A1A' }}
                  >
                    Réserver <ChevronRight size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Portfolio ── */}
      {prestataire.portfolio.length > 0 && (
        <section className="px-4 py-8" style={{ background: '#fff' }}>
          <div className="max-w-2xl mx-auto">
            <h2 className="font-serif text-2xl font-semibold text-[#1A1A1A] mb-1">Portfolio</h2>
            <div className="h-0.5 w-12 mb-6" style={{ background: '#C9A84C' }} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {prestataire.portfolio.map((item, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxUrl(item.url)}
                  className="relative aspect-square rounded-xl overflow-hidden group"
                  style={{ background: 'rgba(201,168,76,0.1)' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt={item.legende || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Maximize2 size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Avis ── */}
      {prestataire.avis && prestataire.avis.length > 0 && (
        <section className="px-4 py-8" style={{ background: '#F5F0E8' }}>
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="font-serif text-2xl font-semibold text-[#1A1A1A]">Avis clients</h2>
              <div className="flex items-center gap-1.5">
                <Stars note={prestataire.note_moyenne} />
                <span className="font-bold text-[#1A1A1A]">{prestataire.note_moyenne.toFixed(1)}</span>
                <span className="text-[#1A1A1A]/40 text-sm">({prestataire.nb_avis})</span>
              </div>
            </div>
            <div className="h-0.5 w-12 mb-6" style={{ background: '#C9A84C' }} />
            <div className="flex flex-col gap-3">
              {prestataire.avis.slice(0, 5).map((a, i) => (
                <div key={i} className="bg-white rounded-xl p-4 border border-[#1A1A1A]/8">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm text-[#1A1A1A]">{a.auteur}</span>
                    <Stars note={a.note} size={11} />
                  </div>
                  <p className="text-sm text-[#1A1A1A]/70 leading-relaxed">{a.commentaire}</p>
                  {a.date && (
                    <p className="text-[10px] text-[#1A1A1A]/40 mt-1.5">
                      {new Date(a.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA final ── */}
      <section className="px-4 py-10 text-center" style={{ background: '#1A1A1A' }}>
        <div className="max-w-md mx-auto">
          {prestataire.certifie && (
            <div className="flex items-center justify-center gap-2 mb-3 text-[#C9A84C]">
              <ShieldCheck size={16} />
              <span className="text-sm font-medium">Certifié L&amp;Lui Signature</span>
            </div>
          )}
          <h3 className="font-serif text-xl font-semibold text-white mb-4">
            Intéressé par {prestataire.nom} ?
          </h3>
          <button
            onClick={() => prestataire.services[0] && openBooking(prestataire.services[0])}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl font-semibold text-base transition-opacity hover:opacity-80"
            style={{ background: '#C9A84C', color: '#1A1A1A' }}
          >
            Demander une réservation →
          </button>
          <p className="text-white/30 text-xs mt-3">Réponse garantie sous 24h</p>
        </div>
      </section>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>

      {mounted && Modal && createPortal(Modal, document.body)}
      {mounted && Lightbox && createPortal(Lightbox, document.body)}
    </>
  )
}
