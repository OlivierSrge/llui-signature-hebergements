// app/alliance-privee/profils-compatibles/page.tsx
import { cookies } from 'next/headers'
import Link from 'next/link'
import { getProfilsCompatibles } from '@/actions/alliance-privee-matching'
import { serialize } from '@/lib/serialize'
import ProfilsCompatiblesClient from '@/components/alliance-privee/ProfilsCompatiblesClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Profils compatibles — Alliance Privée' }

interface Props {
  searchParams: Record<string, string>
}

export default async function ProfilsCompatiblesPage({ searchParams }: Props) {
  const cookieStore = await cookies()
  const memberId = searchParams.demo ?? cookieStore.get('alliance_member_id')?.value ?? null

  if (!memberId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-5">
        <div className="text-center text-white/40">
          <p>Accès réservé aux membres.</p>
          <Link href="/alliance-privee/dashboard" className="text-amber-500/60 text-sm mt-3 block">← Dashboard</Link>
        </div>
      </div>
    )
  }

  const profils = await getProfilsCompatibles(memberId).catch(() => [])

  return (
    <ProfilsCompatiblesClient
      memberId={memberId}
      profils={serialize(profils)}
    />
  )
}
