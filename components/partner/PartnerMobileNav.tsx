'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ClipboardList, QrCode, MessageCircle, FileSignature, Settings } from 'lucide-react'

interface Props {
  contractStatus?: string
}

export default function PartnerMobileNav({ contractStatus }: Props) {
  const pathname = usePathname()

  const tabs = [
    { href: '/partenaire/dashboard', icon: Home, label: 'Accueil', badge: false },
    { href: '/partenaire/reservations/liste', icon: ClipboardList, label: 'Réservations', badge: false },
    { href: '/partenaire/scanner', icon: QrCode, label: 'Scanner', badge: false },
    { href: '/partenaire/messages', icon: MessageCircle, label: 'Messages', badge: false },
    {
      href: '/partenaire/contrat',
      icon: FileSignature,
      label: 'Contrat',
      badge: contractStatus !== 'signed',
    },
    { href: '/partenaire/parametres', icon: Settings, label: 'Paiement', badge: false },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-beige-200 grid grid-cols-6 lg:hidden">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive =
          pathname === tab.href ||
          (tab.href !== '/partenaire/dashboard' && pathname?.startsWith(tab.href)) ||
          (tab.href === '/partenaire/dashboard' && (pathname === '/partenaire/dashboard' || pathname === '/partenaire/dashboard/'))

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative flex flex-col items-center justify-center py-2 min-h-[56px] transition-colors ${
              isActive ? 'text-gold-600' : 'text-dark/40'
            }`}
          >
            <Icon size={20} />
            {tab.badge && (
              <span className="absolute top-1.5 right-3.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
            <span className="text-[10px] mt-0.5">{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
