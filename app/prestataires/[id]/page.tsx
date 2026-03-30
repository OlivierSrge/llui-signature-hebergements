export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MapPin, Star, ShieldCheck } from 'lucide-react'
import { getDb } from '@/lib/firebase'
import FicheClient from '@/components/prestataires/FicheClient'

const CAT_LABELS: Record<string, string> = {
  restauration: 'Restauration',
  photo_video: 'Photo & Vidéo',
  decoration: 'Décoration',
  son_animation: 'Son & Animation',
  beaute_bienetre: 'Beauté & Bien-être',
  experiences: 'Expériences',
  mariage_evenements: 'Mariage & Événements',
}

async function getPrestataire(id: string) {
  try {
    const db = getDb()
    const doc = await db.collection('prestataires').doc(id).get()
    if (!doc.exists) return null
    const data = doc.data()!
    return {
      id: doc.id,
      nom: data.nom ?? '',
      slogan: data.slogan ?? '',
      categorie: data.categorie ?? '',
      description: data.description ?? '',
      contact: data.contact ?? {},
      services: data.services ?? [],
      portfolio: data.portfolio ?? [],
      avis: (data.avis ?? []).map((a: any) => ({
        ...a,
        date: a.date?.toDate ? a.date.toDate().toISOString() : a.date ?? null,
      })),
      photo_principale: data.photo_principale ?? '',
      logo_url: data.logo_url ?? '',
      note_moyenne: data.note_moyenne ?? 0,
      nb_avis: data.nb_avis ?? 0,
      certifie: data.certifie ?? false,
      mis_en_avant: data.mis_en_avant ?? false,
      commission_taux: data.commission_taux ?? 10,
      statut: data.statut ?? 'actif',
    }
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const p = await getPrestataire(params.id)
  if (!p) return {}
  return {
    title: `${p.nom} — ${CAT_LABELS[p.categorie] ?? p.categorie} | L&Lui Signature`,
    description: p.description || `Prestataire certifié à Kribi — ${CAT_LABELS[p.categorie] ?? p.categorie}`,
  }
}

export default async function FichePrestatairePage({ params }: { params: { id: string } }) {
  const p = await getPrestataire(params.id)
  if (!p || p.statut !== 'actif') notFound()

  const prixMin = p.services.length > 0 ? Math.min(...p.services.map((s: any) => s.prix)) : null

  return (
    <div className="min-h-screen" style={{ background: '#F5F0E8' }}>
      {/* ── En-tête hero ── */}
      <section className="px-4 pt-10 pb-8" style={{ background: '#1A1A1A' }}>
        <div className="max-w-2xl mx-auto">
          {/* Fil d'Ariane */}
          <div className="flex items-center gap-2 text-sm text-white/40 mb-6">
            <Link href="/" className="hover:text-white/70 transition-colors">L&amp;Lui</Link>
            <span>/</span>
            <Link href="/prestataires" className="hover:text-white/70 transition-colors">Prestataires</Link>
            <span>/</span>
            <span className="text-white/70">{p.nom}</span>
          </div>

          {/* Photo principale */}
          {(p.photo_principale || p.portfolio?.[0]?.url) && (
            <div className="relative h-56 sm:h-72 rounded-2xl overflow-hidden mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.photo_principale || p.portfolio[0].url}
                alt={p.nom}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              {/* Logo overlay */}
              {p.logo_url && (
                <div className="absolute bottom-3 left-3 w-12 h-12 rounded-xl overflow-hidden bg-white/90 shadow-lg border border-white/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.logo_url} alt={`Logo ${p.nom}`} className="w-full h-full object-contain p-1.5" />
                </div>
              )}
            </div>
          )}

          {/* Badge + titre */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(201,168,76,0.2)', color: '#C9A84C' }}>
              {CAT_LABELS[p.categorie] ?? p.categorie}
            </span>
            {p.certifie && (
              <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 text-white">
                <ShieldCheck size={11} /> Certifié L&amp;Lui
              </span>
            )}
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white mb-1">{p.nom}</h1>
          {p.slogan && <p className="text-white/60 text-sm italic mb-3">&ldquo;{p.slogan}&rdquo;</p>}

          {/* Infos */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {p.note_moyenne > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} size={12} className={i <= Math.round(p.note_moyenne) ? 'fill-[#C9A84C] text-[#C9A84C]' : 'text-white/20'} />
                  ))}
                </div>
                <span className="text-white font-semibold">{p.note_moyenne.toFixed(1)}</span>
                <span className="text-white/40">({p.nb_avis} avis)</span>
              </div>
            )}
            {p.contact?.localisation && (
              <div className="flex items-center gap-1 text-white/50">
                <MapPin size={12} className="text-[#C9A84C]" />
                {p.contact.localisation}
              </div>
            )}
            {prixMin !== null && (
              <span className="font-semibold" style={{ color: '#C9A84C' }}>
                À partir de {prixMin.toLocaleString('fr-FR')} FCFA
              </span>
            )}
          </div>

          {/* Description */}
          {p.description && (
            <p className="text-white/65 text-sm leading-relaxed mt-4 max-w-xl">{p.description}</p>
          )}
        </div>
      </section>

      {/* ── Sections client (services, portfolio, avis, CTA) ── */}
      <FicheClient prestataire={p} />
    </div>
  )
}
