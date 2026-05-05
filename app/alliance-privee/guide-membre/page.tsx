import Link from 'next/link'
import GuideMembre from './GuideMembre'
import PrintButton from '@/components/PrintButton'

export const metadata = {
  title: 'Guide Membre — Alliance Privée',
  description: 'Tout ce que vous devez savoir pour utiliser Alliance Privée',
}

export default function GuideMembre_Page() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* ── Topbar ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#C9A84C]/10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-white/30">
            <Link href="/alliance-privee/dashboard" className="hover:text-white/60 transition-colors">
              Accueil
            </Link>
            <span>/</span>
            <span className="text-[#C9A84C]/70">Guide Membre</span>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <PrintButton />
            <Link
              href="/alliance-privee/dashboard"
              className="text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 pt-10 pb-6">
        <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-2">✦ Alliance Privée</p>
        <h1
          className="text-3xl font-light text-white mb-2"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Guide Membre
        </h1>
        <p className="text-white/30 text-sm">Version 1.0 — Mai 2026</p>
      </div>

      {/* ── Contenu Markdown ────────────────────────────────────────── */}
      <GuideMembre />

      {/* ── Footer actions ──────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 py-12 border-t border-[#C9A84C]/10 mt-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            href="/alliance-privee/dashboard"
            className="text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            ← Retour au Dashboard
          </Link>
          <a
            href="https://wa.me/237693407964"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-[#C9A84C]/70 hover:text-[#C9A84C] transition-colors"
          >
            💬 Besoin d&apos;aide ? Contactez-nous
          </a>
        </div>
      </div>
    </div>
  )
}
