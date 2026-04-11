import { getCodeSession } from '@/actions/codes-sessions'
import SejourClient from './SejourClient'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface Props {
  params: { code: string }
}

export default async function SejourPage({ params }: Props) {
  const session = await getCodeSession(params.code)

  if (!session) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-sm">
          <div className="text-4xl mb-4">❓</div>
          <h1 className="text-xl font-serif font-semibold text-[#1A1A1A] mb-2">Code introuvable</h1>
          <p className="text-sm text-[#1A1A1A]/60 mb-6">Le code <strong>{params.code}</strong> n&apos;existe pas.</p>
          <Link href="/hebergements" className="block py-3 bg-[#C9A84C] text-white font-semibold rounded-xl">
            🏠 Voir nos hébergements
          </Link>
        </div>
      </div>
    )
  }

  return <SejourClient session={session} />
}
