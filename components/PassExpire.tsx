// components/PassExpire.tsx

import type { PassVipAnonyme } from '@/types/pass-vip'

export default function PassExpire({ pass }: { pass: PassVipAnonyme }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F0E8] p-6">
      <div className="text-center max-w-xs">
        <p className="text-5xl mb-4">⏰</p>
        <h1 className="text-xl font-bold text-[#1A1A1A] mb-2">Votre Pass a expiré</h1>
        <p className="text-sm text-gray-500 mb-2">
          Votre Pass {pass.grade_pass} n&apos;est plus actif.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Renouvelez dès maintenant pour continuer à profiter du Club L&amp;Lui Signature.
        </p>
        <a
          href="https://l-et-lui-signature.com"
          className="inline-block bg-[#C9A84C] text-white px-6 py-3 rounded-xl text-sm font-medium"
        >
          Renouveler mon Pass →
        </a>
      </div>
    </div>
  )
}
