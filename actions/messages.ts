'use server'

import { db } from '@/lib/firebase'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { sendPartnerNewMessageEmail } from '@/lib/email'

export type MessageRole = 'partner' | 'admin'

export interface Message {
  id: string
  partner_id: string
  sender_id: string
  sender_role: MessageRole
  sender_name: string
  text: string
  created_at: string
  read: boolean
}

// Envoyer un message (partenaire ou admin)
export async function sendMessage(
  partnerId: string,
  senderRole: MessageRole,
  senderName: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  if (!text.trim()) return { success: false, error: 'Message vide' }
  try {
    await db.collection('messages').add({
      partner_id: partnerId,
      sender_id: senderRole === 'admin' ? 'admin' : partnerId,
      sender_role: senderRole,
      sender_name: senderName,
      text: text.trim(),
      created_at: new Date().toISOString(),
      read: false,
    })
    revalidatePath('/partenaire/messages')
    revalidatePath('/admin/messages')
    revalidatePath(`/admin/messages/${partnerId}`)

    // Notifier le partenaire par email si l'admin envoie un message (non-bloquant)
    if (senderRole === 'admin') {
      ;(async () => {
        try {
          const partnerDoc = await db.collection('partenaires').doc(partnerId).get()
          const partner = partnerDoc.data()
          if (partner?.email) {
            await sendPartnerNewMessageEmail(
              { name: partner.name || 'Partenaire', email: partner.email },
              { text: text.trim(), adminName: senderName }
            )
          }
        } catch { /* silently fail */ }
      })()
    }

    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// Marquer messages comme lus (par l'admin ou le partenaire)
export async function markMessagesRead(
  partnerId: string,
  readerRole: MessageRole
): Promise<void> {
  try {
    const snap = await db.collection('messages')
      .where('partner_id', '==', partnerId)
      .where('read', '==', false)
      .get()

    const batch = db.batch()
    snap.docs.forEach((doc) => {
      const msg = doc.data()
      // Marquer lu uniquement si envoyé par l'autre partie
      const shouldMark =
        (readerRole === 'admin' && msg.sender_role === 'partner') ||
        (readerRole === 'partner' && msg.sender_role === 'admin')
      if (shouldMark) batch.update(doc.ref, { read: true })
    })
    await batch.commit()
  } catch { /* silently fail */ }
}

// Compter les messages non lus pour un partenaire (vue partenaire : messages admin non lus)
export async function getUnreadCountForPartner(partnerId: string): Promise<number> {
  try {
    const snap = await db.collection('messages')
      .where('partner_id', '==', partnerId)
      .where('sender_role', '==', 'admin')
      .where('read', '==', false)
      .get()
    return snap.size
  } catch { return 0 }
}

// Récupérer les messages d'une conversation
export async function getConversation(partnerId: string): Promise<Message[]> {
  const snap = await db.collection('messages')
    .where('partner_id', '==', partnerId)
    .get()
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Message))
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
}

// Résumé de toutes les conversations pour l'admin
export async function getAllConversations(): Promise<{
  partner_id: string
  partner_name: string
  last_message: string
  last_message_at: string
  unread_count: number
}[]> {
  const snap = await db.collection('messages').get()
  const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message))

  const byPartner: Record<string, { msgs: Message[]; partner_name: string }> = {}
  for (const msg of msgs) {
    if (!byPartner[msg.partner_id]) {
      byPartner[msg.partner_id] = { msgs: [], partner_name: msg.sender_name }
    }
    byPartner[msg.partner_id].msgs.push(msg)
    if (msg.sender_role === 'partner') {
      byPartner[msg.partner_id].partner_name = msg.sender_name
    }
  }

  // Fetch partner names for those with admin-only messages
  const partnerIds = Object.keys(byPartner)
  if (partnerIds.length > 0) {
    for (const chunk of Array.from({ length: Math.ceil(partnerIds.length / 10) }, (_, i) => partnerIds.slice(i * 10, i * 10 + 10))) {
      const ps = await db.collection('partenaires').where('__name__', 'in', chunk).get()
      ps.docs.forEach((d) => {
        if (byPartner[d.id]) byPartner[d.id].partner_name = d.data().name
      })
    }
  }

  return Object.entries(byPartner).map(([partner_id, { msgs, partner_name }]) => {
    const sorted = msgs.sort((a, b) => b.created_at.localeCompare(a.created_at))
    const unread = msgs.filter((m) => m.sender_role === 'partner' && !m.read).length
    return {
      partner_id,
      partner_name,
      last_message: sorted[0]?.text?.substring(0, 60) || '',
      last_message_at: sorted[0]?.created_at || '',
      unread_count: unread,
    }
  }).sort((a, b) => b.last_message_at.localeCompare(a.last_message_at))
}
