export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { db } from '@/lib/firebase'
import { getClientPointsHistory } from '@/actions/fidelite'
import { LOYALTY_LEVELS } from '@/lib/loyaltyDefaults'
import FideliteClientDetail from '@/components/admin/FideliteClientDetail'

export async function generateMetadata({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  const doc = await db.collection('clients').doc(clientId).get()
  if (!doc.exists) return { title: 'Client introuvable' }
  const data = doc.data() as any
  return { title: `${data.firstName} ${data.lastName} — Fidélité L&Lui Stars` }
}

export default async function FideliteClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  const doc = await db.collection('clients').doc(clientId).get()
  if (!doc.exists) return notFound()

  const raw = doc.data() as any
  const client = {
    id: doc.id,
    firstName: raw.firstName || '',
    lastName: raw.lastName || '',
    email: raw.email || '',
    phone: raw.phone || null,
    birthDate: raw.birthDate || null,
    memberCode: raw.memberCode || doc.id,
    niveau: raw.niveau || 'novice',
    totalSejours: raw.totalSejours || 0,
    totalPoints: raw.totalPoints || 0,
    boutiqueDiscount: raw.boutiqueDiscount || 0,
    boutiquePromoCode: raw.boutiquePromoCode || null,
    boutiquePromoCodeExpiry: raw.boutiquePromoCodeExpiry || null,
    boutiquePromoCodeGeneratedAt: raw.boutiquePromoCodeGeneratedAt || null,
    boutiquePromoCodeSentAt: raw.boutiquePromoCodeSentAt || null,
    referralCode: raw.referralCode || null,
    referrals: raw.referrals || [],
    referredBy: raw.referredBy || null,
    levelChangedAt: raw.levelChangedAt || null,
    levelChangeReason: raw.levelChangeReason || null,
  }

  const pointsHistory = await getClientPointsHistory(clientId)

  // Calculer le prochain niveau
  const levelKeys = ['novice', 'explorateur', 'ambassadeur', 'excellence'] as const
  const currentIdx = levelKeys.indexOf(client.niveau as typeof levelKeys[number])
  const nextLevelKey = currentIdx < levelKeys.length - 1 ? levelKeys[currentIdx + 1] : null
  const nextLevel = nextLevelKey ? {
    label: LOYALTY_LEVELS[nextLevelKey].label,
    emoji: LOYALTY_LEVELS[nextLevelKey].emoji,
    minStays: LOYALTY_LEVELS[nextLevelKey].minStays,
  } : null

  const currentLevelData = LOYALTY_LEVELS[client.niveau as keyof typeof LOYALTY_LEVELS] || LOYALTY_LEVELS.novice
  const sejoursToNext = nextLevel ? Math.max(0, nextLevel.minStays - client.totalSejours) : null
  const progressPercent = nextLevel
    ? Math.min(100, Math.round(
        ((client.totalSejours - currentLevelData.minStays) /
         (nextLevel.minStays - currentLevelData.minStays)) * 100
      ))
    : 100

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0 space-y-6">
      {/* En-tête */}
      <div className="flex items-start gap-4">
        <Link href="/admin/fidelite/clients"
          className="mt-1 p-2 rounded-xl border border-beige-200 hover:bg-beige-50 text-dark/50 hover:text-dark">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-3xl font-semibold text-dark">
            {client.firstName} {client.lastName}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-dark/50">
            <span>{client.email}</span>
            {client.phone && <span>· {client.phone}</span>}
            {client.memberCode && (
              <span className="font-mono text-xs bg-beige-100 px-2 py-0.5 rounded-lg text-dark/60">
                {client.memberCode}
              </span>
            )}
          </div>
        </div>
      </div>

      <FideliteClientDetail
        client={client}
        pointsHistory={pointsHistory}
        nextLevel={nextLevel}
        progressPercent={progressPercent}
        sejoursToNext={sejoursToNext}
      />
    </div>
  )
}
