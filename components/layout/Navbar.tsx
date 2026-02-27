'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, User, LogOut, LayoutDashboard } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Profile } from '@/lib/types'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const isHeroPage = pathname === '/'

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(data)
      }
    }
    getProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      getProfile()
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    router.push('/')
    router.refresh()
  }

  const navLinks = [
    { href: '/', label: 'Hébergements' },
    { href: '/espace-client', label: 'Mes réservations' },
  ]

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled || !isHeroPage || isOpen
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-beige-200'
          : 'bg-transparent'
      )}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-4">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <span
              className={cn(
                'font-serif text-2xl font-semibold tracking-wide transition-colors',
                scrolled || !isHeroPage
                  ? 'text-dark'
                  : 'text-white drop-shadow-sm'
              )}
            >
              L<span className="text-gold-500">&</span>Lui Signature
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm font-medium transition-colors duration-200',
                  pathname === link.href
                    ? 'text-gold-600'
                    : scrolled || !isHeroPage
                      ? 'text-dark/70 hover:text-gold-600'
                      : 'text-white/90 hover:text-white'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3">
            {profile ? (
              <div className="flex items-center gap-3">
                {profile.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-1.5 text-sm font-medium text-gold-600 hover:text-gold-700 transition-colors"
                  >
                    <LayoutDashboard size={15} />
                    Admin
                  </Link>
                )}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-beige-100 rounded-full">
                  <User size={14} className="text-gold-600" />
                  <span className="text-sm text-dark/70">
                    {profile.first_name || 'Mon compte'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-sm text-dark/50 hover:text-dark transition-colors"
                >
                  <LogOut size={14} />
                  Déconnexion
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/auth/connexion"
                  className={cn(
                    'text-sm font-medium transition-colors',
                    scrolled || !isHeroPage
                      ? 'text-dark/70 hover:text-dark'
                      : 'text-white/90 hover:text-white'
                  )}
                >
                  Connexion
                </Link>
                <Link href="/auth/inscription" className="btn-primary text-sm px-4 py-2">
                  S&apos;inscrire
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              'md:hidden p-2 rounded-lg transition-colors',
              scrolled || !isHeroPage || isOpen
                ? 'text-dark hover:bg-beige-100'
                : 'text-white hover:bg-white/10'
            )}
            aria-label="Menu"
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden pb-4 border-t border-beige-200 animate-slide-up">
            <div className="flex flex-col gap-1 pt-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    pathname === link.href
                      ? 'text-gold-600 bg-gold-50'
                      : 'text-dark/70 hover:text-dark hover:bg-beige-100'
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-3 pt-3 border-t border-beige-200">
                {profile ? (
                  <>
                    {profile.role === 'admin' && (
                      <Link
                        href="/admin"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2 px-3 py-2.5 text-sm text-gold-600 font-medium"
                      >
                        <LayoutDashboard size={15} /> Dashboard Admin
                      </Link>
                    )}
                    <button
                      onClick={() => { handleLogout(); setIsOpen(false) }}
                      className="flex items-center gap-2 px-3 py-2.5 text-sm text-dark/60 w-full"
                    >
                      <LogOut size={14} /> Déconnexion
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/auth/connexion"
                      onClick={() => setIsOpen(false)}
                      className="btn-secondary text-sm text-center"
                    >
                      Connexion
                    </Link>
                    <Link
                      href="/auth/inscription"
                      onClick={() => setIsOpen(false)}
                      className="btn-primary text-sm text-center"
                    >
                      S&apos;inscrire
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
