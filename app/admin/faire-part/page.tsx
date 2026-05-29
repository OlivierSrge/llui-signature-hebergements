// app/admin/faire-part/page.tsx — Admin invitations numériques

import { getDb } from '@/lib/firebase'
import FairePartAdminClient from '@/components/admin/faire-part/FairePartAdminClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Faire-part numérique | Admin' }

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'

async function getFairePartData(marie_uid: string) {
  try {
    const db = getDb()
    const [snap, rsvpSnap] = await Promise.all([
      db.collection('portail_users').doc(marie_uid).get(),
      db.collection('portail_users').doc(marie_uid).collection('rsvp')
        .orderBy('created_at', 'desc').limit(200).get(),
    ])
    if (!snap.exists) return null
    const d = snap.data()!

    const rsvp_list = rsvpSnap.docs.map(doc => {
      const r = doc.data()
      const createdAt = r.created_at?.toDate?.()?.toISOString?.() ?? (typeof r.created_at === 'string' ? r.created_at : '')
      return {
        id: doc.id,
        prenom: (r.prenom as string) || '',
        nom: (r.nom as string) || '',
        presence: (r.presence as 'present' | 'absent') || 'absent',
        nb_accompagnants: (r.nb_accompagnants as number) || 0,
        message: (r.message as string) || '',
        created_at: createdAt,
      }
    })

    return {
      noms_maries: (d.noms_maries as string) || '',
      date_mariage: (d.date_mariage as string) || '',
      lieu: (d.lieu as string) || 'Kribi, Cameroun',
      rsvp_list,
    }
  } catch {
    return null
  }
}

export default async function AdminFairePartPage() {
  const MARIE_UID = 'mariage_diane_charly_2026'
  const data = await getFairePartData(MARIE_UID)
  const adminApiKey = process.env.ADMIN_API_KEY ?? ''

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Invitations numériques</h1>
        <p className="text-sm text-[#1A1A1A]/50 mt-1">Faire-part · Gestion envois · Suivi RSVP</p>
      </div>

      {!data ? (
        <div className="rounded-2xl p-8 text-center bg-white border border-gray-100 shadow-sm">
          <p className="text-4xl mb-4">💍</p>
          <p className="font-semibold text-[#1A1A1A]">Mariage introuvable</p>
          <p className="text-sm text-[#1A1A1A]/45 mt-2">
            Document <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{MARIE_UID}</code> absent de Firestore.
          </p>
          <p className="text-xs text-[#1A1A1A]/30 mt-2">
            Relancez : <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">node scripts/init-diane-charly.js</code>
          </p>
        </div>
      ) : (
        <FairePartAdminClient
          marie_uid={MARIE_UID}
          noms_maries={data.noms_maries}
          date_mariage={data.date_mariage}
          lieu={data.lieu}
          faire_part_url={`${APP_URL}/faire-part/${MARIE_UID}`}
          rsvp_list={data.rsvp_list}
          admin_api_key={adminApiKey}
        />
      )}
    </div>
  )
}
