// app/api/admin/sync-affiliates/route.ts
// Bootstrap / Upsert Firestore depuis Affiliés_Codes Google Sheets
// Auth : Authorization: Bearer [ADMIN_API_KEY]
//
// Logique UPSERT (idempotent) :
//  Pour chaque ligne active (col F = "OUI") :
//   1. Chercher prescripteur par email (prioritaire), puis code_promo_affilie, puis nom normalisé
//   2. Trouvé → UPDATE champs Sheets (commission_pct, remise_valeur_pct...) sans écraser
//              subscriptionLevel, carouselImages, defaultImage si déjà définis
//   3. Non trouvé → CREATE avec schéma complet
//   4. codes_sessions : créer si absent, corriger prescripteur_partenaire_id si nécessaire
//
// Résultat JSON :
//   { prescripteurs_crees, prescripteurs_mis_a_jour, sessions_creees, sessions_corrigees, skipped, erreurs }

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { lireAffiliésCodes } from '@/lib/sheetsCanal2'
import { getParametresPlateforme } from '@/actions/parametres'

export const dynamic = 'force-dynamic'

function normaliserNom(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization')
  if (!process.env.ADMIN_API_KEY || authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const stats = {
    prescripteurs_crees: 0,
    prescripteurs_mis_a_jour: 0,
    sessions_creees: 0,
    sessions_corrigees: 0,
    skipped: 0,
    erreurs: 0,
    details: [] as Array<{ code: string; action: string; prescripteur_id?: string }>,
  }

  try {
    const [affilies, params] = await Promise.all([
      lireAffiliésCodes(),
      getParametresPlateforme(),
    ])
    console.log(`[sync-affiliates] ${affilies.length} affiliés actifs à synchroniser (mode upsert)`)

    for (const affilie of affilies) {
      const { code_promo, nom_affilie, email_affilie, reduction_pct, commission_pct } = affilie
      const emailNorm = email_affilie.trim().toLowerCase()
      const nomNorm   = normaliserNom(nom_affilie || code_promo)

      try {
        // ── 1. Recherche prescripteur existant ────────────────
        let prescripteurDoc: FirebaseFirestore.DocumentSnapshot | null = null

        // Priorité 1 : email
        if (emailNorm) {
          const snap = await db.collection('prescripteurs_partenaires')
            .where('email', '==', emailNorm)
            .limit(1).get()
          if (!snap.empty) prescripteurDoc = snap.docs[0]
        }

        // Priorité 2 : code_promo_affilie
        if (!prescripteurDoc) {
          const snap = await db.collection('prescripteurs_partenaires')
            .where('code_promo_affilie', '==', code_promo)
            .limit(1).get()
          if (!snap.empty) prescripteurDoc = snap.docs[0]
        }

        // Priorité 3 : nom normalisé (lecture en mémoire pour éviter requête Firestore)
        if (!prescripteurDoc && nomNorm) {
          const allSnap = await db.collection('prescripteurs_partenaires')
            .where('statut', '==', 'actif').get()
          const match = allSnap.docs.find(d =>
            normaliserNom(d.data().nom_etablissement as string ?? '') === nomNorm
          )
          if (match) prescripteurDoc = match
        }

        let prescripteurId: string

        if (prescripteurDoc) {
          // ── 2. UPSERT : mettre à jour sans écraser les champs vitrine ──
          prescripteurId = prescripteurDoc.id
          const existing = prescripteurDoc.data()!

          const update: Record<string, unknown> = {
            // Champs Sheets toujours mis à jour
            nom_etablissement: nom_affilie || code_promo,
            email: emailNorm || (existing.email as string) || '',
            remise_valeur_pct: reduction_pct || 0,
            commission_pct: commission_pct || (params.commission_partenaire_pct ?? 10),
            code_promo_affilie: code_promo,
            statut: 'actif',
            updated_at: new Date().toISOString(),
          }

          // Ne PAS écraser ces champs si déjà définis par le partenaire
          if (!existing.subscriptionLevel) update.subscriptionLevel = 'free'
          // carouselImages, defaultImage, photoUrl → jamais écrasés

          await db.collection('prescripteurs_partenaires').doc(prescripteurId).update(update)
          stats.prescripteurs_mis_a_jour++
          stats.details.push({ code: code_promo, action: 'prescripteur_mis_a_jour', prescripteur_id: prescripteurId })
          console.log(`[sync-affiliates] ↺ prescripteur mis à jour: ${prescripteurId} (${nom_affilie})`)

        } else {
          // ── 3. CREATE — nouveau prescripteur ──────────────────
          const now = new Date().toISOString()
          const expireAt = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString()
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'
          const ref = db.collection('prescripteurs_partenaires').doc()

          await ref.set({
            uid: ref.id,
            nom_etablissement: nom_affilie || code_promo,
            type: 'restaurant',
            telephone: '',
            adresse: '',
            email: emailNorm || '',
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
            commission_pct: commission_pct || (params.commission_partenaire_pct ?? 10),
            subscriptionLevel: 'free',
            carouselImages: [],
            defaultImage: '',
            photoUrl: '',
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

          prescripteurId = ref.id
          stats.prescripteurs_crees++
          stats.details.push({ code: code_promo, action: 'prescripteur_cree', prescripteur_id: prescripteurId })
          console.log(`[sync-affiliates] ✅ prescripteur créé: ${prescripteurId} (${nom_affilie})`)
        }

        // ── 4. codes_sessions — créer ou corriger ─────────────
        const sessionSnap = await db.collection('codes_sessions').doc(code_promo).get()

        if (!sessionSnap.exists) {
          const now = new Date().toISOString()
          await db.collection('codes_sessions').doc(code_promo).set({
            code: code_promo,
            prescripteur_partenaire_id: prescripteurId,
            canal: 'boutique',
            reduction_pct,
            nb_utilisations: 0,
            max_utilisations: 9999,
            expire_at: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
            created_at: now,
            source: 'sync_affiliates',
          })
          stats.sessions_creees++
          stats.details.push({ code: code_promo, action: 'session_creee', prescripteur_id: prescripteurId })
          console.log(`[sync-affiliates] ✅ session créée: ${code_promo}`)

        } else {
          // Corriger si la session pointe vers un mauvais prescripteur
          const existingPid = sessionSnap.data()!.prescripteur_partenaire_id as string
          if (existingPid !== prescripteurId) {
            await sessionSnap.ref.update({ prescripteur_partenaire_id: prescripteurId })
            stats.sessions_corrigees++
            stats.details.push({ code: code_promo, action: `session_corrigee: ${existingPid} → ${prescripteurId}`, prescripteur_id: prescripteurId })
            console.log(`[sync-affiliates] ↺ session ${code_promo} corrigée: ${existingPid} → ${prescripteurId}`)
          } else {
            stats.skipped++
          }
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
