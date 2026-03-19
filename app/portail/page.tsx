import Link from 'next/link'
import { Calculator, Home, Star, FolderOpen } from 'lucide-react'

const MODULES = [
  {
    href: '/portail/configurateur',
    icon: Calculator,
    titre: 'Ma Vision',
    sous_titre: 'Configurer mon devis',
    desc: 'Créez votre proposition commerciale sur mesure',
    couleur: '#C9A84C',
  },
  {
    href: '/portail/escales',
    icon: Home,
    titre: 'Mes Escales',
    sous_titre: 'Hébergements & partenaires',
    desc: 'Accédez aux logements L&Lui et partenaires',
    couleur: '#7C9A7E',
  },
  {
    href: '/portail/avantages',
    icon: Star,
    titre: 'Mes Avantages',
    sous_titre: 'Crédits services & REV',
    desc: 'Consultez votre wallet et vos points REV',
    couleur: '#0F52BA',
  },
  {
    href: '/portail/documents',
    icon: FolderOpen,
    titre: 'Mes Documents',
    sous_titre: 'PDF & ressources',
    desc: 'Téléchargez contrats, guides et propositions',
    couleur: '#888888',
  },
]

export default function PortailPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-serif italic text-3xl text-[#1A1A1A] mb-1">Mon Espace Signature</h1>
      <p className="text-sm text-[#888] mb-8">Bienvenue dans votre espace L&Lui Signature</p>

      {/* Grille 2x2 mobile / 4 colonnes desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {MODULES.map(({ href, icon: Icon, titre, sous_titre, desc, couleur }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col bg-white rounded-2xl p-5 shadow-sm border border-[#F5F0E8] hover:shadow-md transition-all hover:-translate-y-0.5"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ background: couleur + '18' }}
            >
              <Icon size={20} style={{ color: couleur }} />
            </div>
            <p className="font-semibold text-[#1A1A1A] text-sm mb-0.5">{titre}</p>
            <p className="text-[11px] text-[#888] mb-2">{sous_titre}</p>
            <p className="text-[11px] text-[#aaa] leading-relaxed hidden sm:block">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
