// components/PassIntrouvable.tsx

export default function PassIntrouvable() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F0E8] p-6">
      <div className="text-center max-w-xs">
        <p className="text-5xl mb-4">🔍</p>
        <h1 className="text-xl font-bold text-[#1A1A1A] mb-2">Pass introuvable</h1>
        <p className="text-sm text-gray-500 mb-6">
          Ce lien n&apos;est pas valide. Vérifiez votre message ou contactez L&amp;Lui Signature.
        </p>
        <a
          href="https://l-et-lui-signature.com"
          className="inline-block bg-[#C9A84C] text-white px-6 py-3 rounded-xl text-sm font-medium"
        >
          Obtenir un Pass VIP →
        </a>
      </div>
    </div>
  )
}
