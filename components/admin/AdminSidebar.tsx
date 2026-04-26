'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, CalendarDays, Home, LogOut, Menu, X, ChevronRight, Package, Tag, Inbox, Users, Bell, MessageCircle, Heart, FileSignature, FolderOpen, CreditCard, Wallet, Star, Gem, BarChart2, UserCircle, Banknote, TrendingUp, Globe, ClipboardList, FileText, Ban, Scale, Camera, TrendingDown, CalendarRange, QrCode, Briefcase, Bike, Settings } from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/calendrier', label: '🗓 Calendrier Kribi', icon: CalendarRange },
  { href: '/admin/calendrier/qr-code', label: '📲 QR Code & Diffusion', icon: QrCode },
  { href: '/admin/reservations', label: 'Réservations', icon: CalendarDays },
  { href: '/admin/demandes', label: 'Demandes clients', icon: Bell },
  { href: '/admin/hebergements', label: 'Hébergements', icon: Home },
  { href: '/admin/partenaires', label: 'Partenaires', icon: Users },
  { href: '/admin/packs', label: 'Packs', icon: Package },
  { href: '/admin/pack-requests', label: 'Demandes pack', icon: Inbox },
  { href: '/admin/promo-codes', label: 'Codes promo', icon: Tag },
  { href: '/admin/clients', label: 'Clients fidèles', icon: Heart },
  { href: '/admin/fidelite', label: '⭐ Fidélité L&Lui Stars', icon: Star },
  { href: '/admin/stars-mlm', label: '💰 Stars & MLM Wallets', icon: Wallet },
  { href: '/admin/devis', label: '💍 Mariages & Devis', icon: Gem },
  { href: '/admin/mariage', label: '📋 Dossiers Mariés', icon: Users },
  { href: '/admin/dashboard', label: '🏠 Dashboard Portail', icon: TrendingUp },
  { href: '/admin/utilisateurs', label: '👤 Utilisateurs Portail', icon: UserCircle },
  { href: '/admin/paiements', label: '💳 Paiements centralisés', icon: Banknote },
  { href: '/admin/fast-start', label: '🏆 Fast Start', icon: Star },
  { href: '/admin/reporting', label: '📊 Reporting', icon: BarChart2 },
  { href: '/admin/templates', label: 'Templates WhatsApp', icon: MessageCircle },
  { href: '/admin/contrat', label: 'Contrat partenariat', icon: FileSignature },
  { href: '/admin/abonnements', label: 'Abonnements', icon: CreditCard },
  { href: '/admin/documents', label: 'Documents & Aide', icon: FolderOpen },
  { href: '/admin/parametres-paiement', label: '⚙️ Paramètres paiement', icon: Wallet },
  { href: '/admin/commandes', label: '💸 Commandes & Versements', icon: ClipboardList },
  { href: '/admin/ecosysteme', label: '🌐 Écosystème', icon: Globe },
  // Sprint 4
  { href: '/admin/contrats', label: '📄 Contrats mariages', icon: FileText },
  { href: '/admin/registre-legal', label: '⚖️ Registre légal Kribi', icon: Scale },
  { href: '/admin/prestataires-portail', label: '🎬 Portail prestataires', icon: Camera },
  { href: '/admin/influenceurs', label: '📱 Programme influenceurs', icon: TrendingUp },
  { href: '/admin/white-label', label: '🌍 White label villes', icon: Globe },
  { href: '/admin/prestataires-services', label: '🤝 Prestataires Services', icon: Briefcase },
  { href: '/admin/prescripteurs', label: '🏍 Prescripteurs', icon: Bike },
  { href: '/admin/prescripteurs-partenaires', label: '🏨 Canal 2 Partenaires', icon: Briefcase },
  { href: '/admin/evenements', label: '📅 Événements', icon: CalendarDays },
  { href: '/admin/parametres', label: '⚙️ Paramètres', icon: Settings },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [loyaltyBadge, setLoyaltyBadge] = useState(0)
  const [invitesBadge, setInvitesBadge] = useState(0)
  const [dossiersBadge, setDossiersBadge] = useState(0)

  useEffect(() => {
    fetch('/api/admin/loyalty-badge')
      .then((r) => r.json())
      .then((d) => setLoyaltyBadge(d.count || 0))
      .catch(() => {})
    fetch('/api/admin/invites-badge')
      .then((r) => r.json())
      .then((d) => setInvitesBadge(d.count || 0))
      .catch(() => {})
    fetch('/api/admin/dossiers-badge')
      .then((r) => r.json())
      .then((d) => setDossiersBadge(d.count || 0))
      .catch(() => {})
  }, [pathname])

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

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto pb-8">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => (
          <Link key={href} href={href} onClick={() => setIsOpen(false)}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
              isActive(href, exact)
                ? 'bg-gold-500 text-white shadow-gold'
                : 'text-white/60 hover:bg-white/10 hover:text-white'
            )}>
            <Icon size={18} />
            <span className="flex-1">{label}</span>
            {href === '/admin/fidelite' && loyaltyBadge > 0 && (
              <span className="ml-auto w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                {loyaltyBadge > 9 ? '9+' : loyaltyBadge}
              </span>
            )}
            {href === '/admin/mariage' && dossiersBadge > 0 && (
              <span className="ml-auto px-1.5 h-5 min-w-[20px] bg-gold-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                {dossiersBadge > 99 ? '99+' : dossiersBadge}
              </span>
            )}
            {href === '/admin/mariage' && invitesBadge > 0 && dossiersBadge === 0 && (
              <span className="ml-auto w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                {invitesBadge > 99 ? '99+' : invitesBadge}
              </span>
            )}
            {isActive(href, exact) && href !== '/admin/mariage' && href !== '/admin/fidelite' && <ChevronRight size={14} className="ml-auto" />}
            {isActive(href, exact) && href === '/admin/mariage' && dossiersBadge === 0 && invitesBadge === 0 && <ChevronRight size={14} className="ml-auto" />}
            {isActive(href, exact) && href === '/admin/fidelite' && loyaltyBadge === 0 && <ChevronRight size={14} className="ml-auto" />}
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
      <aside className="hidden lg:flex w-60 bg-dark flex-col flex-shrink-0 h-screen sticky top-0 overflow-hidden">
        <SidebarContent />
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-dark flex items-center justify-between px-4 py-3 h-14">
        <Link href="/" className="font-serif text-lg font-semibold text-white">L<span className="text-gold-400">&</span>Lui</Link>
        <button onClick={() => setIsOpen(!isOpen)} className="text-white/70 hover:text-white p-1">
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {isOpen && (
        <div className="lg:hidden">
          {/* Overlay */}
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setIsOpen(false)} />

          {/* Drawer iOS-compatible */}
          <div
            className="fixed top-0 left-0 z-50 w-72 flex flex-col bg-dark"
            style={{ height: '100dvh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header fixe */}
            <div className="flex-shrink-0 px-6 py-5 flex justify-between items-center border-b border-white/10">
              <div>
                <p className="text-white font-bold text-xl font-serif">L<span className="text-gold-400">&</span>Lui</p>
                <p className="text-white/40 text-xs">Administration</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/70 w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10"
              >
                <X size={22} />
              </button>
            </div>

            {/* Nav scrollable iPhone */}
            <nav
              className="px-3 py-4 space-y-1"
              style={{
                flex: 1,
                overflowY: 'scroll',
                WebkitOverflowScrolling: 'touch',
                paddingBottom: '120px',
              }}
            >
              {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => (
                <Link key={href} href={href} onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                    isActive(href, exact)
                      ? 'bg-gold-500 text-white shadow-gold'
                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                  )}>
                  <Icon size={18} />
                  <span className="flex-1">{label}</span>
                  {href === '/admin/fidelite' && loyaltyBadge > 0 && (
                    <span className="ml-auto w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {loyaltyBadge > 9 ? '9+' : loyaltyBadge}
                    </span>
                  )}
                  {href === '/admin/mariage' && dossiersBadge > 0 && (
                    <span className="ml-auto px-1.5 h-5 min-w-[20px] bg-gold-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {dossiersBadge > 99 ? '99+' : dossiersBadge}
                    </span>
                  )}
                  {href === '/admin/mariage' && invitesBadge > 0 && dossiersBadge === 0 && (
                    <span className="ml-auto w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {invitesBadge > 99 ? '99+' : invitesBadge}
                    </span>
                  )}
                  {isActive(href, exact) && href !== '/admin/mariage' && href !== '/admin/fidelite' && <ChevronRight size={14} className="ml-auto" />}
                  {isActive(href, exact) && href === '/admin/mariage' && dossiersBadge === 0 && invitesBadge === 0 && <ChevronRight size={14} className="ml-auto" />}
                  {isActive(href, exact) && href === '/admin/fidelite' && loyaltyBadge === 0 && <ChevronRight size={14} className="ml-auto" />}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
