import { db } from '@/lib/firebase'
import { MessageCircle, Send } from 'lucide-react'
import { formatDate } from '@/lib/utils'

async function getLogs(reservationId: string) {
  try {
    const snap = await db
      .collection('reservations')
      .doc(reservationId)
      .collection('whatsapp_logs')
      .orderBy('sent_at', 'asc')
      .get()
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[]
  } catch {
    return []
  }
}

const BUTTON_COLORS: Record<number, string> = {
  1: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  2: 'bg-blue-100 text-blue-700 border-blue-200',
  3: 'bg-amber-100 text-amber-700 border-amber-200',
  4: 'bg-purple-100 text-purple-700 border-purple-200',
}

export default async function WhatsAppHistory({ reservationId }: { reservationId: string }) {
  const logs = await getLogs(reservationId)

  if (logs.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-beige-200 p-5">
      <h3 className="font-semibold text-dark mb-4 flex items-center gap-2">
        <MessageCircle size={16} className="text-green-500" />
        Historique des communications
      </h3>
      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="flex items-center gap-3 py-2 border-b border-beige-100 last:border-0">
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${BUTTON_COLORS[log.button] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
              <Send size={9} /> Étape {log.button}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-dark">{log.button_label}</p>
              <p className="text-[10px] text-dark/40">Par {log.sent_by}</p>
            </div>
            <p className="text-[10px] text-dark/40 whitespace-nowrap">
              {log.sent_at ? formatDate(log.sent_at, 'dd/MM/yyyy HH:mm') : ''}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
