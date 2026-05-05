import Link from 'next/link'
import GuidePartenaireClient from './GuidePartenaireClient'

export const metadata = {
  title: 'Guide Partenaire — Alliance Privée',
  description: 'Rejoignez le réseau de lieux partenaires Alliance Privée — L&Lui Signature Hébergements',
}

export default function GuidePartenairePage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* ── Topbar ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#C9A84C]/10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <nav className="flex items-center gap-2 text-xs text-white/30">
            <Link href="/" className="hover:text-white/60 transition-colors">L&amp;Lui Signature</Link>
            <span>/</span>
            <span className="text-[#C9A84C]/70">Partenaires Alliance Privée</span>
          </nav>
          <a
            href="https://wa.me/237693407964?text=Bonjour,%20je%20souhaite%20devenir%20partenaire%20Alliance%20Priv%C3%A9e"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#C9A84C] hover:bg-[#B8963C] text-black text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            Devenir Partenaire →
          </a>
        </div>
      </div>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0A0A0A 0%, #111108 50%, #0A0A0A 100%)' }}
      >
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #C9A84C 0%, transparent 70%)' }} />
        <div className="relative max-w-6xl mx-auto px-4 pt-16 pb-12">
          <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-4">✦ Alliance Privée</p>
          <h1
            className="text-4xl md:text-5xl font-light text-white mb-4 leading-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Devenez un lieu<br />
            <span className="text-[#C9A84C]">d&apos;exception</span>
          </h1>
          <p className="text-white/50 text-lg max-w-2xl mb-8 leading-relaxed">
            Rejoignez le premier réseau de lieux partenaires du club de rencontre sélectif du Cameroun.
            Une clientèle exigeante, une image premium, zéro commission.
          </p>

          {/* 3 piliers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
            {[
              { icon: '🔐', label: 'Exclusivité', desc: 'Seulement 5 partenaires par ville' },
              { icon: '💎', label: 'Clientèle premium', desc: 'Diaspora et élites locales validés' },
              { icon: '🎯', label: 'Sans commission', desc: 'Participation entièrement gratuite' },
            ].map((p) => (
              <div key={p.label} className="bg-[#C9A84C]/5 border border-[#C9A84C]/10 rounded-2xl p-4">
                <p className="text-2xl mb-2">{p.icon}</p>
                <p className="text-[#C9A84C] text-sm font-semibold mb-1">{p.label}</p>
                <p className="text-white/40 text-xs leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Guide Markdown ──────────────────────────────────────────── */}
      <GuidePartenaireClient />

      {/* ── CTA Final ───────────────────────────────────────────────── */}
      <div className="border-t border-[#C9A84C]/10 bg-[#0A0A0A]">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-4">Rejoindre le réseau</p>
          <h2
            className="text-2xl font-light text-white mb-4"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Prêt à accueillir des membres Alliance Privée ?
          </h2>
          <p className="text-white/40 text-sm mb-8 max-w-lg mx-auto leading-relaxed">
            Contactez-nous par WhatsApp pour recevoir votre kit marketing et activer votre partenariat.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://wa.me/237693407964?text=Bonjour,%20je%20souhaite%20devenir%20partenaire%20Alliance%20Priv%C3%A9e"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#C9A84C] hover:bg-[#B8963C] text-black font-semibold px-8 py-4 rounded-2xl transition-colors text-sm"
            >
              📱 Contacter via WhatsApp
            </a>
            <a
              href="mailto:partenaires@l-et-lui-signature.com"
              className="border border-[#C9A84C]/30 text-[#C9A84C]/70 hover:border-[#C9A84C]/60 hover:text-[#C9A84C] px-8 py-4 rounded-2xl transition-colors text-sm"
            >
              ✉️ Email partenaires
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
