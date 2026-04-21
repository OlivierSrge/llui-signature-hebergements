// app/api/admin/merge-duplicates/route.ts
// ⚠️ ROUTE TEMPORAIRE — à exécuter une seule fois pour nettoyer les doublons
// Auth : Authorization: Bearer [ADMIN_API_KEY]
//
// Algorithme :
//  1. Lire tous les prescripteurs_partenaires
//  2. Grouper par email (prioritaire) ou nom normalisé
//  3. Pour chaque groupe > 1 doc : garder le "gagnant" (plus gros CA ou plus ancien)
//  4. Réassigner codes_sessions + commissions_canal2 vers le gagnant
//  5. Supprimer les doublons
//  6. Vérifier orphelins codes_sessions (prescripteurId inexistant)
//
// Idempotent : peut être relancé plusieurs fois sans casser les données

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

// Normalise un nom pour la comparaison : minuscules, sans accents, sans espaces
function normaliserNom(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

export async function POST(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization')
  if (!process.env.ADMIN_API_KEY || authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const rapport = {
    prescripteurs_avant: 0,
    prescripteurs_apres: 0,
    groupes_doublons: 0,
    doublons_supprimes: 0,
    sessions_reassignees: 0,
    commissions_reassignees: 0,
    sessions_orphelines_supprimees: 0,
    erreurs: [] as string[],
    details: [] as Array<{ groupe: string; gagnant: string; supprimes: string[]; sessions: number; commissions: number }>,
  }

  try {
    // ── 1. Lire tous les prescripteurs ────────────────────────────
    const allSnap = await db.collection('prescripteurs_partenaires').get()
    rapport.prescripteurs_avant = allSnap.size
    console.log(`[merge-duplicates] ${allSnap.size} prescripteurs chargés`)

    type DocData = { id: string; data: FirebaseFirestore.DocumentData }
    const docs: DocData[] = allSnap.docs.map(d => ({ id: d.id, data: d.data() }))

    // ── 2. Grouper par email (prioritaire) puis par nom normalisé ─
    const groupes = new Map<string, DocData[]>()

    for (const doc of docs) {
      const email = (doc.data.email as string ?? '').trim().toLowerCase()
      const nom = normaliserNom(doc.data.nom_etablissement as string ?? '')
      // Clé : email si non vide, sinon nom normalisé
      const cle = email || nom
      if (!cle) continue

      if (!groupes.has(cle)) groupes.set(cle, [])
      groupes.get(cle)!.push(doc)
    }

    // ── 3. Traiter chaque groupe avec doublons ────────────────────
    for (const [cle, groupe] of Array.from(groupes)) {
      if (groupe.length <= 1) continue

      rapport.groupes_doublons++
      console.log(`[merge-duplicates] groupe "${cle}" — ${groupe.length} docs: ${groupe.map(d => d.id).join(', ')}`)

      // Choisir le gagnant : plus grand CA boutique, sinon plus ancien created_at
      const gagnant = groupe.reduce((best: DocData, cur: DocData) => {
        const bestCa = (best.data.total_ca_boutique_fcfa as number) ?? 0
        const curCa  = (cur.data.total_ca_boutique_fcfa as number) ?? 0
        if (curCa > bestCa) return cur
        if (curCa === bestCa) {
          // Départager par date de création (le plus ancien)
          const bestDate = new Date(best.data.created_at as string ?? '2099').getTime()
          const curDate  = new Date(cur.data.created_at as string ?? '2099').getTime()
          return curDate < bestDate ? cur : best
        }
        return best
      })

      const doublons = groupe.filter(d => d.id !== gagnant.id)
      console.log(`[merge-duplicates] gagnant: ${gagnant.id} (${gagnant.data.nom_etablissement}) | doublons: ${doublons.map(d => d.id).join(', ')}`)

      let sessionsReassignees = 0
      let commissionsReassignees = 0

      for (const doublon of doublons) {
        try {
          // ── 3a. Réassigner codes_sessions ─────────────────────
          const sessionsSnap = await db.collection('codes_sessions')
            .where('prescripteur_partenaire_id', '==', doublon.id)
            .get()

          for (const sessionDoc of sessionsSnap.docs) {
            await sessionDoc.ref.update({ prescripteur_partenaire_id: gagnant.id })
            sessionsReassignees++
            console.log(`[merge-duplicates] session ${sessionDoc.id} → ${doublon.id} redirigée vers ${gagnant.id}`)
          }

          // ── 3b. Réassigner commissions_canal2 ─────────────────
          const commissionsSnap = await db.collection('commissions_canal2')
            .where('prescripteur_partenaire_id', '==', doublon.id)
            .get()

          for (const commDoc of commissionsSnap.docs) {
            await commDoc.ref.update({ prescripteur_partenaire_id: gagnant.id })
            commissionsReassignees++
            console.log(`[merge-duplicates] commission ${commDoc.id} → ${doublon.id} redirigée vers ${gagnant.id}`)
          }

          // ── 3c. Fusionner les stats (additionner les CA) ───────
          const caHeberge = (doublon.data.total_ca_hebergements_fcfa as number) ?? 0
          const caBoutique = (doublon.data.total_ca_boutique_fcfa as number) ?? 0
          const commissions = (doublon.data.total_commissions_fcfa as number) ?? 0
          const utilisations = (doublon.data.total_utilisations as number) ?? 0

          if (caHeberge > 0 || caBoutique > 0 || commissions > 0 || utilisations > 0) {
            const gagnantSnap = await db.collection('prescripteurs_partenaires').doc(gagnant.id).get()
            const gData = gagnantSnap.data() ?? {}
            await db.collection('prescripteurs_partenaires').doc(gagnant.id).update({
              total_ca_hebergements_fcfa: ((gData.total_ca_hebergements_fcfa as number) ?? 0) + caHeberge,
              total_ca_boutique_fcfa:     ((gData.total_ca_boutique_fcfa as number) ?? 0) + caBoutique,
              total_commissions_fcfa:     ((gData.total_commissions_fcfa as number) ?? 0) + commissions,
              total_utilisations:         ((gData.total_utilisations as number) ?? 0) + utilisations,
            })
            console.log(`[merge-duplicates] stats fusionnées dans ${gagnant.id} (+CA:${caBoutique} +comm:${commissions})`)
          }

          // ── 3d. Récupérer le code_promo_affilie du doublon si le gagnant n'en a pas ──
          const gagnantData = (await db.collection('prescripteurs_partenaires').doc(gagnant.id).get()).data() ?? {}
          if (!gagnantData.code_promo_affilie && doublon.data.code_promo_affilie) {
            await db.collection('prescripteurs_partenaires').doc(gagnant.id).update({
              code_promo_affilie: doublon.data.code_promo_affilie,
            })
          }

          // ── 3e. Supprimer le doublon ───────────────────────────
          await db.collection('prescripteurs_partenaires').doc(doublon.id).delete()
          rapport.doublons_supprimes++
          console.log(`[merge-duplicates] ✅ doublon ${doublon.id} supprimé`)

          rapport.sessions_reassignees += sessionsReassignees
          rapport.commissions_reassignees += commissionsReassignees

        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          rapport.erreurs.push(`doublon ${doublon.id}: ${msg}`)
          console.error(`[merge-duplicates] erreur sur doublon ${doublon.id}:`, msg)
        }
      }

      rapport.details.push({
        groupe: cle,
        gagnant: `${gagnant.id} (${gagnant.data.nom_etablissement as string})`,
        supprimes: doublons.map(d => `${d.id} (${d.data.nom_etablissement as string})`),
        sessions: sessionsReassignees,
        commissions: commissionsReassignees,
      })
    }

    // ── 4. Vérifier orphelins codes_sessions ─────────────────────
    console.log('[merge-duplicates] vérification orphelins codes_sessions...')
    const allSessionsSnap = await db.collection('codes_sessions').get()

    // Charger les IDs prescripteurs encore existants
    const prescIdsSnap = await db.collection('prescripteurs_partenaires').get()
    const prescIds = new Set(prescIdsSnap.docs.map(d => d.id))
    rapport.prescripteurs_apres = prescIdsSnap.size

    for (const sessionDoc of allSessionsSnap.docs) {
      const pid = sessionDoc.data().prescripteur_partenaire_id as string ?? ''
      if (pid && !prescIds.has(pid)) {
        // Orphelin : tenter de retrouver via code_promo_affilie
        const code = sessionDoc.id
        const fallback = await db.collection('prescripteurs_partenaires')
          .where('code_promo_affilie', '==', code)
          .limit(1)
          .get()

        if (!fallback.empty) {
          await sessionDoc.ref.update({ prescripteur_partenaire_id: fallback.docs[0].id })
          console.log(`[merge-duplicates] session orpheline ${code} → rattachée à ${fallback.docs[0].id}`)
        } else {
          await sessionDoc.ref.delete()
          rapport.sessions_orphelines_supprimees++
          console.log(`[merge-duplicates] session orpheline ${code} supprimée (prescripteur ${pid} introuvable)`)
        }
      }
    }

    console.log('[merge-duplicates] ✅ terminé:', rapport)
    return NextResponse.json({ success: true, ...rapport })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[merge-duplicates] erreur globale:', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
