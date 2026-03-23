'use client'
// components/portail/BadgeSolidaire.tsx — #162 Badge solidaire portail couple

interface Props {
  montant_contribution: number
  noms_maries: string
}

export default function BadgeSolidaire({ montant_contribution, noms_maries }: Props) {
  if (!montant_contribution || montant_contribution <= 0) return null
  return (
    <div className="rounded-2xl p-4 text-center" style={{ background: 'linear-gradient(135deg, #1A2E1A, #2A3E2A)', border: '1px solid #7C9A7E40' }}>
      <div className="text-3xl mb-2">💚</div>
      <p className="text-xs tracking-[0.2em] uppercase mb-1" style={{ color: '#7C9A7E' }}>Couple Solidaire</p>
      <p className="text-white font-semibold text-sm">{noms_maries}</p>
      <p className="text-xs mt-2" style={{ color: '#7C9A7E' }}>
        {new Intl.NumberFormat('fr-FR').format(Math.round(montant_contribution))} FCFA reversés au Fonds Solidarité L&Lui
      </p>
      <p className="text-[10px] mt-2" style={{ color: '#4A6A4A' }}>
        1% de votre mariage contribue à des projets solidaires à Kribi
      </p>
    </div>
  )
}
