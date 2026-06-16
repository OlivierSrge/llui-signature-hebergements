'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, CalendarDays, Home, LogOut, Menu, X, ChevronDown,
  Package, Tag, Inbox, Users, Bell, MessageCircle, Heart, FileSignature,
  FolderOpen, CreditCard, Wallet, Star, Gem, BarChart2, UserCircle,
  Banknote, TrendingUp, Globe, ClipboardList, FileText, Scale,
  Camera, CalendarRange, QrCode, Briefcase, Bike, Settings,
  type LucideIcon,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

interface NavGroup {
  id: string
  label: string | null   // null = pas de header (entrée solo)
  emoji?: string
  items: NavItem[]
}

// ─── Structure des groupes ────────────────────────────────────────────────────

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'top',
    label: null,
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    id: 'hebergements',
    label: 'Hébergements',
    emoji: '🏠',
    items: [
      { href: '/admin/calendrier', label: 'Calendrier Kribi', icon: CalendarRange },
      { href: '/admin/calendrier/qr-code', label: 'QR Code & Diffusion', icon: QrCode },
      { href: '/admin/reservations', label: 'Réservations', icon: CalendarDays },
      { href: '/admin/demandes', label: 'Demandes clients', icon: Bell },
      { href: '/admin/hebergements', label: 'Hébergements', icon: Home },
    ],
  },
  {
    id: 'partenaires',
    label: 'Partenaires & Canal 2',
    emoji: '🤝',
    items: [
      { href: '/admin/partenaires', label: 'Partenaires', icon: Users },
      { href: '/admin/prescripteurs', label: 'Prescripteurs', icon: Bike },
      { href: '/admin/prescripteurs-partenaires', label: 'Canal 2 Partenaires', icon: Briefcase },
      { href: '/admin/packs', label: 'Packs', icon: Package },
      { href: '/admin/pack-requests', label: 'Demandes pack', icon: Inbox },
      { href: '/admin/promo-codes', label: 'Codes promo', icon: Tag },
      { href: '/admin/commandes', label: 'Commandes & Versements', icon: ClipboardList },
    ],
  },
  {
    id: 'fidelite',
    label: 'Fidélité & Stars',
    emoji: '⭐',
    items: [
      { href: '/admin/clients', label: 'Clients fidèles', icon: Heart },
      { href: '/admin/fidelite', label: 'Fidélité L&Lui Stars', icon: Star },
      { href: '/admin/loyalty-confirmations', label: 'Cartes à confirmer', icon: CreditCard },
      { href: '/admin/stars-mlm', label: 'Stars & MLM Wallets', icon: Wallet },
    ],
  },
  {
    id: 'mariage',
    label: 'Mariage & Événements',
    emoji: '💍',
    items: [
      { href: '/admin/devis', label: 'Mariages & Devis', icon: Gem },
      { href: '/admin/mariage', label: 'Dossiers Mariés', icon: Users },
      { href: '/admin/contrats', label: 'Contrats mariages', icon: FileText },
      { href: '/admin/evenements', label: 'Événements', icon: CalendarDays },
    ],
  },
  {
    id: 'portail',
    label: 'Portail & Prestataires',
    emoji: '🌐',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard Portail', icon: TrendingUp },
      { href: '/admin/utilisateurs', label: 'Utilisateurs Portail', icon: UserCircle },
      { href: '/admin/prestataires-portail', label: 'Portail prestataires', icon: Camera },
      { href: '/admin/prestataires-services', label: 'Prestataires Services', icon: Briefcase },
      { href: '/admin/influenceurs', label: 'Programme influenceurs', icon: TrendingUp },
    ],
  },
  {
    id: 'finances',
    label: 'Finances',
    emoji: '💳',
    items: [
      { href: '/admin/paiements', label: 'Paiements centralisés', icon: Banknote },
      { href: '/admin/fast-start', label: 'Fast Start', icon: Star },
      { href: '/admin/parametres-paiement', label: 'Paramètres paiement', icon: Wallet },
      { href: '/admin/reporting', label: 'Reporting', icon: BarChart2 },
    ],
  },
  {
    id: 'business',
    label: 'Business & Growth',
    emoji: '🌍',
    items: [
      { href: '/admin/alliance-privee', label: 'Alliance Privée', icon: Gem },
      { href: '/admin/white-label', label: 'White label villes', icon: Globe },
      { href: '/admin/ecosysteme', label: 'Écosystème', icon: Globe },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    emoji: '⚙️',
    items: [
      { href: '/admin/templates', label: 'Templates WhatsApp', icon: MessageCircle },
      { href: '/admin/contrat', label: 'Contrat partenariat', icon: FileSignature },
      { href: '/admin/abonnements', label: 'Abonnements', icon: CreditCard },
      { href: '/admin/documents', label: 'Documents & Aide', icon: FolderOpen },
      { href: '/admin/registre-legal', label: 'Registre légal Kribi', icon: Scale },
      { href: '/admin/parametres', label: 'Paramètres', icon: Settings },
    ],
  },
]

