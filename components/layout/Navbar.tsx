'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const isHeroPage = pathname === '/'

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { href: '/', label: 'Hébergements' },
    { href: '/packs', label: 'Nos Packs' },
    { href: '/espace-client', label: 'Mes réservations' },
  ]

  return (
    <header className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      scrolled || !isHeroPage || isOpen
        ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-beige-200'
        : 'bg-transparent'
    )}>
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-4">
          <Link href="/" className="flex-shrink-0">
            <span className={cn(
              'font-serif text-2xl font-semibold tracking-wide transition-colors',
              scrolled || !isHeroPage ? 'text-dark' : 'text-white drop-shadow-sm'
            )}>
              L<span className="text-gold-500">&</span>Lui Signature
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={cn(
                'text-sm font-medium transition-colors duration-200',
                pathname === link.href
                  ? 'text-gold-600'
                  : scrolled || !isHeroPage
                    ? 'text-dark/70 hover:text-gold-600'
                    : 'text-white/90 hover:text-white'
              )}>
                {link.label}
              </Link>
            ))}
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              'md:hidden p-2 rounded-lg transition-colors',
              scrolled || !isHeroPage || isOpen ? 'text-dark hover:bg-beige-100' : 'text-white hover:bg-white/10'
            )}
            aria-label="Menu"
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden pb-4 border-t border-beige-200 animate-slide-up">
            <div className="flex flex-col gap-1 pt-3">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setIsOpen(false)}
                  className={cn(
                    'px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    pathname === link.href ? 'text-gold-600 bg-gold-50' : 'text-dark/70 hover:text-dark hover:bg-beige-100'
                  )}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
