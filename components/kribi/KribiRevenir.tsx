'use client'

import { useState } from 'react'
import { Copy, CheckCircle, Calendar } from 'lucide-react'

const KRIBI_URL = 'https://llui-signature-hebergements.vercel.app/kribi'
const KRIBI_SHORT = 'llui-sig.app/kribi'

export default function KribiRevenir() {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(KRIBI_URL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback pour les navigateurs sans clipboard API
      const el = document.createElement('textarea')
      el.value = KRIBI_URL
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  return (
    <section className="py-14 px-4" style={{ background: '#1A1A1A' }}>
      <div className="max-w-sm mx-auto text-center">
        {/* Icône */}
        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.2)' }}>
          <Calendar size={26} className="text-[#C9A84C]" />
        </div>

        {/* Titre */}
        <p className="text-[#C9A84C] text-xs font-medium tracking-widest uppercase mb-3">
          Mis à jour chaque vendredi
        </p>
        <h2 className="font-serif text-xl font-semibold text-white mb-3 leading-snug">
          Nouveau calendrier<br />chaque semaine
        </h2>
        <p className="text-white/45 text-sm mb-7 leading-relaxed">
          Le calendrier des activités de Kribi est mis à jour chaque vendredi soir.
          Ajoutez cette page à vos favoris pour ne rien manquer.
        </p>

        {/* Bouton copier le lien */}
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-2 w-full justify-center py-3.5 rounded-xl font-semibold text-sm mb-3 transition-all"
          style={
            copied
              ? { background: '#1D9E75', color: '#fff' }
              : { background: '#C9A84C', color: '#1A1A1A' }
          }
        >
          {copied ? (
            <>
              <CheckCircle size={15} />
              Lien copié !
            </>
          ) : (
            <>
              <Copy size={15} />
              Copier le lien
            </>
          )}
        </button>

        {/* URL visible */}
        <p className="text-white/25 text-xs font-mono mb-4">{KRIBI_SHORT}</p>

        {/* Mention légère */}
        <p className="text-white/20 text-xs">
          Mis à jour chaque vendredi · Gratuit · Sans inscription
        </p>
      </div>
    </section>
  )
}
