export default function DashboardPartenaireNotFound() {
  return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 shadow-sm max-w-sm w-full text-center space-y-4">
        <p className="text-4xl">🔍</p>
        <h1 className="text-lg font-serif font-bold text-[#1A1A1A]">
          Partenaire introuvable
        </h1>
        <p className="text-sm text-[#1A1A1A]/60">
          Ce lien ne correspond à aucun prescripteur partenaire actif.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <a
            href="/admin/prescripteurs-partenaires"
            className="w-full py-2.5 bg-[#C9A84C] text-white text-sm font-semibold rounded-xl text-center block"
          >
            Retour à l&apos;administration
          </a>
          <a
            href="/"
            className="w-full py-2.5 bg-[#F5F0E8] text-[#1A1A1A] text-sm font-medium rounded-xl text-center block"
          >
            Accueil L&apos;&amp;Lui Signature
          </a>
        </div>
      </div>
    </div>
  )
}
