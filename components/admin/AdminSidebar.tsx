'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, CalendarDays, Home, LogOut, Menu, X, ChevronRight, Package, Tag } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/reservations', label: 'Réservations', icon: CalendarDays },
  { href: '/admin/hebergements', label: 'Hébergements', icon: Home },
  { href: '/admin/packs', label: 'Packs', icon: Package },
  { href: '/admin/promo-codes', label: 'Codes promo', icon: Tag },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-6 py-6 border-b border-white/10">
        <Link href="/" className="font-serif text-xl font-semibold text-white">
          L<span className="text-gold-400">&</span>Lui Signature
        </Link>
        <p className="text-white/40 text-xs mt-1">Administration</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => (
          <Link key={href} href={href} onClick={() => setIsOpen(false)}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
              isActive(href, exact)
                ? 'bg-gold-500 text-white shadow-gold'
                : 'text-white/60 hover:bg-white/10 hover:text-white'
            )}>
            <Icon size={18} />
            {label}
            {isActive(href, exact) && <ChevronRight size={14} className="ml-auto" />}
          </Link>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/10 space-y-2">
        <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/60 hover:bg-white/10 hover:text-white transition-all w-full">
          Voir le site
        </Link>
        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/60 hover:bg-red-500/20 hover:text-red-400 transition-all w-full">
          <LogOut size={18} /> Déconnexion
        </button>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden lg:flex w-60 bg-dark flex-col flex-shrink-0 min-h-screen sticky top-0">
        <SidebarContent />
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-dark flex items-center justify-between px-4 py-3 h-14">
        <Link href="/" className="font-serif text-lg font-semibold text-white">L<span className="text-gold-400">&</span>Lui</Link>
        <button onClick={() => setIsOpen(!isOpen)} className="text-white/70 hover:text-white p-1">
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setIsOpen(false)}>
          <div className="absolute inset-0 bg-dark/60" />
          <aside className="absolute top-0 left-0 bottom-0 w-64 bg-dark" onClick={(e) => e.stopPropagation()}>
            <div className="pt-14"><SidebarContent /></div>
          </aside>
        </div>
      )}
    </>
  )
}
