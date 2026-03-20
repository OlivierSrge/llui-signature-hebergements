// app/api/admin/utilisateurs/ajuster-grade/route.ts
// POST admin — override grade + log admin_actions + notif WA user

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import type { PortailGrade } from '@/lib/portailGrades'

export const dynamic = 'force-dynamic'

const VALID_GRADES: PortailGrade[] = ['START','BRONZE','ARGENT','OR','SAPHIR','DIAMANT']

export async function POST(req: NextRequest) {
  try {
    const { uid, grade, motif } = await req.json() as { uid: string; grade: PortailGrade; motif: string }
    if (!uid || !grade || !motif?.trim()) return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    if (!VALID_GRADES.includes(grade)) return NextResponse.json({ error: 'Grade invalide' }, { status: 400 })

    const db = getDb()
    await db.collection('portail_users').doc(uid).update({ grade })
    await db.collection('admin_actions').add({
      action: 'GRADE_OVERRIDE', target_uid: uid,
      details: { grade, motif }, created_at: FieldValue.serverTimestamp(),
    })

    // Notif WhatsApp user (non-bloquant)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/portail/notif-whatsapp`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, type: 'NOUVEAU_GRADE', data: { grade } }),
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
