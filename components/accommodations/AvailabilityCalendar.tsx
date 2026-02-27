'use client'

import { useState } from 'react'
import { DayPicker, type DateRange } from 'react-day-picker'
import { fr } from 'date-fns/locale'
import { format, isBefore, startOfDay, parseISO } from 'date-fns'
import 'react-day-picker/style.css'

interface Props {
  unavailableDates: string[]
  onRangeSelect?: (range: DateRange | undefined) => void
  selectedRange?: DateRange
}

export default function AvailabilityCalendar({
  unavailableDates,
  onRangeSelect,
  selectedRange,
}: Props) {
  const today = startOfDay(new Date())

  const disabledDays = [
    { before: today },
    ...unavailableDates.map((d) => parseISO(d)),
  ]

  return (
    <div className="rdp-custom">
      <DayPicker
        mode="range"
        selected={selectedRange}
        onSelect={onRangeSelect}
        disabled={disabledDays}
        locale={fr}
        numberOfMonths={2}
        pagedNavigation
        modifiersClassNames={{
          selected: 'rdp-day_selected',
          range_start: 'rdp-day_range_start',
          range_end: 'rdp-day_range_end',
          range_middle: 'rdp-day_range_middle',
          disabled: 'rdp-day_disabled',
          today: 'rdp-day_today',
        }}
        styles={{
          root: { margin: 0 },
        }}
      />

      <style jsx global>{`
        .rdp-custom {
          --rdp-accent-color: #C9A84C;
          --rdp-background-color: #fdf8ed;
          --rdp-accent-color-dark: #b8973b;
          --rdp-background-color-dark: #f9eed4;
          --rdp-outline: 2px solid var(--rdp-accent-color);
          --rdp-outline-offset: 2px;
        }

        .rdp-custom .rdp-day_selected,
        .rdp-custom .rdp-day_range_start,
        .rdp-custom .rdp-day_range_end {
          background-color: #C9A84C !important;
          color: white !important;
          font-weight: 600;
          border-radius: 8px;
        }

        .rdp-custom .rdp-day_range_middle {
          background-color: #fdf8ed !important;
          color: #C9A84C !important;
          border-radius: 0;
        }

        .rdp-custom .rdp-day_today:not(.rdp-day_selected) {
          color: #C9A84C;
          font-weight: 700;
          text-decoration: underline;
          text-decoration-color: #C9A84C;
        }

        .rdp-custom .rdp-day_disabled {
          color: #ccc !important;
          text-decoration: line-through;
          background-color: #f5f0e8 !important;
        }

        .rdp-custom .rdp-nav_button {
          color: #C9A84C;
        }

        .rdp-custom .rdp-caption_label {
          font-family: 'Playfair Display', serif;
          font-size: 1rem;
          font-weight: 600;
          color: #1A1A1A;
          text-transform: capitalize;
        }

        .rdp-custom .rdp-head_cell {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #9a7a2e;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .rdp-custom .rdp-months {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  )
}
