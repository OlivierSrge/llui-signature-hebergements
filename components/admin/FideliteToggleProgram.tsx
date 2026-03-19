'use client'

import { useState } from 'react'
import { toggleProgram } from '@/actions/fidelite'

export default function FideliteToggleProgram({ initialActive }: { initialActive: boolean }) {
  const [active, setActive] = useState(initialActive)
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleToggle = async () => {
    setLoading(true)
    const res = await toggleProgram(!active)
    if (res.success) setActive(!active)
    setLoading(false)
    setShowConfirm(false)
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
          active
            ? 'bg-green-100 text-green-800 border-green-200'
            : 'bg-red-100 text-red-800 border-red-200'
        }`}>
          {active ? '● Programme actif' : '● Programme suspendu'}
        </span>
        <button
          onClick={() => setShowConfirm(true)}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-medium rounded-xl border border-beige-200 hover:bg-beige-50 transition-colors text-dark/70"
        >
          {active ? 'Suspendre' : 'Activer'}
        </button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark/40">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="font-serif text-lg font-semibold text-dark mb-2">
              {active ? 'Suspendre le programme ?' : 'Activer le programme ?'}
            </h3>
            <p className="text-sm text-dark/60 mb-5">
              {active
                ? 'Les clients ne pourront plus cumuler de points ni utiliser leurs avantages.'
                : 'Le programme de fidélité sera réactivé pour tous les clients.'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 rounded-xl border border-beige-200 text-sm text-dark/60 hover:bg-beige-50">
                Annuler
              </button>
              <button onClick={handleToggle} disabled={loading}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold text-white ${
                  active ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'
                }`}>
                {loading ? '...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
