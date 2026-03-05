'use client'

import { useState, useMemo } from 'react'
import { DayPicker } from 'react-day-picker'
import { fr } from 'date-fns/locale'
import { format, startOfDay, addDays } from 'date-fns'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, Unlock } from 'lucide-react'
import { updateAvailability } from '@/actions/accommodations'
import 'react-day-picker/style.css'

interface Props {
  accommodationId: string
  unavailableDates: string[]
}

export default function PartnerCalendar({ accommodationId, unavailableDates }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Date[]>([])
  const [blocked, setBlocked] = useState<Set<string>>(new Set(unavailableDates))
  const [saving, setSaving] = useState(false)

  const today = startOfDay(new Date())

  // Toutes les dates disponibles des 90 prochains jours (non bloquées)
  const availableDates = useMemo(() => {
    const dates: Date[] = []
    for (let i = 0; i <= 90; i++) {
      const d = addDays(today, i)
      const str = format(d, 'yyyy-MM-dd')
      if (!blocked.has(str)) dates.push(d)
    }
    return dates
  }, [blocked, today])

  const handleDayClick = (day: Date) => {
    if (day < today) return
    const dateStr = format(day, 'yyyy-MM-dd')
    setSelected((prev) => {
      const exists = prev.find((d) => format(d, 'yyyy-MM-dd') === dateStr)
      return exists
        ? prev.filter((d) => format(d, 'yyyy-MM-dd') !== dateStr)
        : [...prev, day]
    })
  }

  const blockSelected = async () => {
    if (selected.length === 0) { toast.error('Sélectionnez des dates'); return }
    setSaving(true)
    const result = await updateAvailability(
      accommodationId,
      selected.map((d) => ({ date: format(d, 'yyyy-MM-dd'), is_available: false }))
    )
    if (!result.success) { toast.error(result.error); setSaving(false); return }
    const newBlocked = new Set(blocked)
    selected.forEach((d) => newBlocked.add(format(d, 'yyyy-MM-dd')))
    setBlocked(newBlocked)
    setSelected([])
    setSaving(false)
    toast.success(`${selected.length} date${selected.length > 1 ? 's' : ''} bloquée${selected.length > 1 ? 's' : ''}`)
    router.refresh()
  }

  const unblockSelected = async () => {
    if (selected.length === 0) { toast.error('Sélectionnez des dates'); return }
    setSaving(true)
    const result = await updateAvailability(
      accommodationId,
      selected.map((d) => ({ date: format(d, 'yyyy-MM-dd'), is_available: true }))
    )
    if (!result.success) { toast.error(result.error); setSaving(false); return }
    const newBlocked = new Set(blocked)
    selected.forEach((d) => newBlocked.delete(format(d, 'yyyy-MM-dd')))
    setBlocked(newBlocked)
    setSelected([])
    setSaving(false)
    toast.success(`${selected.length} date${selected.length > 1 ? 's' : ''} libérée${selected.length > 1 ? 's' : ''}`)
    router.refresh()
  }

  const blockedDates = Array.from(blocked).map((d) => new Date(d + 'T12:00:00'))

  return (
    <div>
      <DayPicker
        mode="multiple"
        selected={selected}
        onDayClick={handleDayClick}
        locale={fr}
        disabled={{ before: today }}
        modifiers={{ blocked: blockedDates, available: availableDates }}
        modifiersStyles={{
          available: {
            backgroundColor: '#dcfce7',
            color: '#15803d',
            borderRadius: '100%',
          },
          blocked: {
            backgroundColor: '#fecaca',
            color: '#991b1b',
            fontWeight: '600',
            borderRadius: '100%',
          },
        }}
        styles={{ root: { margin: 0 } }}
        numberOfMonths={2}
        pagedNavigation
      />

      {/* Légende */}
      <div className="flex flex-wrap items-center gap-4 mt-2 mb-4 text-xs text-dark/50">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-200 inline-block" /> Disponible
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-300 inline-block" /> Bloqué
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-gold-400 inline-block" /> Sélectionné
        </span>
      </div>

      {/* Actions */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-2">
          <button
            type="button" onClick={blockSelected} disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
            Bloquer {selected.length} date{selected.length > 1 ? 's' : ''}
          </button>
          <button
            type="button" onClick={unblockSelected} disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 border border-green-200 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Unlock size={14} />}
            Libérer {selected.length} date{selected.length > 1 ? 's' : ''}
          </button>
          <button
            type="button" onClick={() => setSelected([])}
            className="px-4 py-2.5 text-dark/50 border border-beige-200 rounded-xl text-sm hover:bg-beige-50 transition-colors"
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  )
}
