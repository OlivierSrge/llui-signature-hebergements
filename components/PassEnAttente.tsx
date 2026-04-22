import { GRADE_CONFIGS } from '@/types/stars-grade'
import type { PassVipAnonyme } from '@/types/pass-vip'

export default function PassEnAttente({ pass }: { pass: PassVipAnonyme }) {
  const config = GRADE_CONFIGS[pass.grade_pass]

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F0E8] p-6">
      <div className="text-center max-w-xs w-full">
        <div className="text-5xl mb-4">⏳</div>
        <h1 className="text-xl font-bold text-[#1A1A1A] mb-2">Paiement en attente</h1>
        <p className="text-sm text-gray-500 mb-2">
          Votre Pass {pass.grade_pass} est réservé.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Dès confirmation de votre paiement, votre carte s'activera automatiquement sur cette page.
        </p>

        <div
          style={{
            background: config.bgGradient,
            borderColor: config.borderColor,
          }}
          className="rounded-2xl border-2 p-5 text-center"
        >
          <p style={{ color: config.textColor }} className="font-bold text-2xl mb-1">
            {config.emoji} {pass.grade_pass}
          </p>
          <p style={{ color: config.textSecondary }} className="text-sm mt-1">
            {pass.nom_usage}
          </p>
          {pass.ref_lisible && (
            <p style={{ color: config.textColor }} className="text-xs mt-3 opacity-60 font-mono">
              Réf. {pass.ref_lisible}
            </p>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-5 leading-relaxed">
          Rechargez cette page après confirmation de votre paiement.
        </p>
      </div>
    </div>
  )
}
