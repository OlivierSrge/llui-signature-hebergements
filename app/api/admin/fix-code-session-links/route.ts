// app/api/admin/fix-code-session-links/route.ts
// Répare les liens prescripteur_partenaire_id dans codes_sessions.
// Auth : Authorization: Bearer [ADMIN_API_KEY]
//
// Pour chaque code session :
//  1. Vérifie que prescripteur_partenaire_id pointe vers un doc existant.
//  2. Si absent ou doc introuvable → cherche le partenaire par code_promo_affilie == code.
//  3. Met à jour prescripteur_partenaire_id.
//  4. Si code_promo session (doc créé par sync-affiliates) : complète les champs manquants.

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

function normaliserNom(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!process.env.ADMIN_API_KEY || authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const stats = {
    total: 0,
    ok: 0,
    corrigees: 0,
    completes: 0,    // sessions sync-affiliates enrichies avec nom_partenaire etc.
    introuvables: 0, // aucun partenaire trouvé
    erreurs: 0,
    details: [] as Array<{ code: string; action: string; prescripteur_id?: string }>
  }

  try {
    // Charger tous les partenaires actifs une seule fois
    const partenairesSnap = await db.collection('prescripteurs_partenaires').get()
    const partenaires = partenairesSnap.docs.map(d => ({ id: d.id, ...d.data() as Record<string, unknown> }))
    console.log(`[fix-code-session-links] ${partenaires.length} partenaires chargés`)

    // Index rapide
    const byId  = new Map(partenaires.map(p => [p.id, p]))
    const byCode = new Map(partenaires.map(p => [p.code_promo_affilie as string, p]))
    const byNom  = new Map(partenaires.map(p => [normaliserNom(p.nom_etablissement as string ?? ''), p]))

    // Lire tous les codes sessions
    const sessionsSnap = await db.collection('codes_sessions').get()
    stats.total = sessionsSnap.size
    console.log(`[fix-code-session-links] ${stats.total} sessions à vérifier`)

    for (const doc of sessionsSnap.docs) {
      const code = doc.id
      const d    = doc.data()
      const currentPid = d.prescripteur_partenaire_id as string | undefined

      try {
        // 1. Partenaire actuel est-il valide ?
        let partenaire = currentPid ? byId.get(currentPid) : undefined

        if (partenaire) {
          // ── Partenaire OK ─────────────────────────────────
          // Vérifier si c'est une session sync-affiliates sans nom_partenaire
          if (!d.nom_partenaire || !d.remise_type) {
            await doc.ref.update({
              prescripteur_partenaire_id: partenaire.id,
              nom_partenaire: partenaire.nom_etablissement,
              type_partenaire: partenaire.type ?? 'restaurant',
              remise_type: partenaire.remise_type ?? 'reduction_pct',
              remise_valeur_pct: partenaire.remise_valeur_pct ?? (d.reduction_pct ?? 0),
              remise_description: partenaire.remise_description ?? null,
              redirection_prioritaire: partenaire.redirection_prioritaire ?? 'boutique',
              statut: d.statut ?? 'actif',
            })
            stats.completes++
            stats.details.push({ code, action: 'complete_champs_manquants', prescripteur_id: partenaire.id })
            console.log(`[fix-code-session-links] ✏️ ${code} enrichi (partenaire ${partenaire.id})`)
          } else {
            stats.ok++
          }
          continue
        }

        // 2. Partenaire introuvable / absent — chercher
        let trouve: typeof partenaires[0] | undefined

        // Par code_promo_affilie == code (cas des sessions sync-affiliates)
        trouve = byCode.get(code)

        // Par nom normalisé si code == nom_partenaire normalisé
        if (!trouve && d.nom_partenaire) {
          trouve = byNom.get(normaliserNom(d.nom_partenaire as string))
        }

        if (!trouve) {
          console.warn(`[fix-code-session-links] ❌ aucun partenaire pour code="${code}" (pid="${currentPid}")`)
          stats.introuvables++
          stats.details.push({ code, action: `introuvable (pid="${currentPid ?? 'absent'}")` })
          continue
        }

        // 3. Mise à jour du lien + complétion des champs
        await doc.ref.update({
          prescripteur_partenaire_id: trouve.id,
          nom_partenaire: trouve.nom_etablissement,
          type_partenaire: trouve.type ?? 'restaurant',
          remise_type: trouve.remise_type ?? 'reduction_pct',
          remise_valeur_pct: trouve.remise_valeur_pct ?? (d.reduction_pct ?? 0),
          remise_description: trouve.remise_description ?? null,
          redirection_prioritaire: trouve.redirection_prioritaire ?? 'boutique',
          statut: d.statut ?? 'actif',
        })
        stats.corrigees++
        stats.details.push({ code, action: `corrigee: "${currentPid ?? 'absent'}" → "${trouve.id}"`, prescripteur_id: trouve.id })
        console.log(`[fix-code-session-links] ↺ ${code}: pid "${currentPid ?? 'absent'}" → "${trouve.id}"`)

      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error(`[fix-code-session-links] erreur ${code}:`, msg)
        stats.erreurs++
        stats.details.push({ code, action: `erreur: ${msg}` })
      }
    }

    console.log(`[fix-code-session-links] terminé:`, stats)
    return NextResponse.json({ success: true, ...stats })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[fix-code-session-links] erreur globale:', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
