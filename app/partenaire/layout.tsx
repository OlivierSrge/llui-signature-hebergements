import PartnerMobileNav from '@/components/partner/PartnerMobileNav'

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-beige-50">
      <div className="pb-16 lg:pb-0">
        {children}
      </div>
      <PartnerMobileNav />
    </div>
  )
}
