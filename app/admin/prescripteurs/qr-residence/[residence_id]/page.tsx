export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { db } from '@/lib/firebase'
import QRResidencePrint from './QRResidencePrint'

export const metadata = { title: 'QR Résidence – Impression' }

export default async function QrResidencePage({ params }: { params: { residence_id: string } }) {
  const doc = await db.collection('hebergements').doc(params.residence_id).get()
  if (!doc.exists) notFound()

  const data = doc.data()!
  const qrPayload = JSON.stringify({
    type: 'residence',
    residence_id: params.residence_id,
    nom: data.name,
  })

  return (
    <QRResidencePrint
      residenceId={params.residence_id}
      nom={data.name as string}
      qrPayload={qrPayload}
    />
  )
}
