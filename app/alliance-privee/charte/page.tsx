import Link from 'next/link'
import CharteClient from './CharteClient'

export const metadata = {
  title: 'Charte Alliance Privée',
  description: 'Conditions générales et charte du club Alliance Privée par L&Lui Signature',
}

export default function ChartePage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* ── Topbar ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#D4B896]/10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <nav className="flex items-center gap-2 text-xs text-white/30">
            <Link href="/" className="hover:text-white/60 transition-colors">Accueil</Link>
            <span>/</span>
            <span className="text-[#D4B896]/70">Charte Alliance Privée</span>
          </nav>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="hidden sm:flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimer
            </button>
          </div>
        </div>
      </div>

      {/* ── Header légal ────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 pt-10 pb-6">
        <p className="text-[#D4B896] text-xs tracking-widest uppercase mb-2">Document officiel</p>
        <h1
          className="text-3xl font-light text-white mb-2"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Charte Alliance Privée
        </h1>
        <p className="text-white/30 text-sm">Version 1.0 — Mai 2026 · L&amp;Lui Signature Hébergements</p>
        <div className="mt-4 inline-flex items-center gap-2 bg-[#D4B896]/5 border border-[#D4B896]/15 rounded-xl px-4 py-2">
          <svg className="w-3.5 h-3.5 text-[#D4B896]/60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-[#D4B896]/60 text-xs">
            Document contractuel — Acceptation obligatoire lors de la candidature
          </span>
        </div>
      </div>

      {/* ── Contenu ─────────────────────────────────────────────────── */}
      <CharteClient />

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 py-12 border-t border-[#D4B896]/10 mt-8">
        <p className="text-center text-white/20 text-xs">
          Charte Alliance Privée · Version 1.0 · Mai 2026<br />
          L&amp;Lui Signature Hébergements · Kribi, Cameroun · Tous droits réservés
        </p>
      </div>
    </div>
  )
}
