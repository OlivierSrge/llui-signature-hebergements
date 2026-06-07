import { listerPrescripteursPartenaires } from '@/actions/codes-sessions'
import { db } from '@/lib/firebase'
import { serialize } from '@/lib/serialize'
import CreateLoyaltyProgramClient from '@/components/loyalty/CreateLoyaltyProgramClient'

export const dynamic = 'force-dynamic'

async function listerHebergements(): Promise<{ uid: string; nom: string }[]> {
  try {
    const snap = await db.collection('partenaires').get()
    return snap.docs
      .map((d) => {
        const data = d.data()
        const nom: string = (data.name as string | undefined) ?? (data.nom as string | undefined) ?? d.id
        return { uid: d.id, nom }
      })
      .filter((p) => p.nom)
      .sort((a, b) => a.nom.localeCompare(b.nom))
  } catch (e) {
    console.error('[AdminLoyaltyCreate] listerHebergements error:', e)
    return []
  }
}

export default async function AdminCreateLoyaltyProgramPage() {
  const [prescripteurs, hebergements] = await Promise.all([
    listerPrescripteursPartenaires(),
    listerHebergements(),
  ])

  return (
    <CreateLoyaltyProgramClient
      partenaires={serialize(prescripteurs)}
      hebergements={serialize(hebergements)}
    />
  )
}
