// app/admin/sante-invites/page.tsx — #185 Espace santé invités (Server Component)
import { getDb } from '@/lib/firebase'
import SanteInvitesClient from '@/components/admin/SanteInvitesClient'

export const dynamic = 'force-dynamic'

interface RSVPGuest {
  id: string
  prenom: string
  nom: string
  tel?: string
  allergies?: string
  pmr?: boolean
  presence?: string
  marie_uid: string
  noms_maries?: string
}

async function getAllRSVP() {
  try {
    const db = getDb()
    // Récupère tous les mariés actifs
    const mariesSnap = await db.collection('portail_users').where('role', '==', 'MARIÉ').limit(50).get()
    const guests: RSVPGuest[] = []

    await Promise.all(mariesSnap.docs.map(async (marieDoc) => {
      const marie = marieDoc.data()
      const rsvpSnap = await db.collection('portail_users').doc(marieDoc.id)
        .collection('rsvp_guests').where('presence', '==', 'oui').get()
      for (const g of rsvpSnap.docs) {
        const gd = g.data()
        if (gd.allergies || gd.pmr) {
          guests.push({
            id: g.id,
            prenom: gd.prenom || '',
            nom: gd.nom || '',
            tel: gd.tel || '',
            allergies: gd.allergies || '',
            pmr: gd.pmr ?? false,
            presence: gd.presence || '',
            marie_uid: marieDoc.id,
            noms_maries: marie.noms_maries || '',
          })
        }
      }
    }))

    return guests
  } catch { return [] }
}

export default async function SanteInvitesPage() {
  const guests = await getAllRSVP()
  return <SanteInvitesClient guests={guests} />
}