// ─── Composant principal ──────────────────────────────────────────────────────

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['top']))
  const [loyaltyBadge, setLoyaltyBadge] = useState(0)
  const [invitesBadge, setInvitesBadge] = useState(0)
  const [dossiersBadge, setDossiersBadge] = useState(0)

  // Badges
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

  // Auto-ouvrir le groupe qui contient la route active
  useEffect(() => {
    const activeGroup = NAV_GROUPS.find((g) =>
      g.items.some((item) =>
        item.exact ? pathname === item.href : pathname.startsWith(item.href)
      )
    )
    if (activeGroup) {
      setOpenGroups((prev) => new Set([...prev, activeGroup.id]))
    }
  }, [pathname])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Badge count pour un groupe (affiché sur le header quand le groupe est fermé)
  const groupBadgeCount = (groupId: string): number => {
    if (groupId === 'fidelite') return loyaltyBadge
    if (groupId === 'mariage') return dossiersBadge + invitesBadge
    return 0
  }

  // Badge d'un item individuel
  const ItemBadge = ({ href }: { href: string }) => {
    if (href === '/admin/loyalty-confirmations' && loyaltyBadge > 0) {
      return (
        <span className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">
          {loyaltyBadge > 9 ? '9+' : loyaltyBadge}
        </span>
      )
    }
    if (href === '/admin/mariage') {
      if (dossiersBadge > 0) {
        return (
          <span className="px-1.5 h-5 min-w-[20px] bg-gold-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">
            {dossiersBadge > 99 ? '99+' : dossiersBadge}
          </span>
        )
      }
      if (invitesBadge > 0) {
        return (
          <span className="w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">
            {invitesBadge > 99 ? '99+' : invitesBadge}
          </span>
        )
      }
    }
    return null
  }

  // ── Navigation (partagé desktop + mobile) ──────────────────────────────────

  const NavContent = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <nav className="flex-1 px-3 py-4 overflow-y-auto pb-8 space-y-1">
      {NAV_GROUPS.map((group) => {
        const isGroupOpen = openGroups.has(group.id)
        const badge = groupBadgeCount(group.id)
        const hasActiveItem = group.items.some((item) => isActive(item.href, item.exact))

        // Groupe sans header (Dashboard)
        if (group.label === null) {
          return group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onLinkClick}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                isActive(item.href, item.exact)
                  ? 'bg-gold-500 text-white shadow-gold'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              )}
            >
              <item.icon size={18} />
              <span className="flex-1">{item.label}</span>
            </Link>
          ))
        }

        return (
          <div key={group.id}>
            {/* Header du groupe */}
            <button
              onClick={() => toggleGroup(group.id)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 mt-2',
                hasActiveItem
                  ? 'text-gold-400'
                  : 'text-white/30 hover:text-white/60'
              )}
            >
              {group.emoji && <span className="text-sm">{group.emoji}</span>}
              <span className="flex-1 text-left">{group.label}</span>
              {/* Badge sur le header si groupe fermé */}
              {!isGroupOpen && badge > 0 && (
                <span className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
              <ChevronDown
                size={14}
                className={cn(
                  'transition-transform duration-200 flex-shrink-0',
                  isGroupOpen ? 'rotate-0' : '-rotate-90'
                )}
              />
            </button>

            {/* Items du groupe */}
            {isGroupOpen && (
              <div className="mt-1 space-y-0.5 pl-2">
                {group.items.map((item) => {
                  const active = isActive(item.href, item.exact)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onLinkClick}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                        active
                          ? 'bg-gold-500 text-white shadow-gold'
                          : 'text-white/55 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <item.icon size={16} className="flex-shrink-0" />
                      <span className="flex-1 leading-tight">{item.label}</span>
                      <ItemBadge href={item.href} />
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )

  // ── Contenu complet sidebar ─────────────────────────────────────────────────

  const SidebarContent = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <div className="flex flex-col h-full">
      <div className="px-6 py-6 border-b border-white/10 flex-shrink-0">
        <Link href="/" className="font-serif text-xl font-semibold text-white">
          L<span className="text-gold-400">&</span>Lui Signature
        </Link>
        <p className="text-white/40 text-xs mt-1">Administration</p>
      </div>

      <NavContent onLinkClick={onLinkClick} />

      <div className="px-3 py-4 border-t border-white/10 space-y-2 flex-shrink-0">
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/60 hover:bg-white/10 hover:text-white transition-all w-full"
        >
          Voir le site
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/60 hover:bg-red-500/20 hover:text-red-400 transition-all w-full"
        >
          <LogOut size={18} /> Déconnexion
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex w-60 bg-dark flex-col flex-shrink-0 h-screen sticky top-0 overflow-hidden">
        <SidebarContent />
      </aside>

      {/* ── Mobile: topbar hamburger ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-dark flex items-center justify-between px-4 py-3 h-14">
        <Link href="/" className="font-serif text-lg font-semibold text-white">
          L<span className="text-gold-400">&</span>Lui
        </Link>
        <button onClick={() => setDrawerOpen(!drawerOpen)} className="text-white/70 hover:text-white p-1">
          {drawerOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* ── Mobile: drawer iOS-compatible ── */}
      {drawerOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div
            className="fixed top-0 left-0 z-50 w-72 flex flex-col bg-dark"
            style={{ height: '100dvh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 px-6 py-5 flex justify-between items-center border-b border-white/10">
              <div>
                <p className="text-white font-bold text-xl font-serif">
                  L<span className="text-gold-400">&</span>Lui
                </p>
                <p className="text-white/40 text-xs">Administration</p>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-white/70 w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10"
              >
                <X size={22} />
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'scroll',
                WebkitOverflowScrolling: 'touch' as any,
                paddingBottom: '120px',
              }}
            >
              <SidebarContent onLinkClick={() => setDrawerOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
