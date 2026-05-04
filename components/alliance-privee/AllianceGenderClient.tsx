'use client'

import { useRouter } from 'next/navigation'

interface Props {
  partenaireId: string
  nomEtablissement: string
  description: string | null
}

export default function AllianceGenderClient({ partenaireId, nomEtablissement, description }: Props) {
  const router = useRouter()

  function handleSelect(gender: 'HOMME' | 'FEMME') {
    router.push(`/alliance-privee/tiers?pid=${partenaireId}&gender=${gender}`)
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-amber-900/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-5 py-14 flex flex-col items-center text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs tracking-widest uppercase mb-8">
          <span>✦</span>
          <span>Alliance Privée</span>
          <span>✦</span>
        </div>

        {/* Titre */}
        <h1 className="text-3xl font-serif font-light text-white mb-3">
          Vous avez été sélectionné(e)
        </h1>
        <p className="text-white/40 text-sm leading-relaxed mb-2 max-w-xs">
          {description ?? `Un espace confidentiel réservé aux membres de ${nomEtablissement}.`}
        </p>
        <p className="text-white/25 text-xs mb-10">Discrétion absolue · Sélection rigoureuse</p>

        {/* Séparateur */}
        <div className="flex items-center gap-3 w-full mb-8">
          <div className="flex-1 h-px bg-amber-500/20" />
          <span className="text-amber-500/50 text-xs tracking-widest">AVANT DE CONTINUER</span>
          <div className="flex-1 h-px bg-amber-500/20" />
        </div>

        <p className="text-white/60 text-sm mb-6">Dites-nous qui vous êtes :</p>

        {/* Sélection genre */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
          <button
            onClick={() => handleSelect('HOMME')}
            className="group flex flex-col items-center gap-3 p-6 rounded-2xl border border-white/10 bg-white/5 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all duration-200"
          >
            <span className="text-4xl transition-transform group-hover:scale-110 duration-200">👨</span>
            <div>
              <p className="text-white font-semibold text-sm">Je suis un Homme</p>
              <p className="text-white/30 text-xs mt-0.5">Diaspora · Local</p>
            </div>
          </button>

          <button
            onClick={() => handleSelect('FEMME')}
            className="group flex flex-col items-center gap-3 p-6 rounded-2xl border border-white/10 bg-white/5 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all duration-200"
          >
            <span className="text-4xl transition-transform group-hover:scale-110 duration-200">👩</span>
            <div>
              <p className="text-white font-semibold text-sm">Je suis une Femme</p>
              <p className="text-white/30 text-xs mt-0.5">Résidente Cameroun</p>
            </div>
          </button>
        </div>

        <p className="text-white/20 text-xs mt-10">
          Cette information adapte les conditions d&apos;accès à votre profil.
        </p>
      </div>
    </div>
  )
}
