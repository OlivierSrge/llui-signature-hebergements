import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
export const dynamic = 'force-dynamic'

export const dynamic = 'force-dynamic'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  )
}
