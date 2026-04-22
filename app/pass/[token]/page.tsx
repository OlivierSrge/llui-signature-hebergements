// app/pass/[token]/page.tsx — Page publique Pass VIP anonyme
// pending → page d'attente ; actif → carte ; expiré → PassExpire
// Activation manuelle par Olivier via /api/pass/activer/[token]?secret=…

import { getPassVipParToken } from '@/actions/pass-vip'
import PassVipCard from '@/components/PassVipCard'
import PassIntrouvable from '@/components/PassIntrouvable'
import PassExpire from '@/components/PassExpire'
import PassEnAttente from '@/components/PassEnAttente'

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

  // Pass en attente de paiement → page d'attente (Olivier active via son email)
  if (pass.statut === 'pending' && !pass.actif) {
    return <PassEnAttente pass={pass} />
  }

  // Pass expiré (actif mais hors délai)
  if (pass.actif && new Date(pass.expires_at) < new Date()) {
    return <PassExpire pass={pass} />
  }

  // Pass actif → afficher la carte
  if (pass.actif) {
    return <PassVipCard pass={pass} />
  }

  return <PassIntrouvable />
}
