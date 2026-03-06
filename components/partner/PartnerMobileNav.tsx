'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, ClipboardList, QrCode, MessageCircle } from 'lucide-react'

const tabs = [
  { href: '/partenaire/dashboard', icon: Home, label: 'Accueil' },
  { href: '/partenaire/dashboard#calendrier', icon: Calendar, label: 'Calendrier' },
  { href: '/partenaire/reservations/liste', icon: ClipboardList, label: 'Réservations' },
  { href: '/partenaire/scanner', icon: QrCode, label: 'Scanner' },
  { href: '/partenaire/messages', icon: MessageCircle, label: 'Messages' },
]

export default function PartnerMobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-beige-200 grid grid-cols-5 lg:hidden">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = pathname === tab.href || pathname?.startsWith(tab.href.split('#')[0]) && tab.href.split('#')[0] !== '/partenaire/dashboard'
          || (tab.href === '/partenaire/dashboard' && (pathname === '/partenaire/dashboard' || pathname === '/partenaire/dashboard/'))

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center justify-center py-2 min-h-[56px] transition-colors ${
              isActive ? 'text-gold-600' : 'text-dark/40'
            }`}
          >
            <Icon size={20} />
            <span className="text-[10px] mt-0.5">{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
