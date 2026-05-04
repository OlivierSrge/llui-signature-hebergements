// app/alliance-privee/mes-interets/page.tsx
import { cookies } from 'next/headers'
import Link from 'next/link'
import { getMesInterets } from '@/actions/alliance-privee-matching'
import { db } from '@/lib/firebase'
import { serialize } from '@/lib/serialize'
import MesInteretsClient from '@/components/alliance-privee/MesInteretsClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Mes intérêts — Alliance Privée' }

interface Props {
  searchParams: Record<string, string>
}

export default async function MesInteretsPage({ searchParams }: Props) {
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

  const interets = await getMesInterets(memberId)

  // Enrichir avec les portraits des cibles
  const portraitIds = [...new Set(interets.map((i) => i.to_member_id))]
  const portraitSnaps = await Promise.all(
    portraitIds.map((id) => db.collection('alliance_privee_portraits_verified').doc(id).get())
  )
  const portraits: Record<string, { prenom: string; age: number; ville: string; profession: string; photo?: string; tier: string }> = {}
  portraitSnaps.forEach((snap) => {
    if (snap.exists) {
      const d = snap.data()!
      portraits[snap.id] = {
        prenom: d.prenom,
        age: d.age,
        ville: d.ville,
        profession: d.profession,
        photo: d.photo_principale_floutee,
        tier: d.tier,
      }
    }
  })

  return (
    <MesInteretsClient
      memberId={memberId}
      interets={serialize(interets)}
      portraits={portraits}
    />
  )
}
