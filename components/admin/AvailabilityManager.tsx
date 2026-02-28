'use client'

import { useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { fr } from 'date-fns/locale'
import { format, parseISO, startOfDay } from 'date-fns'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, Unlock } from 'lucide-react'
import { updateAvailability } from '@/actions/accommodations'
import 'react-day-picker/style.css'

interface Props {
  accommodationId: string
  unavailableDates: string[]
}

export default function AvailabilityManager({ accommodationId, unavailableDates }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Date[]>([])
  const [blocked, setBlocked] = useState<Set<string>>(new Set(unavailableDates))
  const [saving, setSaving] = useState(false)

  const today = startOfDay(new Date())

  const handleDayClick = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    setSelected((prev) => {
      const exists = prev.find((d) => format(d, 'yyyy-MM-dd') === dateStr)
      return exists
        ? prev.filter((d) => format(d, 'yyyy-MM-dd') !== dateStr)
        : [...prev, day]
    })
  }

  const blockSelected = async () => {
    if (selected.length === 0) {
      toast.error('Sélectionnez d\'abord des dates')
      return
    }
    setSaving(true)
    const dates = selected.map((d) => ({
      date: format(d, 'yyyy-MM-dd'),
      is_available: false,
    }))
    const result = await updateAvailability(accommodationId, dates)
    if (!result.success) {
      toast.error(result.error)
    } else {
      const newBlocked = new Set(blocked)
      dates.forEach(({ date }) => newBlocked.add(date))
      setBlocked(newBlocked)
      setSelected([])
      toast.success(`${dates.length} date${dates.length > 1 ? 's' : ''} bloquée${dates.length > 1 ? 's' : ''}`)
      router.refresh()
    }
    setSaving(false)
  }

  const unblockSelected = async () => {
    if (selected.length === 0) {
      toast.error('Sélectionnez d\'abord des dates')
      return
    }
    setSaving(true)
    const dates = selected.map((d) => ({
      date: format(d, 'yyyy-MM-dd'),
      is_available: true,
    }))
    const result = await updateAvailability(accommodationId, dates)
    if (!result.success) {
      toast.error(result.error)
    } else {
      const newBlocked = new Set(blocked)
      dates.forEach(({ date }) => newBlocked.delete(date))
      setBlocked(newBlocked)
      setSelected([])
      toast.success(`${dates.length} date${dates.length > 1 ? 's' : ''} libérée${dates.length > 1 ? 's' : ''}`)
      router.refresh()
    }
    setSaving(false)
  }

  const blockedDates = Array.from(blocked).map((d) => parseISO(d))
  const selectedDates = selected

  return (
    <div className="bg-white rounded-2xl border border-beige-200 p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-dark mb-1">Calendrier de disponibilités</h3>
        <p className="text-xs text-dark/50">
          Cliquez sur les dates pour les sélectionner, puis bloquez ou libérez.
          {selected.length > 0 && (
            <span className="ml-2 text-gold-600 font-medium">
              {selected.length} date{selected.length > 1 ? 's' : ''} sélectionnée{selected.length > 1 ? 's' : ''}
            </span>
          )}
        </p>
      </div>

      {/* Calendar */}
      <div className="rdp-admin overflow-x-auto">
        <DayPicker
          mode="multiple"
          selected={selectedDates}
          onDayClick={handleDayClick}
          locale={fr}
          disabled={{ before: today }}
          numberOfMonths={2}
          modifiers={{
            blocked: blockedDates,
          }}
          modifiersClassNames={{
            blocked: 'rdp-day_blocked',
            selected: 'rdp-day_admin_selected',
          }}
        />
      </div>

      <style jsx global>{`
        .rdp-admin {
          --rdp-accent-color: #C9A84C;
        }
        .rdp-admin .rdp-day_blocked {
          background-color: #fee2e2 !important;
          color: #ef4444 !important;
          text-decoration: line-through;
          border-radius: 6px;
        }
        .rdp-admin .rdp-day_admin_selected {
          background-color: #C9A84C !important;
          color: white !important;
          font-weight: 700;
          border-radius: 6px;
        }
        .rdp-admin .rdp-caption_label {
          font-family: 'Playfair Display', serif;
          font-weight: 600;
          text-transform: capitalize;
        }
      `}</style>

      {/* Actions */}
      <div className="mt-5 pt-4 border-t border-beige-200 flex flex-wrap gap-3">
        <button
          onClick={blockSelected}
          disabled={saving || selected.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-40"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
          Bloquer les dates sélectionnées
        </button>
        <button
          onClick={unblockSelected}
          disabled={saving || selected.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-40"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Unlock size={14} />}
          Libérer les dates sélectionnées
        </button>
        {selected.length > 0 && (
          <button
            onClick={() => setSelected([])}
            className="px-4 py-2.5 bg-beige-100 text-dark/60 rounded-xl text-sm hover:bg-beige-200 transition-colors"
          >
            Désélectionner tout
          </button>
        )}
      </div>
    </div>
  )
}
