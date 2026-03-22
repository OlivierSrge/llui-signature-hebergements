// app/api/admin/migrate-portail-users/route.ts
// POST — Migration one-shot des documents portail_users vers la nouvelle structure de champs
// ⚠️  ENDPOINT TEMPORAIRE — À SUPPRIMER APRÈS EXÉCUTION
//
// Appeler depuis l'admin après déploiement Vercel :
//   POST /api/admin/migrate-portail-users
//   (avec cookie admin_session valide)
//
// Mappings appliqués (sans supprimer les anciens champs) :
//   date_evenement / projet.date_evenement  → date_mariage
//   nombre_invites_prevu / projet.*         → nb_invites_prevus
//   nom / projet.nom (si role=MARIÉ)        → noms_maries
//   projet.lieu                             → lieu
//   projet.budget_previsionnel              → budget_total

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

function checkAdminAuth(session: string | undefined): boolean {
  if (!session) return false
  const token = process.env.ADMIN_SESSION_TOKEN
  return !token || session === token
}

interface MigrationResult {
  uid: string
  noms: string
  changes: string[]
}

export async function POST() {
  const jar = await cookies()
  const session = jar.get('admin_session')?.value
  if (!checkAdminAuth(session)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const db = getDb()
    const snap = await db.collection('portail_users').get()

    const updated: MigrationResult[] = []
    const skipped: string[] = []

    for (const doc of snap.docs) {
      const d = doc.data()
      const uid = doc.id
      const role = (d.role as string) ?? ''
      const updates: Record<string, unknown> = {}
      const changes: string[] = []

      // 1. date_evenement / projet.date_evenement → date_mariage
      if (!d.date_mariage) {
        const candidate = d.date_evenement ?? d.projet?.date_evenement ?? null
        if (candidate) {
          updates.date_mariage = candidate
          const displayVal = candidate?.toDate ? candidate.toDate().toISOString().slice(0, 10) : String(candidate)
          changes.push(`date_mariage ← ${displayVal}`)
        }
      }

      // 2. nombre_invites_prevu → nb_invites_prevus
      if (d.nb_invites_prevus === undefined || d.nb_invites_prevus === null) {
        const candidate = d.nombre_invites_prevu ?? d.nombre_invites_prevus ?? d.projet?.nombre_invites_prevu ?? null
        if (candidate !== null && candidate !== undefined) {
          updates.nb_invites_prevus = candidate
          changes.push(`nb_invites_prevus ← ${candidate}`)
        }
      }

      // 3. nom / projet.nom → noms_maries (pour les mariés uniquement)
      if (!d.noms_maries && (role === 'MARIÉ' || role === 'MARIE' || role === 'marié')) {
        const candidate = d.nom ?? d.projet?.nom ?? d.displayName ?? null
        if (candidate) {
          updates.noms_maries = candidate
          changes.push(`noms_maries ← "${candidate}"`)
        }
      }

      // 4. projet.lieu → lieu (si absent à la racine)
      if (!d.lieu && d.projet?.lieu) {
        updates.lieu = d.projet.lieu
        changes.push(`lieu ← "${d.projet.lieu}"`)
      }

      // 5. projet.budget_previsionnel → budget_total (si absent)
      if (!d.budget_total && !d.budget_previsionnel) {
        const candidate = d.projet?.budget_previsionnel ?? null
        if (candidate) {
          updates.budget_total = candidate
          changes.push(`budget_total ← ${candidate}`)
        }
      }

      if (Object.keys(updates).length > 0) {
        // Ajouter timestamp de migration
        updates.migrated_at = FieldValue.serverTimestamp()
        await doc.ref.update(updates)
        updated.push({
          uid,
          noms: d.noms_maries ?? d.nom ?? d.displayName ?? uid,
          changes,
        })
      } else {
        skipped.push(uid)
      }
    }

    return NextResponse.json({
      success: true,
      total: snap.size,
      updated: updated.length,
      skipped: skipped.length,
      details: updated,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

// GET — Dry run : affiche ce qui serait migré sans écrire
export async function GET() {
  const jar = await cookies()
  const session = jar.get('admin_session')?.value
  if (!checkAdminAuth(session)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const db = getDb()
    const snap = await db.collection('portail_users').get()

    const wouldUpdate: MigrationResult[] = []
    const wouldSkip: string[] = []

    for (const doc of snap.docs) {
      const d = doc.data()
      const uid = doc.id
      const role = (d.role as string) ?? ''
      const changes: string[] = []

      if (!d.date_mariage) {
        const candidate = d.date_evenement ?? d.projet?.date_evenement ?? null
        if (candidate) {
          const displayVal = candidate?.toDate ? candidate.toDate().toISOString().slice(0, 10) : String(candidate)
          changes.push(`date_mariage ← ${displayVal}`)
        }
      }

      if (d.nb_invites_prevus === undefined || d.nb_invites_prevus === null) {
        const candidate = d.nombre_invites_prevu ?? d.nombre_invites_prevus ?? d.projet?.nombre_invites_prevu ?? null
        if (candidate !== null && candidate !== undefined) {
          changes.push(`nb_invites_prevus ← ${candidate}`)
        }
      }

      if (!d.noms_maries && (role === 'MARIÉ' || role === 'MARIE' || role === 'marié')) {
        const candidate = d.nom ?? d.projet?.nom ?? d.displayName ?? null
        if (candidate) changes.push(`noms_maries ← "${candidate}"`)
      }

      if (!d.lieu && d.projet?.lieu) changes.push(`lieu ← "${d.projet.lieu}"`)

      if (!d.budget_total && !d.budget_previsionnel && d.projet?.budget_previsionnel) {
        changes.push(`budget_total ← ${d.projet.budget_previsionnel}`)
      }

      if (changes.length > 0) {
        wouldUpdate.push({ uid, noms: d.noms_maries ?? d.nom ?? d.displayName ?? uid, changes })
      } else {
        wouldSkip.push(uid)
      }
    }

    return NextResponse.json({
      dry_run: true,
      total: snap.size,
      would_update: wouldUpdate.length,
      would_skip: wouldSkip.length,
      details: wouldUpdate,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
