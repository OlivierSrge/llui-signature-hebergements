import { cookies } from 'next/headers'
import { db } from '@/lib/firebase'
import PartnerMobileNav from '@/components/partner/PartnerMobileNav'
import SuspendedPage from '@/components/partner/SuspendedPage'

async function getPartnerSubscriptionStatus(partnerId: string) {
  const doc = await db.collection('partenaires').doc(partnerId).get()
  if (!doc.exists) return null
  const d = doc.data()!
  return {
    name: d.name as string,
    subscriptionStatus: (d.subscriptionStatus as string) || 'active',
    subscriptionEndDate: (d.subscriptionEndDate as string) || null,
    trialEndsAt: (d.trialEndsAt as string) || null,
  }
}

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies()
  const partnerId = cookieStore.get('partner_session')?.value
  if (partnerId) {
    const sub = await getPartnerSubscriptionStatus(partnerId)
    if (sub) {
      const now = new Date().toISOString()
      const isExpired =
        sub.subscriptionStatus === 'expired' ||
        sub.subscriptionStatus === 'suspended' ||
        (sub.subscriptionEndDate && sub.subscriptionEndDate < now && sub.subscriptionStatus !== 'trial') ||
        (sub.subscriptionStatus === 'trial' && sub.trialEndsAt && sub.trialEndsAt < now)
      if (isExpired) return <SuspendedPage partnerName={sub.name} />
    }
  }
  return (
    <div className="min-h-screen bg-beige-50">
      <div className="pb-16 lg:pb-0">{children}</div>
      <PartnerMobileNav />
    </div>
  )
}
