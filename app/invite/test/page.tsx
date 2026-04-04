// app/invite/test/page.tsx — Page de debug temporaire
// Affiche le résultat brut de la query Firestore pour marie_uid = "oi_spx5cw"
// À supprimer une fois le bug corrigé

import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

const SLUG = 'oi_spx5cw'

async function runDiagnostic() {
  const results: Record<string, unknown> = {}

  // 1. Test connexion Firebase
  try {
    const db = getDb()
    results.firebase_init = 'OK'

    // 2. Lookup direct portail_users/{slug}
    try {
      const snap = await db.collection('portail_users').doc(SLUG).get()
      results.portail_users_direct = {
        exists: snap.exists,
        id: snap.id,
        data: snap.exists ? snap.data() : null,
      }
    } catch (e) {
      results.portail_users_direct = { error: String(e) }
    }

    // 3. Lookup collectionGroup invites_guests magic_link_slug
    try {
      const guestSnap = await db.collectionGroup('invites_guests')
        .where('magic_link_slug', '==', SLUG).limit(5).get()
      results.magic_link_lookup = {
        empty: guestSnap.empty,
        count: guestSnap.size,
        docs: guestSnap.docs.map(d => ({ id: d.id, path: d.ref.path, data: d.data() })),
      }
    } catch (e) {
      results.magic_link_lookup = { error: String(e) }
    }

    // 4. Liste les 5 premiers documents portail_users pour vérifier la connexion
    try {
      const listSnap = await db.collection('portail_users').limit(5).get()
      results.portail_users_list = {
        count: listSnap.size,
        ids: listSnap.docs.map(d => d.id),
      }
    } catch (e) {
      results.portail_users_list = { error: String(e) }
    }

    // 5. Cherche si un document portail_users contient marie_uid = SLUG (champ)
    try {
      const byFieldSnap = await db.collection('portail_users')
        .where('marie_uid', '==', SLUG).limit(3).get()
      results.portail_users_by_field = {
        empty: byFieldSnap.empty,
        count: byFieldSnap.size,
        docs: byFieldSnap.docs.map(d => ({ id: d.id, marie_uid: d.data().marie_uid, noms_maries: d.data().noms_maries })),
      }
    } catch (e) {
      results.portail_users_by_field = { error: String(e) }
    }

  } catch (e) {
    results.firebase_init = { error: String(e) }
  }

  return results
}

export default async function InviteDebugPage() {
  const results = await runDiagnostic()

  return (
    <div className="min-h-screen p-8" style={{ background: '#1A1A1A', color: '#FFF' }}>
      <p className="font-serif italic text-2xl mb-2" style={{ color: '#C9A84C' }}>L&amp;Lui — Debug /invite/{SLUG}</p>
      <p className="text-white/50 text-xs mb-6">Page de diagnostic temporaire — à supprimer après correction</p>

      {Object.entries(results).map(([key, value]) => (
        <div key={key} className="mb-6 p-4 rounded-xl" style={{ background: '#2A2A2A' }}>
          <p className="text-sm font-bold mb-2" style={{ color: '#C9A84C' }}>{key}</p>
          <pre className="text-xs text-white/80 overflow-auto whitespace-pre-wrap break-all">
            {JSON.stringify(value, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  )
}
