import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { serializeFirestoreDoc } from '@/lib/serialization'

export const dynamic = 'force-dynamic'

interface Niveau {
  id: string
  nom: string
  emoji: string
  couleur: string
  seuil_points: number
  prix_fcfa?: number
  avantages: string[]
}

// GET /api/admin/loyalty-programs — liste tous les programmes de fidélité
// ?partenaire_id=xxx → filtre par partenaire
export async function GET(req: NextRequest) {
  try {
    const partenaireId = req.nextUrl.searchParams.get('partenaire_id')
    const snap = partenaireId
      ? await db.collection('loyalty_programs').where('partenaire_id', '==', partenaireId).get()
      : await db.collection('loyalty_programs').get()
    const programs = snap.docs.map((doc) => ({
      program_id: doc.id,
      ...serializeFirestoreDoc(doc.data()),
    }))
    return NextResponse.json({ programs })
  } catch (err) {
    console.error('[admin/loyalty-programs GET]', err)
    return NextResponse.json({ programs: [] })
  }
}

// PATCH /api/admin/loyalty-programs — met à jour un programme
// Body: { program_id, ...champs à mettre à jour }
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as {
      program_id?: string
      nom?: string
      description?: string
      prix_fcfa?: number
      duree_validite_mois?: number
      commission_lui_percent?: number
      taux_fcfa_par_point?: number
      statut?: 'DRAFT' | 'ACTIVE' | 'PAUSED'
      niveaux?: Niveau[]
    }
    const { program_id, ...rest } = body

    if (!program_id) {
      return NextResponse.json({ error: 'program_id manquant' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {
      updated_at: FieldValue.serverTimestamp(),
    }

    if (rest.nom !== undefined) updates.nom = String(rest.nom)
    if (rest.description !== undefined) updates.description = String(rest.description)
    if (rest.prix_fcfa !== undefined) updates.prix_fcfa = Number(rest.prix_fcfa)
    if (rest.duree_validite_mois !== undefined) updates.duree_validite_mois = Number(rest.duree_validite_mois)
    if (rest.commission_lui_percent !== undefined) {
      updates.commission_lui_percent = Number(rest.commission_lui_percent)
      updates.commission_partner_percent = 100 - Number(rest.commission_lui_percent)
    }
    if (rest.taux_fcfa_par_point !== undefined) updates.taux_fcfa_par_point = Number(rest.taux_fcfa_par_point)
    if (rest.statut !== undefined) updates.statut = rest.statut
    if (rest.niveaux !== undefined) updates.niveaux = rest.niveaux

    await db.collection('loyalty_programs').doc(program_id).update(updates)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[admin/loyalty-programs PATCH]', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/admin/loyalty-programs — crée un nouveau programme
// Body: { partenaire_id, partenaire_name, nom, description?, prix_fcfa, duree_validite_mois, commission_lui_percent, taux_fcfa_par_point, niveaux }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      partenaire_id?: string
      partenaire_name?: string
      nom?: string
      description?: string
      prix_fcfa?: number
      duree_validite_mois?: number
      commission_lui_percent?: number
      taux_fcfa_par_point?: number
      niveaux?: Niveau[]
    }

    const { partenaire_id, partenaire_name, nom, description, prix_fcfa, duree_validite_mois, commission_lui_percent, taux_fcfa_par_point, niveaux } = body

    if (!partenaire_id || !nom) {
      return NextResponse.json({ error: 'partenaire_id et nom sont requis' }, { status: 400 })
    }

    const commissionLui = Number(commission_lui_percent ?? 20)
    const docData = {
      partenaire_id,
      partenaire_type: 'prescripteur' as const,
      partenaire_name: partenaire_name ?? '',
      nom,
      description: description ?? '',
      prix_fcfa: Number(prix_fcfa ?? 0),
      duree_validite_mois: Number(duree_validite_mois ?? 12),
      commission_lui_percent: commissionLui,
      commission_partner_percent: 100 - commissionLui,
      taux_fcfa_par_point: Number(taux_fcfa_par_point ?? 10000),
      statut: 'DRAFT' as const,
      niveaux: niveaux ?? [],
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    }

    const docRef = await db.collection('loyalty_programs').add(docData)

    const program = {
      program_id: docRef.id,
      ...docData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    return NextResponse.json({ success: true, program })
  } catch (err) {
    console.error('[admin/loyalty-programs POST]', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
