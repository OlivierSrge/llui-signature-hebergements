'use client'
// Bouton secondaire hero "Ce weekend à Kribi →" — dispatche openCalendrier

export default function WeekendCTA() {
  const open = () => document.dispatchEvent(new CustomEvent('openCalendrier'))

  return (
    <button
      onClick={open}
      className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-white/40 text-white text-base font-medium hover:bg-white/10 transition-colors"
    >
      Ce weekend à Kribi →
    </button>
  )
}
