// app/stars/scan/page.tsx
// Page client : scanner le QR partenaire pour initier une transaction Stars
// Accessible via /stars/scan?tel=+237XXXXXXXX (lien depuis ElectronicPass)

import { redirect } from 'next/navigation'
import ScanClient from './ScanClient'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: { tel?: string }
}

export default function ScanPage({ searchParams }: Props) {
  const tel = searchParams.tel

  // Require tel param — redirect to accueil if missing
  if (!tel || !tel.startsWith('+')) {
    redirect('/hebergements')
  }

  return <ScanClient clientTel={tel} />
}
