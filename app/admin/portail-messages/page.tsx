// app/admin/portail-messages/page.tsx — #18 Templates WhatsApp portail marié
// Bibliothèque de messages réutilisables avec variables {prénom} {date} {montant}

import PortailMessagesClient from '@/components/admin/PortailMessagesClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Messages Portail Mariés | Admin' }

export default function PortailMessagesPage() {
  return <PortailMessagesClient />
}
