import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import BoutonCalendrier from '@/components/calendrier/BoutonCalendrier'
export const dynamic = 'force-dynamic'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <Footer />
      <BoutonCalendrier />
    </>
  )
}
