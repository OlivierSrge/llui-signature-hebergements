// app/pass/[token]/page.tsx — Page publique Pass VIP anonyme
// Activation automatique au premier clic (pending → actif).
// Validation visuelle par timestamp — aucun scan partenaire requis.

import { getPassVipParToken, activerPassAuPremierClic } from '@/actions/pass-vip'
import PassVipCard from '@/components/PassVipCard'
import PassIntrouvable from '@/components/PassIntrouvable'
import PassExpire from '@/components/PassExpire'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const pass = await getPassVipParToken(token)
  if (!pass) return { title: 'Pass introuvable — L&Lui Signature' }
  return { title: `Pass VIP ${pass.grade_pass} — ${pass.nom_usage} · L&Lui Signature` }
}

export default async function PassVipPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const pass = await getPassVipParToken(token)

  if (!pass) return <PassIntrouvable />

  // Pass expiré (actif mais hors délai)
  if (pass.actif && new Date(pass.expires_at) < new Date()) {
    return <PassExpire pass={pass} />
  }

  // Pass pending → activer au premier clic
  if (pass.statut === 'pending' && !pass.actif) {
    await activerPassAuPremierClic(token)
    // Re-lire pour avoir expires_at recalculé et statut = 'actif'
    const passActif = await getPassVipParToken(token)
    if (!passActif) return <PassIntrouvable />
    return <PassVipCard pass={passActif} />
  }

  // Pass déjà actif → afficher directement
  if (pass.actif) {
    return <PassVipCard pass={pass} />
  }

  return <PassIntrouvable />
}
