// app/stars/client/[token]/page.tsx
// Page ouverte quand le partenaire scanne le QR personnel du client.

import { getQrTokenData } from '@/actions/stars-qr-token'
import ClientScanView from './ClientScanView'

export const dynamic = 'force-dynamic'

interface Props {
  params: { token: string }
}

export default async function StarsClientQrPage({ params }: Props) {
  const result = await getQrTokenData(params.token)

  if (!result.valid) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-sm space-y-4">
          <div className="text-5xl">⚠️</div>
          <h1 className="text-lg font-semibold text-[#1A1A1A]">QR Code invalide</h1>
          <p className="text-sm text-[#1A1A1A]/60">{result.error}</p>
          <p className="text-xs text-[#1A1A1A]/40 mt-2">
            Demandez au client d&apos;afficher un nouveau QR Code depuis son dashboard L&amp;Lui Stars.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ClientScanView
      token={params.token}
      clientData={result.clientData}
      expiresAt={result.expiresAt}
      params={result.params}
    />
  )
}
