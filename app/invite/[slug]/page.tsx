// app/invite/[slug]/page.tsx — Page publique invité (magic link) + fiche invitation
// Logique de routage :
//  1. Si ?prenom= présent (non vide) → mode fiche personnalisée
//  2. Sinon → mode magic link (invites_guests slug)
//  3. Fallback : slug = marie_uid → fiche générique (sans prenom)

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
    console.log(`[invite/fiche] Lookup portail_users/${marie_uid}`)
    const snap = await db.collection('portail_users').doc(marie_uid).get()
    console.log(`[invite/fiche] snap.exists=${snap.exists}`)
    if (!snap.exists) return null
    const d = snap.data()!

    const nomsMaries: string = (d.noms_maries as string) || (d.displayName as string) || ''
    let codePromo: string = (d.code_promo as string) || ''
    if (!codePromo && nomsMaries) {
      codePromo = generateCodePromo(nomsMaries, marie_uid)
      await db.collection('portail_users').doc(marie_uid).update({ code_promo: codePromo }).catch(() => {})
    }

    const dateTs = d.date_mariage ?? d.projet?.date_evenement
    const dateISO = dateTs?.toDate
      ? dateTs.toDate().toISOString().slice(0, 10)
      : typeof dateTs === 'string' ? dateTs : ''

    return {
      noms_maries: nomsMaries,
      date_mariage: dateISO,
      lieu: (d.lieu as string) || (d.projet?.lieu as string) || 'Kribi, Cameroun',
      code_promo: codePromo,
    }
  } catch (err) {
    console.error(`[invite/fiche] Firestore error for ${marie_uid}:`, err)
    return null
  }
}

async function getMagicLinkData(slug: string) {
  try {
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
  } catch (err) {
    console.error(`[invite/magic] Error for slug=${slug}:`, err)
    return null
  }
}

const NotFoundPage = () => (
  <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#1A1A1A' }}>
    <div className="text-center">
      <p className="font-serif italic text-3xl mb-4" style={{ color: '#C9A84C' }}>L&Lui Signature</p>
      <p className="text-white text-sm mb-2">Ce lien n&apos;est plus valide.</p>
      <p className="text-white/50 text-xs">Contactez les mariés pour obtenir un nouveau lien.</p>
    </div>
  </div>
)

export default async function InvitePage({ params, searchParams }: Props) {
  const { slug } = params
  // prenom peut être '' (string vide) si ?prenom= est dans l'URL mais vide
  const prenom = searchParams.prenom ?? ''
  const codeParam = searchParams.code ?? ''

  console.log(`[invite] slug=${slug} prenom="${prenom}" code="${codeParam}"`)

  // ─── MODE FICHE PERSONNALISÉE : ?prenom= présent et non vide ─────────────
  if (prenom.trim()) {
    const marieData = await getMarieDataForFiche(slug)
    if (marieData) {
      const code = codeParam || marieData.code_promo
      console.log(`[invite] fiche mode → marie=${slug} prenom=${prenom}`)
      return (
        <FicheClient
          marie_uid={slug}
          noms_maries={marieData.noms_maries}
          date_mariage={marieData.date_mariage}
          lieu={marieData.lieu}
          code={code}
          prenom={prenom.trim()}
        />
      )
    }
    // Fiche non trouvée avec prenom → continuer vers fallback
    console.warn(`[invite] getMarieDataForFiche returned null for ${slug}, trying magic link`)
  }

  // ─── MODE MAGIC LINK : slug = identifiant unique invité ──────────────────
  const magicData = await getMagicLinkData(slug)
  if (magicData) {
    console.log(`[invite] magic link mode → mariageUid=${magicData.mariageUid}`)
    return <InviteClient {...magicData} slug={slug} />
  }

  // ─── FALLBACK : slug = marie_uid partagé sans ?prenom= ───────────────────
  // Cas : le marié partage son lien de base /invite/oi_spx5cw
  // sans paramètre prenom (ex : partage direct de l'URL)
  console.log(`[invite] fallback: trying slug as marie_uid=${slug}`)
  const fallbackData = await getMarieDataForFiche(slug)
  if (fallbackData) {
    const code = codeParam || fallbackData.code_promo
    console.log(`[invite] fallback fiche mode → marie=${slug}`)
    return (
      <FicheClient
        marie_uid={slug}
        noms_maries={fallbackData.noms_maries}
        date_mariage={fallbackData.date_mariage}
        lieu={fallbackData.lieu}
        code={code}
        prenom=""
      />
    )
  }

  console.error(`[invite] notFound: slug=${slug} not found in magic_links nor portail_users`)
  return <NotFoundPage />
}
