// app/api/admin/sync-affiliates/route.ts
// Bootstrap Firestore depuis Affiliés_Codes Google Sheets
// Auth : Authorization: Bearer [ADMIN_API_KEY]
//
// Pour chaque ligne active (col F = "OUI") dans Affiliés_Codes :
//   1. Chercher/créer un doc dans prescripteurs_partenaires (via code_promo_affilie)
//   2. Chercher/créer un doc dans codes_sessions (pour la résolution webhook Stratégie A)
//
// Résultat JSON :
//   { prescripteurs_crees, sessions_creees, skipped, erreurs, details[] }

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { lireAffiliésCodes } from '@/lib/sheetsCanal2'
import { getParametresPlateforme } from '@/actions/parametres'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization')
  const expectedToken = `Bearer ${process.env.ADMIN_API_KEY}`

  if (!process.env.ADMIN_API_KEY || authHeader !== expectedToken) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const stats = {
    prescripteurs_crees: 0,
    sessions_creees: 0,
    skipped: 0,
    erreurs: 0,
    details: [] as Array<{ code: string; action: string; prescripteur_id?: string }>,
  }

  try {
    // Lire Affiliés_Codes + params plateforme en parallèle
    const [affilies, params] = await Promise.all([
      lireAffiliésCodes(),
      getParametresPlateforme(),
    ])

    console.log(`[sync-affiliates] ${affilies.length} affiliés actifs à synchroniser`)

    for (const affilie of affilies) {
      const { code_promo, nom_affilie, email_affilie, reduction_pct, commission_pct } = affilie

      try {
        // ── 1. prescripteurs_partenaires ──────────────────────
        let prescripteurId: string | null = null

        // Chercher doc existant par code_promo_affilie
        const existingPrescSnap = await db.collection('prescripteurs_partenaires')
          .where('code_promo_affilie', '==', code_promo)
          .limit(1)
          .get()

        if (!existingPrescSnap.empty) {
          prescripteurId = existingPrescSnap.docs[0].id
          // Doc existant — pas de création
        } else {
          // Créer un nouveau prescripteur avec le schéma complet
          const now = new Date().toISOString()
          const expireAt = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString()
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'
          const ref = db.collection('prescripteurs_partenaires').doc()
          await ref.set({
            uid: ref.id,
            nom_etablissement: nom_affilie || code_promo,
            type: 'restaurant' as const,
            telephone: '',
            adresse: '',
            email: email_affilie || '',
            statut: 'actif',
            remise_type: 'reduction_pct',
            remise_valeur_pct: reduction_pct || 0,
            remise_description: null,
            redirection_prioritaire: 'boutique',
            forfait_type: 'annuel',
            forfait_montant_fcfa: params.forfait_prescripteur_annuel_fcfa ?? 0,
            forfait_debut: now,
            forfait_expire_at: expireAt,
            forfait_statut: 'actif',
            qr_code_url: '',
            qr_code_data: `${appUrl}/promo/${ref.id}`,
            qr_genere_le: now,
            code_promo_affilie: code_promo,
            commission_pct: commission_pct || params.commission_partenaire_pct ?? 10,
            total_scans: 0,
            total_codes_generes: 0,
            total_utilisations: 0,
            total_clients_uniques: 0,
            total_ca_hebergements_fcfa: 0,
            total_ca_boutique_fcfa: 0,
            total_commissions_fcfa: 0,
            created_at: now,
            created_by: 'sync_affiliates',
            source: 'sync_affiliates',
          })
          const newDoc = ref
          prescripteurId = newDoc.id
          stats.prescripteurs_crees++
          stats.details.push({ code: code_promo, action: 'prescripteur_cree', prescripteur_id: prescripteurId })
          console.log(`[sync-affiliates] ✅ prescripteur créé: ${prescripteurId} pour ${code_promo}`)
        }

        // ── 2. codes_sessions ──────────────────────────────────
        const sessionSnap = await db.collection('codes_sessions').doc(code_promo).get()

        if (sessionSnap.exists) {
          stats.skipped++
          stats.details.push({ code: code_promo, action: 'session_existante', prescripteur_id: prescripteurId ?? undefined })
        } else {
          const now = new Date().toISOString()
          const expireAt = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString() // 1 an
          await db.collection('codes_sessions').doc(code_promo).set({
            code: code_promo,
            prescripteur_partenaire_id: prescripteurId,
            canal: 'boutique',
            reduction_pct,
            nb_utilisations: 0,
            max_utilisations: 9999,
            expire_at: expireAt,
            created_at: now,
            source: 'sync_affiliates',
          })
          stats.sessions_creees++
          stats.details.push({ code: code_promo, action: 'session_creee', prescripteur_id: prescripteurId ?? undefined })
          console.log(`[sync-affiliates] ✅ session créée: ${code_promo}`)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[sync-affiliates] erreur pour ${code_promo}:`, msg)
        stats.erreurs++
        stats.details.push({ code: code_promo, action: `erreur: ${msg}` })
      }
    }

    console.log(`[sync-affiliates] terminé:`, stats)
    return NextResponse.json({ success: true, ...stats })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[sync-affiliates] erreur globale:', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
