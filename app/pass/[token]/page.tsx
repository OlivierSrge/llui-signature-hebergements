// app/pass/[token]/page.tsx — Page publique Pass VIP anonyme
// Validation visuelle par timestamp — aucun scan partenaire requis.

import { getPassVipParToken } from '@/actions/pass-vip'
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

  if (!pass.actif || new Date(pass.expires_at) < new Date()) {
    return <PassExpire pass={pass} />
  }

  return <PassVipCard pass={pass} />
}
