import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { serializeFirestoreDoc } from '@/lib/serialization'

export const dynamic = 'force-dynamic'

function normalizePhone(phone: string): string {
  const raw = phone.replace(/\s/g, '')
  if (raw.startsWith('+')) return raw
  if (raw.startsWith('00')) return '+' + raw.slice(2)
  if (raw.startsWith('237')) return '+' + raw
  if (raw.length === 9) return '+237' + raw
  return raw
}

// GET /api/loyalty/my-cards?phone=xxx
// Retourne toutes les cartes ACTIVE du client avec infos programme
export async function GET(req: NextRequest) {
  try {
    const phone = req.nextUrl.searchParams.get('phone') ?? ''
    if (!phone) return NextResponse.json({ cards: [] })

    const normalized = normalizePhone(phone)
    const variants = [...new Set([phone, normalized, phone.trim()])]

    // Cherche par client_id ET client_phone (robustesse)
    const snaps = await Promise.all(
      variants.flatMap((v) => [
        db.collection('loyalty_cards').where('client_id', '==', v).get(),
        db.collection('loyalty_cards').where('client_phone', '==', v).get(),
      ]),
    )

    // Déduplication par card_id
    const seen = new Set<string>()
    const cards: Array<Record<string, unknown>> = []
    for (const snap of snaps) {
      for (const doc of snap.docs) {
        if (!seen.has(doc.id)) {
          seen.add(doc.id)
          const data = serializeFirestoreDoc(doc.data())
          if ((data.statut as string) !== 'REJECTED') {
            cards.push({ card_id: doc.id, ...data })
          }
        }
      }
    }

    if (cards.length === 0) return NextResponse.json({ cards: [] })

    // Enrichit avec les données programme (nom, niveaux)
    const programIds = [...new Set(cards.map((c) => c.program_id as string).filter(Boolean))]
    const progDocs = await Promise.all(
      programIds.map((id) => db.collection('loyalty_programs').doc(id).get()),
    )
    const progMap = new Map<string, Record<string, unknown>>()
    for (const doc of progDocs) {
      if (doc.exists) progMap.set(doc.id, serializeFirestoreDoc(doc.data()!))
    }

    const enriched = cards.map((c) => {
      const prog = progMap.get(c.program_id as string) ?? {}
      const niveaux = (prog.niveaux as Array<{ id: string; nom: string; emoji: string; couleur: string }>) ?? []
      const niveauData = niveaux.find((n) => n.id === (c.niveau_actuel as string))
      return {
        ...c,
        programme_nom: prog.nom ?? c.programme_nom ?? '',
        partenaire_name: prog.partenaire_name ?? '',
        niveau_emoji: niveauData?.emoji ?? '🎫',
        niveau_nom: niveauData?.nom ?? (c.niveau_actuel as string) ?? '',
        niveau_couleur: niveauData?.couleur ?? '#888888',
      }
    })

    // Tri : ACTIVE en premier, puis par date de création décroissante
    enriched.sort((a, b) => {
      if (a.statut === 'ACTIVE' && b.statut !== 'ACTIVE') return -1
      if (a.statut !== 'ACTIVE' && b.statut === 'ACTIVE') return 1
      return new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime()
    })

    return NextResponse.json({ cards: enriched })
  } catch (err) {
    console.error('[loyalty/my-cards GET]', err)
    return NextResponse.json({ cards: [] })
  }
}
