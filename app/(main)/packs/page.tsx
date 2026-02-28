export const dynamic = 'force-dynamic'

import { db } from '@/lib/firebase'
import PackCard from '@/components/packs/PackCard'
import type { Pack } from '@/lib/types'
import { Building2, Star, Crown } from 'lucide-react'

async function getPacks(): Promise<Pack[]> {
  const snap = await db.collection('packs').where('status', '==', 'active').get()
  const packs = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Pack[]
  return packs.sort((a, b) => {
    if (a.featured && !b.featured) return -1
    if (!a.featured && b.featured) return 1
    return (b.created_at || '').localeCompare(a.created_at || '')
  })
}

const CATEGORIES = [
  {
    type: 'f3',
    label: 'Packs F3',
    icon: Building2,
    color: 'bg-blue-600',
    desc: 'Logements familiaux spacieux, idéaux pour les séjours en groupe ou familles nombreuses.',
  },
  {
    type: 'vip',
    label: 'Packs VIP',
    icon: Star,
    color: 'bg-amber-500',
    desc: 'Logements premium sélectionnés pour leur standing, leur confort et leurs équipements haut de gamme.',
  },
  {
    type: 'signature',
    label: 'Packs Signature',
    icon: Crown,
    color: 'bg-dark',
    desc: 'La crème de la crème. Notre sélection d'excellence pour des événements inoubliables à Kribi.',
  },
]

export const metadata = { title: 'Nos Packs Logements – L&Lui Signature' }

export default async function PacksPage() {
  const allPacks = await getPacks()

  return (
    <div className="pt-20">
      {/* Hero */}
      <section className="bg-dark py-20 px-4 text-center">
        <p className="text-gold-400 text-sm font-medium tracking-[0.2em] uppercase mb-4">Offres groupées</p>
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-white mb-6">
          Nos Packs Logements
        </h1>
        <p className="text-white/60 text-lg max-w-2xl mx-auto leading-relaxed">
          Mariages, séminaires, séjours familiaux… L&amp;Lui Signature vous propose des packs
          sur mesure regroupant plusieurs logements pour votre événement à Kribi.
        </p>
      </section>

      {/* Categories */}
      <section className="bg-beige-50 py-14 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
          {CATEGORIES.map(({ type, label, icon: Icon, color, desc }) => {
            const count = allPacks.filter((p) => p.pack_type === type).length
            return (
              <a key={type} href={`#${type}`} className="group flex flex-col items-center text-center p-6 bg-white rounded-2xl border border-beige-200 hover:shadow-card transition-shadow">
                <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center mb-4`}>
                  <Icon size={26} className="text-white" />
                </div>
                <h3 className="font-serif text-xl font-semibold text-dark mb-2">{label}</h3>
                <p className="text-dark/60 text-sm leading-relaxed mb-3">{desc}</p>
                <span className="text-xs text-gold-600 font-medium">{count} pack{count > 1 ? 's' : ''} disponible{count > 1 ? 's' : ''}</span>
              </a>
            )
          })}
        </div>
      </section>

      {/* Packs by category */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        {CATEGORIES.map(({ type, label, icon: Icon, color }) => {
          const packs = allPacks.filter((p) => p.pack_type === type)
          if (packs.length === 0) return null
          return (
            <div key={type} id={type}>
              <div className="flex items-center gap-3 mb-8">
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
                  <Icon size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="section-title">{label}</h2>
                </div>
              </div>
              <div className="gold-divider mb-8" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {packs.map((pack) => <PackCard key={pack.id} pack={pack} />)}
              </div>
            </div>
          )
        })}

        {allPacks.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏖️</div>
            <h3 className="font-serif text-2xl text-dark mb-2">Aucun pack disponible</h3>
            <p className="text-dark/50">Revenez bientôt, de nouveaux packs sont en préparation.</p>
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-beige-100">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-3xl font-semibold text-dark mb-4">
            Besoin d&apos;un pack sur mesure ?
          </h2>
          <p className="text-dark/60 mb-8 leading-relaxed">
            Vous n&apos;avez pas trouvé ce que vous cherchez ? Contactez notre équipe et nous
            créerons une offre personnalisée pour votre événement.
          </p>
          <a
            href="mailto:contact@llui-signature.cm?subject=Demande%20pack%20sur%20mesure"
            className="btn-primary px-10 py-4 text-base inline-flex"
          >
            Contacter notre équipe
          </a>
        </div>
      </section>
    </div>
  )
}
