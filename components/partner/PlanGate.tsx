'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'
import { PLANS, PLAN_ORDER, type PlanPermissions, type PlanId } from '@/lib/plans'

interface Props {
  /** La fonctionnalité requise */
  feature: keyof PlanPermissions
  /** Permissions effectives du partenaire */
  permissions: PlanPermissions
  /** Contenu à afficher si autorisé */
  children: React.ReactNode
  /** Afficher un bloc "verrouillé" si refusé (sinon ne rien afficher) */
  showLocked?: boolean
}

function getMinPlanForFeature(feature: keyof PlanPermissions): PlanId | null {
  for (const planId of PLAN_ORDER) {
    const val = PLANS[planId].permissions[feature]
    if (val === true || (typeof val === 'number' && val > 0)) return planId
  }
  return null
}

export default function PlanGate({ feature, permissions, children, showLocked = true }: Props) {
  const allowed = !!permissions[feature]
  if (allowed) return <>{children}</>
  if (!showLocked) return null

  const minPlan = getMinPlanForFeature(feature)
  const planName = minPlan ? PLANS[minPlan].name : null

  return (
    <div className="rounded-2xl border-2 border-dashed border-beige-300 bg-beige-50 p-5 flex flex-col items-center justify-center text-center gap-2 min-h-[80px]">
      <Lock size={18} className="text-dark/30" />
      <p className="text-sm text-dark/50 font-medium">
        {planName ? (
          <>Disponible à partir du plan <span className="font-bold text-dark/70">{planName}</span></>
        ) : (
          'Fonctionnalité non disponible'
        )}
      </p>
      <Link
        href="/partenaire/upgrade"
        className="text-xs font-semibold px-3 py-1.5 rounded-full text-white transition-opacity hover:opacity-90"
        style={{ background: '#C9A84C' }}
      >
        Mettre à niveau →
      </Link>
    </div>
  )
}
