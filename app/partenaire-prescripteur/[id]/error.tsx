'use client'

export default function DashboardPartenaireError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 shadow-sm max-w-sm w-full text-center space-y-4">
        <p className="text-4xl">😕</p>
        <h1 className="text-lg font-serif font-bold text-[#1A1A1A]">
          Erreur d&apos;affichage
        </h1>
        <p className="text-sm text-[#1A1A1A]/60">
          Le dashboard n&apos;a pas pu se charger. Vérifiez votre connexion ou réessayez.
        </p>
        {error.digest && (
          <p className="text-[10px] font-mono text-[#1A1A1A]/30">ref: {error.digest}</p>
        )}
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={reset}
            className="w-full py-2.5 bg-[#C9A84C] text-white text-sm font-semibold rounded-xl hover:bg-[#b8963e] transition-colors"
          >
            Réessayer
          </button>
          <a
            href="/"
            className="w-full py-2.5 bg-[#F5F0E8] text-[#1A1A1A] text-sm font-medium rounded-xl text-center block"
          >
            Retour à l&apos;accueil
          </a>
        </div>
      </div>
    </div>
  )
}
