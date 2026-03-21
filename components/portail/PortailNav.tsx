'use client'
// components/portail/PortailNav.tsx
// Navigation portail : bottom bar mobile + barre desktop sous le header

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Wand2, MapPin, ShoppingCart, Users, Gift, FileText } from 'lucide-react'
import { usePanier } from '@/hooks/usePanier'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  badge?: number
}

interface Props {
  uid: string
  invitesCount?: number
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full text-[10px] font-bold text-white bg-[#C9A84C] flex items-center justify-center">
      {count > 99 ? '99+' : count}
    </span>
  )
}

export default function PortailNav({ uid, invitesCount = 0 }: Props) {
  const pathname = usePathname()
  const { totaux } = usePanier(uid)
  const panierCount = totaux.nb_articles

  const navItems: NavItem[] = [
    { href: '/portail', label: 'Accueil', icon: Home },
    { href: '/portail/configurateur', label: '✨ Ma Vision', icon: Wand2 },
    { href: '/portail/escales', label: '🏡 Escales', icon: MapPin },
    { href: '/portail/mes-achats', label: '🛒 Mes Achats', icon: ShoppingCart, badge: panierCount },
    { href: '/portail/invites', label: '👥 Invités', icon: Users, badge: invitesCount },
    { href: '/portail/avantages', label: '⭐ Avantages', icon: Gift },
    { href: '/portail/documents', label: '📋 Documents', icon: FileText },
  ]

  const isActive = (href: string) =>
    href === '/portail' ? pathname === '/portail' : pathname.startsWith(href)

  return (
    <>
      {/* Desktop : barre secondaire sous le header */}
      <nav className="hidden md:flex fixed top-16 left-0 right-0 z-40 h-10 bg-white border-b border-gray-200 px-4 items-center gap-1 shadow-sm">
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm transition-colors whitespace-nowrap ${
                active
                  ? 'bg-[#C9A84C]/10 text-[#C9A84C] font-semibold'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <Icon size={14} />
              {label}
              {badge !== undefined && badge > 0 && (
                <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white bg-[#C9A84C] flex items-center justify-center">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Mobile : bottom nav bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white border-t border-gray-200 flex items-stretch overflow-x-auto">
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center justify-center gap-0.5 min-w-[64px] flex-1 transition-colors ${
                active ? 'text-[#C9A84C]' : 'text-gray-400'
              }`}
            >
              <span className="relative">
                <Icon size={20} />
                {badge !== undefined && <Badge count={badge} />}
              </span>
              <span className="text-[9px] leading-tight text-center truncate w-full px-0.5">
                {label}
              </span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
