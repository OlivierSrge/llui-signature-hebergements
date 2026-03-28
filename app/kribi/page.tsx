export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Thermometer, ShoppingBag, Phone } from 'lucide-react'
import { db } from '@/lib/firebase'
import { resolveImageUrl, formatPrice } from '@/lib/utils'
import KribiClient from '@/components/kribi/KribiClient'
import KribiRevenir from '@/components/kribi/KribiRevenir'
import KribiScanTracker from '@/components/kribi/KribiScanTracker'

export const metadata: Metadata = {
  title: 'Que faire à Kribi ce weekend ? | L&Lui Signature',
  description:
    'Activités, événements et hébergements premium à Kribi ce weekend. Sélection L&Lui Signature.',
  openGraph: {
    title: 'Que faire à Kribi ce weekend ?',
    description: 'Activités, événements et hébergements à Kribi. Sélection L&Lui Signature.',
  },
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getWeekendRange() {
  const now = new Date()
  const day = now.getDay()
  const saturday = new Date(now)
  if (day === 6) { /* today is saturday */ }
  else if (day === 0) { saturday.setDate(now.getDate() - 1) }
  else { saturday.setDate(now.getDate() + (6 - day)) }
  saturday.setHours(0, 0, 0, 0)

  const sunday = new Date(saturday)
  sunday.setDate(saturday.getDate() + 1)
  sunday.setHours(23, 59, 59, 999)

  const fmt = (d: Date) =>
    d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const fmtShort = (d: Date) =>
    d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return {
    start: saturday,
    end: sunday,
    label: `${fmtShort(saturday)} & ${fmtShort(sunday)} ${saturday.getFullYear()}`,
  }
}

async function getWeatherKribi(): Promise<{ temp: number; desc: string } | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY
  if (!apiKey) return null
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=2.9388&lon=9.9244&appid=${apiKey}&units=metric&lang=fr`,
      { next: { revalidate: 1800 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return {
      temp: Math.round(data.main.temp),
      desc: data.weather[0]?.description ?? '',
    }
  } catch {
    return null
  }
}

async function getEvenementsWeekend() {
  const { start, end } = getWeekendRange()
  try {
    const snap = await db.collection('evenements_kribi').where('actif', '==', true).get()
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((ev: any) => {
        if (ev.recurrent && ['samedi', 'dimanche', 'weekend'].includes(ev.jour_recurrence ?? '')) {
          return true
        }
        const date: Date =
          ev.date_debut?.toDate ? ev.date_debut.toDate() : new Date(ev.date_debut)
        return date >= start && date <= end
      })
      .map((ev: any) => ({
        id: ev.id,
        titre: ev.titre ?? '',
        categorie: ev.categorie ?? '',
        date_debut: ev.date_debut?.toDate ? ev.date_debut.toDate().toISOString() : ev.date_debut ?? '',
        heure: ev.heure ?? '',
        lieu: ev.lieu ?? '',
        prix: ev.prix ?? null,
        image_url: ev.image_url ?? '',
        fichier_type: ev.fichier_type ?? null,
        recurrent: ev.recurrent ?? false,
      }))
      .sort((a: any, b: any) => new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime())
  } catch {
    return []
  }
}

async function getTopHebergements() {
  try {
    const snap = await db.collection('hebergements').where('status', '==', 'active').get()
    return snap.docs
      .map((d) => {
        const data = d.data()
        return {
          id: d.id,
          nom: data.name ?? '',
          type: data.type ?? '',
          localisation: data.location ?? data.localisation ?? '',
          prix_nuit: data.price_per_night ?? 0,
          image: Array.isArray(data.images) && data.images[0] ? data.images[0] : '',
          slug: data.slug ?? d.id,
          featured: data.featured ?? false,
          rating: data.ratings?.overall ?? 0,
        }
      })
      .sort((a, b) => {
        if (a.featured && !b.featured) return -1
        if (!a.featured && b.featured) return 1
        return b.rating - a.rating
      })
      .slice(0, 3)
  } catch {
    return []
  }
}

// ─── Page ──────────────────────────────────────────────────────────────────

const BOUTIQUE_URL = 'https://l-et-lui-signature.netlify.app'

const PRODUITS = [
  { emoji: '🌊', titre: 'Lune de Miel Kribi', desc: 'Séjour romantique tout inclus' },
  { emoji: '🎉', titre: 'Pack EVJF Bord de Mer', desc: 'Enterrement de vie de jeune fille' },
  { emoji: '🌸', titre: 'Programme Future Mariée', desc: 'Préparation & bien-être' },
  { emoji: '📸', titre: 'Pack Photo & Vidéo', desc: 'Souvenirs inoubliables' },
]

export default async function KribiPage() {
  const { label } = getWeekendRange()
  const [evenements, hebergements, weather] = await Promise.all([
    getEvenementsWeekend(),
    getTopHebergements(),
    getWeatherKribi(),
  ])

  // Compute weekend label for client
  const { start, end } = getWeekendRange()
  const labelSamedi = start.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const labelDimanche = end.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="min-h-screen" style={{ background: '#1A1A1A' }}>
      <KribiScanTracker />

      {/* ══ SECTION 1 — EN-TÊTE ══════════════════════════════════════════ */}
      <section className="px-4 pt-10 pb-8 text-center" style={{ background: '#1A1A1A' }}>
        <div className="max-w-lg mx-auto">
          {/* Logo */}
          <div className="mb-6 flex justify-center">
            <Link href="/" className="text-[#C9A84C] font-serif text-lg font-semibold tracking-wide">
              L&amp;Lui Signature
            </Link>
          </div>

          {/* Titre */}
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-3 leading-tight">
            Que faire à Kribi<br />
            <em className="text-[#C9A84C] not-italic">ce weekend ?</em>
          </h1>

          {/* Date du weekend */}
          <p className="text-[#C9A84C] text-sm font-medium mb-1">
            {label.charAt(0).toUpperCase() + label.slice(1)}
          </p>
          {/* Indicateur fraîcheur */}
          <p className="text-white/30 text-xs mb-4">
            Mis à jour le{' '}
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            {' '}par L&amp;Lui Signature
          </p>

          {/* Météo + compteur */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {weather ? (
              <div className="flex items-center gap-1.5 text-white/60 text-sm">
                <Thermometer size={14} className="text-[#C9A84C]" />
                {weather.temp}°C · {weather.desc.charAt(0).toUpperCase() + weather.desc.slice(1)} · Kribi
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-white/40 text-sm">
                <MapPin size={13} className="text-[#C9A84C]" />
                Kribi, Cameroun
              </div>
            )}
            <div
              className="px-3 py-1 rounded-full text-sm font-semibold"
              style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.25)' }}
            >
              {evenements.length} activité{evenements.length !== 1 ? 's' : ''} ce weekend
            </div>
          </div>
        </div>
      </section>

      {/* ══ SECTIONS 2 & 3 — FILTRES + ÉVÉNEMENTS (client interactif) ════ */}
      <KribiClient
        evenements={evenements}
        labelSamedi={labelSamedi}
        labelDimanche={labelDimanche}
      />

      {/* ══ SECTION 4 — HÉBERGEMENTS ══════════════════════════════════════ */}
      <section className="py-12 px-4" style={{ background: '#1A1A1A' }}>
        <div className="max-w-lg mx-auto">
          <div className="mb-7">
            <h2 className="font-serif text-2xl font-semibold text-white">
              Où séjourner à Kribi ?
            </h2>
            <p className="text-[#C9A84C] text-sm mt-1">Sélection L&amp;Lui Signature</p>
            <div className="h-px mt-3" style={{ background: 'linear-gradient(to right, #C9A84C55, transparent)' }} />
          </div>

          <div className="flex flex-col gap-4">
            {hebergements.map((h) => (
              <Link
                key={h.id}
                href={`/hebergements/${h.slug}`}
                className="flex gap-3 p-3 rounded-2xl transition-opacity hover:opacity-90"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {h.image && h.image.startsWith('http') ? (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                    <Image
                      src={resolveImageUrl(h.image)}
                      alt={h.nom}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
                    style={{ background: 'rgba(201,168,76,0.12)' }}>
                    🏡
                  </div>
                )}
                <div className="flex-1 min-w-0 py-1">
                  <h3 className="text-white font-semibold text-sm leading-snug truncate">{h.nom}</h3>
                  {h.localisation && (
                    <p className="text-white/40 text-xs mt-0.5 flex items-center gap-1">
                      <MapPin size={10} /> {h.localisation}
                    </p>
                  )}
                  <p className="text-[#C9A84C] text-xs font-medium mt-2">
                    À partir de {formatPrice(h.prix_nuit)} / nuit
                  </p>
                </div>
                <div className="flex items-center pr-1 flex-shrink-0">
                  <span className="text-white/30 text-xs">→</span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-xl transition-opacity hover:opacity-80"
              style={{ border: '1px solid rgba(201,168,76,0.4)', color: '#C9A84C' }}
            >
              Voir tous les hébergements →
            </Link>
          </div>
        </div>
      </section>

      {/* ══ SECTION 5 — BOUTIQUE L&LUI ════════════════════════════════════ */}
      <section className="py-12 px-4" style={{ background: '#F5F0E8' }}>
        <div className="max-w-lg mx-auto">
          <div className="mb-7 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <ShoppingBag size={18} className="text-[#C9A84C]" />
              <h2 className="font-serif text-2xl font-semibold text-[#1A1A1A]">
                Boutique L&amp;Lui Signature
              </h2>
            </div>
            <p className="text-[#1A1A1A]/50 text-sm">Expériences et services premium</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {PRODUITS.map((p) => (
              <a
                key={p.titre}
                href={BOUTIQUE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center text-center p-4 rounded-2xl transition-shadow hover:shadow-md"
                style={{ background: '#fff', border: '1px solid rgba(201,168,76,0.2)' }}
              >
                <span className="text-3xl mb-2">{p.emoji}</span>
                <p className="font-semibold text-[#1A1A1A] text-sm leading-snug">{p.titre}</p>
                <p className="text-[#1A1A1A]/40 text-xs mt-1">{p.desc}</p>
              </a>
            ))}
          </div>

          <div className="text-center">
            <a
              href={BOUTIQUE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80"
              style={{ background: '#C9A84C', color: '#1A1A1A' }}
            >
              <ShoppingBag size={15} />
              Découvrir la boutique →
            </a>
          </div>
        </div>
      </section>

      {/* ══ SECTION 6 — REVENIR CHAQUE SEMAINE ══════════════════════════ */}
      <KribiRevenir />

      {/* ══ PIED DE PAGE ══════════════════════════════════════════════════ */}
      <footer className="py-10 px-4 border-t border-white/8" style={{ background: '#1A1A1A' }}>
        <div className="max-w-lg mx-auto text-center">
          <Link href="/" className="text-[#C9A84C] font-serif text-base font-semibold">
            L&amp;Lui Signature
          </Link>
          <p className="text-white/30 text-xs mt-1 mb-5">Votre guide de la destination Kribi</p>

          <Link
            href="/portail"
            className="inline-flex items-center gap-1.5 text-sm text-[#C9A84C] underline underline-offset-2 mb-7"
          >
            Organiser un mariage à Kribi →
          </Link>

          {/* Urgences */}
          <div
            className="flex flex-col gap-2 p-4 rounded-xl mx-auto max-w-xs"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Urgences Kribi</p>
            <a href="tel:+237233461212" className="flex items-center gap-2 text-white/60 text-xs">
              <Phone size={11} className="text-[#C9A84C]" />
              Hôpital · +237 233 461 212
            </a>
            <a href="tel:119" className="flex items-center gap-2 text-white/60 text-xs">
              <Phone size={11} className="text-[#C9A84C]" />
              SAMU · 119
            </a>
          </div>

          <p className="text-white/20 text-xs mt-6">
            © {new Date().getFullYear()} L&amp;Lui Signature · Kribi, Cameroun
          </p>
        </div>
      </footer>
    </div>
  )
}
