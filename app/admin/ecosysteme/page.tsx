// app/admin/ecosysteme/page.tsx — Vue globale 4 plateformes (Server Component wrapper)
import EcosystemeClient from '@/components/admin/portail/EcosystemeClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Écosystème | Admin L&Lui' }

export default function EcosystemePage() {
  return <EcosystemeClient />
}
