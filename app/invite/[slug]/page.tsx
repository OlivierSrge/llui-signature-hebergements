// app/invite/[slug]/page.tsx — Page publique invité (magic link)

import { notFound } from 'next/navigation'
import { getDb } from '@/lib/firebase'
import InviteClient from './InviteClient'

export const dynamic = 'force-dynamic'

interface Hebergement { id: string; nom: string; prix_nuit: number; image_url?: string }
interface ProduitBoutique { id: string; nom: string; prix: number; url_fiche?: string; image_url?: string }

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

  // 3 hébergements actifs
  const hebergSnap = await db.collection('hebergements')
    .where('status', '==', 'active').limit(3).get()
  const hebergements: Hebergement[] = hebergSnap.docs.map(d => ({
    id: d.id, nom: d.data().name ?? d.data().nom ?? 'Hébergement',
    prix_nuit: d.data().price ?? d.data().prix_nuit ?? 0,
    image_url: d.data().images?.[0] ?? d.data().image_url,
  }))

  // 3 produits boutique
  const boutiqueSnap = await db.collection('catalogue_boutique')
    .where('actif', '==', true).limit(3).get()
  const produits: ProduitBoutique[] = boutiqueSnap.docs.map(d => ({
    id: d.id, nom: d.data().nom ?? '', prix: d.data().prix ?? 0,
    url_fiche: d.data().url_fiche, image_url: d.data().image_url,
  }))

  return {
    guestId: guest.id, mariageUid, guestNom: guest.nom,
    nomsMaries: profile.displayName ?? 'les Mariés',
    dateEvenement: profile.projet?.date_evenement ?? null,
    lieu: profile.projet?.lieu ?? null,
    hebergements, produits,
  }
}

export default async function InvitePage({ params }: { params: { slug: string } }) {
  const data = await getData(params.slug)
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#1A1A1A' }}>
        <div className="text-center">
          <p className="font-serif italic text-3xl text-[#C9A84C] mb-4">L&Lui</p>
          <p className="text-white text-sm mb-2">Ce lien n&apos;est plus valide.</p>
          <p className="text-white/50 text-xs">Contactez les mariés pour obtenir un nouveau lien.</p>
        </div>
      </div>
    )
  }
  return <InviteClient {...data} slug={params.slug} />
}
