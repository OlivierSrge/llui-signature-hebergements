// app/api/portail/notif-whatsapp/route.ts
// Notifications WhatsApp Green API — POST { uid, type, data }

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import {
  sendWhatsApp,
  msgBienvenue, msgNouveauGrade, msgCommissionRecue,
  msgFastStartDebloque, msgRappelTodo, msgRelanceInvite,
} from '@/lib/whatsappNotif'

export const dynamic = 'force-dynamic'

type NotifType = 'BIENVENUE' | 'NOUVEAU_GRADE' | 'COMMISSION' | 'FAST_START' | 'RAPPEL_TODO' | 'RELANCE_INVITE'

function buildMessage(type: NotifType, nom: string, data: Record<string, unknown>): string {
  switch (type) {
    case 'BIENVENUE': return msgBienvenue(nom)
    case 'NOUVEAU_GRADE': return msgNouveauGrade(nom, String(data.grade ?? ''))
    case 'COMMISSION': return msgCommissionRecue(nom, Number(data.montant ?? 0), String(data.type_commission ?? ''))
    case 'FAST_START': return msgFastStartDebloque(nom, Number(data.palier ?? 30), Number(data.montant ?? 0))
    case 'RAPPEL_TODO': return msgRappelTodo(nom, Number(data.rev_gagnes ?? 0))
    case 'RELANCE_INVITE': return msgRelanceInvite(String(data.noms_maries ?? nom), String(data.nom_invite ?? ''), String(data.magic_link ?? ''))
    default: return ''
  }
}

export async function POST(req: NextRequest) {
  try {
    const { uid, type, data = {} } = await req.json() as { uid: string; type: NotifType; data: Record<string, unknown> }
    if (!uid || !type) return NextResponse.json({ error: 'uid et type requis' }, { status: 400 })

    const db = getDb()
    const snap = await db.collection('portail_users').doc(uid).get()
    if (!snap.exists) return NextResponse.json({ skipped: true, reason: 'user_not_found' })

    const d = snap.data()!
    const telephone: string = d.phone ?? ''

    // Logger dans notifs_log
    const logRef = db.collection('notifs_log').doc()
    await logRef.set({
      uid, type, telephone,
      sent_at: FieldValue.serverTimestamp(), data,
    })

    if (!telephone) {
      return NextResponse.json({ skipped: true, reason: 'no_telephone' })
    }

    const nom: string = d.displayName ?? 'Partenaire'
    const message = buildMessage(type, nom, data)
    if (!message) return NextResponse.json({ skipped: true, reason: 'type_inconnu' })

    const result = await sendWhatsApp(telephone, message)
    await logRef.update({ delivered: result.success, error: result.error ?? null })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('notif-whatsapp error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
