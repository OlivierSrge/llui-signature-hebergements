'use client'

import { useState } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { sendDailyReportWhatsApp } from '@/actions/whatsapp-pipeline'
import { toast } from 'react-hot-toast'
import { formatPrice } from '@/lib/utils'

interface DailyData {
  reservations_today: number
  payments_today: number
  revenue_today: number
  commissions_today: number
  pending_demands: number
}

export default function DailyReportButton({ dailyData }: { dailyData: DailyData }) {
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    setLoading(true)
    const result = await sendDailyReportWhatsApp()
    setLoading(false)
    if (!result.success) { toast.error(result.error); return }
    window.open((result as any).url, '_blank')
    toast.success('Résumé prêt — ouverture WhatsApp')
  }

  return (
    <button
      onClick={handleSend}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
      Résumé WhatsApp
    </button>
  )
}
