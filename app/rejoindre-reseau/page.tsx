import type { Metadata } from 'next'
import Link from 'next/link'
import RejoindreReseauForm from '@/components/prestataires/RejoindreReseauForm'

export const metadata: Metadata = {
  title: 'Rejoignez le réseau L&Lui Signature | Prestataires Kribi',
  description: 'Développez votre activité grâce au réseau de clients premium de L&Lui Signature à Kribi.',
}

export default function RejoindreReseauPage() {
  return (
    <div className="min-h-screen" style={{ background: '#F5F0E8' }}>
      {/* ── En-tête ── */}
      <section className="px-4 pt-12 pb-8 text-center" style={{ background: '#1A1A1A' }}>
        <div className="max-w-xl mx-auto">
          <Link href="/" className="text-[#C9A84C] font-serif text-base font-semibold tracking-wide block mb-6">
            L&amp;Lui Signature
          </Link>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-3">
            Rejoignez le réseau<br />
            <em className="text-[#C9A84C] not-italic">L&amp;Lui Signature</em>
          </h1>
          <p className="text-white/50 text-sm">
            Développez votre activité grâce à notre réseau de clients<br className="hidden sm:inline" />
            à Kribi et au Cameroun
          </p>
        </div>
      </section>

      <RejoindreReseauForm />

      {/* ── Lien retour ── */}
      <div className="text-center pb-10">
        <Link href="/prestataires" className="text-sm text-[#1A1A1A]/40 hover:text-[#1A1A1A] transition-colors underline underline-offset-2">
          ← Voir l&apos;annuaire des prestataires
        </Link>
      </div>
    </div>
  )
}
