import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: { application_id?: string }
}

export default function AllianceAttentePage({ searchParams }: Props) {
  const { application_id } = searchParams

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-5 py-16 flex flex-col items-center text-center">
        {/* Icône animée */}
        <div className="w-20 h-20 rounded-full border border-amber-500/30 bg-amber-500/10 flex items-center justify-center mb-8">
          <span className="text-amber-400 text-3xl">⏳</span>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs tracking-widest uppercase mb-6">
          <span>✦</span>
          <span>Alliance Privée</span>
          <span>✦</span>
        </div>

        <h1 className="text-2xl font-serif font-light text-white mb-4">
          Candidature en cours d&apos;examen
        </h1>

        {/* Statuts */}
        <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-5 mb-6 space-y-4 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xs text-amber-400">1</div>
              <div>
                <p className="text-white/80 text-sm font-medium">Justificatif de paiement</p>
                <p className="text-white/30 text-xs">En cours de vérification</p>
              </div>
            </div>
            <span className="text-amber-400 text-xs px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10">
              En vérification
            </span>
          </div>

          <div className="w-px h-4 bg-white/10 ml-4" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs text-white/30">2</div>
              <div>
                <p className="text-white/50 text-sm font-medium">Portrait de cœur</p>
                <p className="text-white/20 text-xs">En examen</p>
              </div>
            </div>
            <span className="text-white/30 text-xs px-2 py-0.5 rounded-full border border-white/10 bg-white/5">
              En attente
            </span>
          </div>
        </div>

        <p className="text-white/50 text-sm leading-relaxed mb-2">
          Nous vérifions votre justificatif de paiement et examinons votre Portrait de Cœur.
        </p>
        <p className="text-white/30 text-sm mb-8">
          Réponse sous <strong className="text-white/50">48–72h</strong> par email et WhatsApp.
        </p>

        {application_id && (
          <p className="text-white/20 text-xs font-mono mb-6">Ref. {application_id}</p>
        )}

        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-xl border border-white/10 text-white/50 text-sm hover:border-white/20 hover:text-white/70 transition-colors"
        >
          Retour à l&apos;accueil
        </Link>

        <p className="text-white/15 text-xs mt-8">Confidentialité absolue garantie · Alliance Privée L&Lui</p>
      </div>
    </div>
  )
}
