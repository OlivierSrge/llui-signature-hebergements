// app/admin/commandes/page.tsx — Server Component wrapper
import CommandesClient from './CommandesClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Commandes | Admin L&Lui' }

export default function CommandesPage() {
  return <CommandesClient />
}
