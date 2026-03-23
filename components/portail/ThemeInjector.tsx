'use client'
// components/portail/ThemeInjector.tsx — #187 Thème visuel — injecte les couleurs portail_users dans CSS variables

import { useEffect } from 'react'

interface Props {
  couleur_primaire?: string   // ex: '#C9A84C'
  couleur_secondaire?: string // ex: '#F5F0E8'
}

export default function ThemeInjector({ couleur_primaire, couleur_secondaire }: Props) {
  useEffect(() => {
    const root = document.documentElement
    if (couleur_primaire) root.style.setProperty('--portail-gold', couleur_primaire)
    if (couleur_secondaire) root.style.setProperty('--portail-bg', couleur_secondaire)
    return () => {
      root.style.removeProperty('--portail-gold')
      root.style.removeProperty('--portail-bg')
    }
  }, [couleur_primaire, couleur_secondaire])

  return null
}
