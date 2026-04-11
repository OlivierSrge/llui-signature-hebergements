import { redirect } from 'next/navigation'
import { genererCodeSession, getPrescripteurPartenaire } from '@/actions/codes-sessions'

export const dynamic = 'force-dynamic'

interface Props {
  params: { id: string }
}

export default async function PromoPage({ params }: Props) {
  const { id } = params
  const partenaire = await getPrescripteurPartenaire(id)

  // Partenaire inactif ou expiré
  if (!partenaire || partenaire.statut !== 'actif') {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-sm">
          <div className="text-4xl mb-4">🔴</div>
          <h1 className="text-xl font-serif font-semibold text-[#1A1A1A] mb-2">
            Partenaire inactif
          </h1>
          <p className="text-sm text-[#1A1A1A]/60 mb-6">
            Ce QR code n&apos;est plus actif pour le moment.
          </p>
          <a href="/hebergements"
            className="block w-full py-3 bg-[#C9A84C] text-white font-semibold rounded-xl text-center">
            🏠 Voir nos hébergements
          </a>
        </div>
      </div>
    )
  }

  const now = new Date()
  const forfaitExpire = new Date(partenaire.forfait_expire_at) < now

  if (forfaitExpire) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-sm">
          <div className="text-4xl mb-4">⏰</div>
          <h1 className="text-xl font-serif font-semibold text-[#1A1A1A] mb-2">
            Offre temporairement indisponible
          </h1>
          <p className="text-sm text-[#1A1A1A]/60 mb-6">
            Le partenariat de <strong>{partenaire.nom_etablissement}</strong> est en cours de renouvellement.
          </p>
          <a href="/hebergements"
            className="block w-full py-3 bg-[#C9A84C] text-white font-semibold rounded-xl text-center">
            🏠 Voir nos hébergements
          </a>
        </div>
      </div>
    )
  }

  // Générer le code
  const result = await genererCodeSession(id)

  if (!result.success || !result.code) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-sm">
          <div className="text-4xl mb-4">❌</div>
          <h1 className="text-xl font-serif font-semibold text-[#1A1A1A] mb-2">Erreur</h1>
          <p className="text-sm text-[#1A1A1A]/60 mb-6">
            Impossible de générer votre code. Réessayez.
          </p>
          <a href="/hebergements"
            className="block w-full py-3 bg-[#C9A84C] text-white font-semibold rounded-xl text-center">
            🏠 Voir nos hébergements
          </a>
        </div>
      </div>
    )
  }

  redirect(`/sejour/${result.code}`)
}
