// app/invite/[slug]/page.tsx — Page publique invité (magic link) + fiche invitation
// Si ?prenom= est présent : slug = marie_uid → rend la fiche personnalisée
// Sinon : comportement magic link classique

import { getDb } from '@/lib/firebase'
import { generateCodePromo } from '@/lib/generatePromoCode'
import InviteClient from './InviteClient'
import FicheClient from '@/components/fiche/FicheClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: { slug: string }
  searchParams: { prenom?: string; code?: string }
}

async function getMarieDataForFiche(marie_uid: string) {
  try {
    const db = getDb()
    const snap = await db.collection('portail_users').doc(marie_uid).get()
    if (!snap.exists) return null
    const d = snap.data()!
    const dateTs = d.date_mariage ?? d.projet?.date_evenement
    const dateISO = dateTs?.toDate
      ? dateTs.toDate().toISOString().slice(0, 10)
      : typeof dateTs === 'string' ? dateTs : ''
    return {
      noms_maries: (d.noms_maries as string) || '',
      date_mariage: dateISO,
      lieu: (d.lieu as string) || (d.projet?.lieu as string) || 'Kribi, Cameroun',
      code_promo: (d.code_promo as string) || '',
    }
  } catch {
    return null
  }
}

async function getMagicLinkData(slug: string) {
  const db = getDb()
  const guestSnap = await db.collectionGroup('invites_guests')
    .where('magic_link_slug', '==', slug).limit(1).get()
  if (guestSnap.empty) return null

  const guestDoc = guestSnap.docs[0]
  const guest = { id: guestDoc.id, ...guestDoc.data() } as { id: string; mariage_uid: string; nom: string }
  const mariageUid = guest.mariage_uid

  await db.collection('magic_link_clicks').add({
    guest_id: guest.id, mariage_uid: mariageUid, slug,
    clicked_at: new Date(), converted: false,
  }).catch(() => {})

  const profileSnap = await db.collection('portail_users').doc(mariageUid).get()
  const profile = profileSnap.data() ?? {}
  const nomsMaries = profile.noms_maries ?? profile.displayName ?? 'les Mariés'

  let codePromo: string = profile.code_promo ?? ''
  if (!codePromo && nomsMaries) {
    codePromo = generateCodePromo(nomsMaries, mariageUid)
    await db.collection('portail_users').doc(mariageUid).update({ code_promo: codePromo }).catch(() => {})
  }

  const dateTs = profile.projet?.date_evenement ?? profile.date_evenement
  const dateISO = dateTs?.toDate ? dateTs.toDate().toISOString() : (typeof dateTs === 'string' ? dateTs : null)

  return {
    guestId: guest.id, mariageUid, guestNom: guest.nom,
    nomsMaries, dateEvenement: dateISO,
    lieu: profile.projet?.lieu ?? profile.lieu ?? null,
    codePromo,
  }
}

const notFound = (
  <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#1A1A1A' }}>
    <div className="text-center">
      <p className="font-serif italic text-3xl text-[#C9A84C] mb-4">L&Lui Signature</p>
      <p className="text-white text-sm mb-2">Ce lien n&apos;est plus valide.</p>
      <p className="text-white/50 text-xs">Contactez les mariés pour obtenir un nouveau lien.</p>
    </div>
  </div>
)

export default async function InvitePage({ params, searchParams }: Props) {
  const { slug } = params
  const prenom = searchParams.prenom
  const codeParam = searchParams.code

  // ─── MODE FICHE : slug est le marie_uid, prenom fourni en param ───
  if (prenom) {
    const marieData = await getMarieDataForFiche(slug)
    if (!marieData) return notFound
    const code = codeParam || marieData.code_promo
    return (
      <FicheClient
        marie_uid={slug}
        noms_maries={marieData.noms_maries}
        date_mariage={marieData.date_mariage}
        lieu={marieData.lieu}
        code={code}
        prenom={prenom}
      />
    )
  }

  // ─── MODE MAGIC LINK : comportement existant ───
  let data = null
  try {
    data = await getMagicLinkData(slug)
  } catch {
    // Firestore error (index manquant, credentials)
  }
  if (!data) return notFound
  return <InviteClient {...data} slug={slug} />
}
