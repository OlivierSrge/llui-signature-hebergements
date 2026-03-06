'use client'

import { useState, useMemo } from 'react'
import { DayPicker } from 'react-day-picker'
import { fr } from 'date-fns/locale'
import { format, startOfDay, addDays, parseISO, eachDayOfInterval } from 'date-fns'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, Unlock } from 'lucide-react'
import { updateAvailability } from '@/actions/accommodations'
import 'react-day-picker/style.css'

interface ReservationRange {
  check_in: string
  check_out: string
  guest_name: string
}

interface Props {
  accommodationId: string
  unavailableDates: string[]
  reservations?: ReservationRange[]
  pendingReservations?: ReservationRange[]
}

export default function PartnerCalendar({ accommodationId, unavailableDates, reservations = [], pendingReservations = [] }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Date[]>([])
  const [blocked, setBlocked] = useState<Set<string>>(new Set(unavailableDates))
  const [saving, setSaving] = useState(false)

  const today = startOfDay(new Date())

  // Dates des réservations confirmées → rouge, non modifiables
  const confirmedReservationDates = useMemo(() => reservations.flatMap((r) => {
    try {
      return eachDayOfInterval({ start: parseISO(r.check_in), end: addDays(parseISO(r.check_out), -1) })
    } catch { return [] }
  }), [reservations])

  // Dates des réservations en attente → jaune, non modifiables
  const pendingReservationDates = useMemo(() => pendingReservations.flatMap((r) => {
    try {
      return eachDayOfInterval({ start: parseISO(r.check_in), end: addDays(parseISO(r.check_out), -1) })
    } catch { return [] }
  }), [pendingReservations])

  const reservedSet = useMemo(() => {
    const all = [...confirmedReservationDates, ...pendingReservationDates]
    return new Set(all.map((d) => format(d, 'yyyy-MM-dd')))
  }, [confirmedReservationDates, pendingReservationDates])

  // Toutes les dates disponibles des 90 prochains jours (non bloquées, non réservées)
  const availableDates = useMemo(() => {
    const dates: Date[] = []
    for (let i = 0; i <= 90; i++) {
      const d = addDays(today, i)
      const str = format(d, 'yyyy-MM-dd')
      if (!blocked.has(str) && !reservedSet.has(str)) dates.push(d)
    }
    return dates
  }, [blocked, reservedSet, today])

  const handleDayClick = (day: Date) => {
    if (day < today) return
    const dateStr = format(day, 'yyyy-MM-dd')
    if (reservedSet.has(dateStr)) return // réservation confirmée → non modifiable
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
        modifiers={{ blocked: blockedDates, available: availableDates, confirmedReservations: confirmedReservationDates, pendingReservations: pendingReservationDates }}
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
          confirmedReservations: {
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            fontWeight: '600',
            borderRadius: '100%',
            cursor: 'not-allowed',
          },
          pendingReservations: {
            backgroundColor: '#fef9c3',
            color: '#854d0e',
            fontWeight: '600',
            borderRadius: '100%',
            cursor: 'not-allowed',
          },
        }}
        styles={{ root: { margin: 0 } }}
        numberOfMonths={2}
        pagedNavigation
      />

      {/* Légende */}
      <div className="flex flex-wrap items-center gap-4 mt-2 mb-4 text-xs text-dark/50">
        <span className="flex items-center gap-1.5">
          🟢 Disponible
        </span>
        <span className="flex items-center gap-1.5">
          🟡 En attente paiement
        </span>
        <span className="flex items-center gap-1.5">
          🔴 Occupé (confirmé)
        </span>
        <span className="flex items-center gap-1.5">
          ⬛ Bloqué manuellement
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
