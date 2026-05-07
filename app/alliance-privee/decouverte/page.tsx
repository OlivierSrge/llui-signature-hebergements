import { Suspense } from 'react'
import AllianceDecouverteClient from './AllianceDecouverteClient'

export const metadata = {
  title: 'Alliance Privée — Découvrir le club',
  description: 'Le premier club de rencontre sélectif du Cameroun. Découvrez comment Alliance Privée fonctionne.',
}

export default function AllianceDecouverte_Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#C9A84C]/40 border-t-[#C9A84C] rounded-full animate-spin" />
      </div>
    }>
      <AllianceDecouverteClient />
    </Suspense>
  )
}
