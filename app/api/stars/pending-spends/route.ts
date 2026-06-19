// app/api/stars/pending-spends/route.ts
// GET ?partnerId=XXXX — liste les demandes de réduction (spend) en attente pour un partenaire.
// Utilisé par StarTerminal pour afficher les demandes à valider.

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'

export async function GET(req: NextRequest) {
  const partnerId = req.nextUrl.searchParams.get('partnerId')
  if (!partnerId) {
    return NextResponse.json({ success: false, error: 'partnerId requis' }, { status: 400 })
  }

  try {
    const now = new Date().toISOString()
    const snap = await db
      .collection('transactions_fidelite')
      .where('partenaire_id', '==', partnerId)
      .where('type', '==', 'spend')
      .where('status', '==', 'pending')
      .limit(10)
      .get()

    const spends = snap.docs
      .map((d) => {
        const data = d.data()
        return {
          id: d.id,
          client_id: data.client_id as string,
          points_used: data.points_used as number,
          point_value: data.point_value as number,
          reduction_fcfa: data.reduction_fcfa as number,
          expires_at: data.expires_at as string,
        }
      })
      // Filtrer les expirées côté API
      .filter((tx) => tx.expires_at > now)

    return NextResponse.json({ success: true, spends })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    console.error('[Stars/pending-spends] erreur:', e)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
