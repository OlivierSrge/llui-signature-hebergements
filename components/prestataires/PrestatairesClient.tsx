'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Star, MapPin, ChevronRight, ShieldCheck, Sparkles } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

export interface Prestataire {
  id: string
  nom: string
  slogan: string
  categorie: string
  contact: { localisation?: string }
  services: { prix: number }[]
  portfolio: { url: string }[]
  note_moyenne: number
  nb_avis: number
  certifie: boolean
  mis_en_avant: boolean
}

const CATEGORIES = [
  { id: 'tous', label: 'Tous', emoji: '✨' },
  { id: 'restauration', label: 'Restauration', emoji: '🍽️' },
  { id: 'photo_video', label: 'Photo & Vidéo', emoji: '📸' },
  { id: 'decoration', label: 'Décoration', emoji: '🌸' },
  { id: 'son_animation', label: 'Son & Animation', emoji: '🎵' },
  { id: 'beaute_bienetre', label: 'Beauté', emoji: '💄' },
  { id: 'experiences', label: 'Expériences', emoji: '🌊' },
  { id: 'mariage_evenements', label: 'Mariage', emoji: '💍' },
]

function Stars({ note }: { note: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={11}
          className={i <= Math.round(note) ? 'fill-[#C9A84C] text-[#C9A84C]' : 'text-[#1A1A1A]/20'}
        />
      ))}
    </div>
  )
}

export default function PrestatairesClient({ prestataires: initial }: { prestataires: Prestataire[] }) {
  const [filter, setFilter] = useState('tous')

  const filtered = filter === 'tous'
    ? initial
    : initial.filter((p) => p.categorie === filter)

  const prixMin = (p: Prestataire) =>
    p.services.length > 0 ? Math.min(...p.services.map((s) => s.prix)) : null

  return (
    <div>
      {/* ── Filtres ── */}
      <div className="sticky top-0 z-10 bg-[#F5F0E8] border-b border-[#1A1A1A]/8 py-3 px-4 overflow-x-auto">
        <div className="flex gap-2 w-max mx-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm whitespace-nowrap font-medium transition-all"
              style={
                filter === cat.id
                  ? { background: '#C9A84C', color: '#1A1A1A', border: '1px solid #C9A84C' }
                  : { background: 'transparent', color: 'rgba(26,26,26,0.55)', border: '1px solid rgba(26,26,26,0.15)' }
              }
            >
              {cat.emoji && <span>{cat.emoji}</span>}
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grille ── */}
      <section className="px-4 py-8 max-w-5xl mx-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-[#1A1A1A]/50 text-sm mb-4">
              Aucun prestataire dans cette catégorie pour l&apos;instant.
            </p>
            <Link
              href="/rejoindre-reseau"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm"
              style={{ background: '#C9A84C', color: '#1A1A1A' }}
            >
              Vous êtes prestataire ? Rejoindre le réseau →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {filtered.map((p) => {
              const prix = prixMin(p)
              const photo = p.portfolio?.[0]?.url
              return (
                <Link
                  key={p.id}
                  href={`/prestataires/${p.id}`}
                  className="group rounded-2xl overflow-hidden border transition-shadow hover:shadow-md"
                  style={{ background: '#fff', borderColor: 'rgba(26,26,26,0.08)' }}
                >
                  {/* Photo */}
                  <div
                    className="relative h-32 sm:h-40 w-full flex items-center justify-center overflow-hidden"
                    style={{ background: 'rgba(201,168,76,0.1)' }}
                  >
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt={p.nom} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl opacity-40">
                        {CATEGORIES.find((c) => c.id === p.categorie)?.emoji ?? '🤝'}
                      </span>
                    )}
                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {p.mis_en_avant && (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#C9A84C', color: '#1A1A1A' }}>
                          <Sparkles size={9} /> Mis en avant
                        </span>
                      )}
                      {p.certifie && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/90 text-[#085041]">
                          <ShieldCheck size={9} /> Certifié
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contenu */}
                  <div className="p-3">
                    {p.note_moyenne > 0 && (
                      <div className="flex items-center gap-1 mb-1">
                        <Stars note={p.note_moyenne} />
                        <span className="text-[10px] text-[#1A1A1A]/50">({p.nb_avis})</span>
                      </div>
                    )}
                    <h3 className="font-semibold text-[#1A1A1A] text-sm leading-tight line-clamp-1">{p.nom}</h3>
                    <p className="text-[10px] text-[#1A1A1A]/50 mt-0.5 capitalize">
                      {CATEGORIES.find((c) => c.id === p.categorie)?.label ?? p.categorie}
                      {p.contact?.localisation && <> · {p.contact.localisation}</>}
                    </p>
                    {prix !== null && (
                      <p className="text-xs font-medium mt-1.5" style={{ color: '#C9A84C' }}>
                        À partir de {formatPrice(prix)}
                      </p>
                    )}
                    <div className="flex items-center justify-end mt-2">
                      <span className="text-xs font-medium text-[#C9A84C] flex items-center gap-0.5 group-hover:gap-1.5 transition-all">
                        Voir la fiche <ChevronRight size={12} />
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
