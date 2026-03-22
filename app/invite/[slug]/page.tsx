// app/invite/[slug]/page.tsx — Page publique invité (magic link)

import { getDb } from '@/lib/firebase'
import { generateCodePromo } from '@/lib/generatePromoCode'
import InviteClient from './InviteClient'

export const dynamic = 'force-dynamic'

async function getData(slug: string) {
  const db = getDb()

  // Chercher l'invité par magic_link_slug (collectionGroup)
  const guestSnap = await db.collectionGroup('invites_guests')
    .where('magic_link_slug', '==', slug).limit(1).get()
  if (guestSnap.empty) return null

  const guestDoc = guestSnap.docs[0]
  const guest = { id: guestDoc.id, ...guestDoc.data() } as { id: string; mariage_uid: string; nom: string }
  const mariageUid = guest.mariage_uid

  // Logger le clic
  await db.collection('magic_link_clicks').add({
    guest_id: guest.id, mariage_uid: mariageUid, slug,
    clicked_at: new Date(), converted: false,
  }).catch(() => {})

  // Profil mariés
  const profileSnap = await db.collection('portail_users').doc(mariageUid).get()
  const profile = profileSnap.data() ?? {}
  const nomsMaries = profile.noms_maries ?? profile.displayName ?? 'les Mariés'

  // Code promo : récupérer ou générer
  let codePromo: string = profile.code_promo ?? ''
  if (!codePromo && nomsMaries) {
    codePromo = generateCodePromo(nomsMaries, mariageUid)
    await db.collection('portail_users').doc(mariageUid).update({ code_promo: codePromo }).catch(() => {})
  }

  const dateTs = profile.projet?.date_evenement ?? profile.date_evenement
  const dateISO = dateTs?.toDate ? dateTs.toDate().toISOString() : (typeof dateTs === 'string' ? dateTs : null)

  return {
    guestId: guest.id, mariageUid, guestNom: guest.nom,
    nomsMaries,
    dateEvenement: dateISO,
    lieu: profile.projet?.lieu ?? profile.lieu ?? null,
    codePromo,
  }
}

export default async function InvitePage({ params }: { params: { slug: string } }) {
  let data = null
  try {
    data = await getData(params.slug)
  } catch {
    // Firestore error (index manquant, credentials, etc.)
  }
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#1A1A1A' }}>
        <div className="text-center">
          <p className="font-serif italic text-3xl text-[#C9A84C] mb-4">L&Lui Signature</p>
          <p className="text-white text-sm mb-2">Ce lien n&apos;est plus valide.</p>
          <p className="text-white/50 text-xs">Contactez les mariés pour obtenir un nouveau lien.</p>
        </div>
      </div>
    )
  }
  return <InviteClient {...data} slug={params.slug} />
}
