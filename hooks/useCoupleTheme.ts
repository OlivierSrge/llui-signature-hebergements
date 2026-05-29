'use client'
// hooks/useCoupleTheme.ts
// Injecte les variables CSS du thème couple sur <html> et gère le fallback L&Lui

import { useEffect } from 'react'

export interface CoupleTheme {
  principal: string    // couleur principale (ex: #1B4F72)
  secondaire: string   // couleur secondaire (ex: #85C1E9)
  accent: string       // accent / doré (ex: #C9A84C)
  texte: string        // couleur texte (ex: #0D2137)
  fond: string         // couleur fond (ex: #F0F8FF)
  nom: string          // identifiant du thème (ex: 'ocean', 'jardin', 'llui')
}

// Thème par défaut L&Lui (fallback)
export const THEME_LLUI: CoupleTheme = {
  principal: '#1A1A1A',
  secondaire: '#C9A84C',
  accent: '#C9A84C',
  texte: '#1A1A1A',
  fond: '#FAF6EE',
  nom: 'llui',
}

// Thème Océan — Diane & Charly
export const THEME_OCEAN: CoupleTheme = {
  principal: '#1B4F72',
  secondaire: '#85C1E9',
  accent: '#C9A84C',
  texte: '#0D2137',
  fond: '#F0F8FF',
  nom: 'ocean',
}

const PRESETS: Record<string, CoupleTheme> = {
  ocean: THEME_OCEAN,
  llui: THEME_LLUI,
}

/**
 * Injecte les variables CSS du thème couple sur :root.
 * Les variables sont utilisables directement dans les styles Tailwind inline ou CSS.
 *
 * Variables exposées :
 *   --theme-principal   → couleur dominante
 *   --theme-secondaire  → couleur secondaire
 *   --theme-accent      → accent / doré
 *   --theme-texte       → couleur texte
 *   --theme-fond        → couleur de fond
 */
export function useCoupleTheme(theme?: Partial<CoupleTheme> | null): CoupleTheme {
  const resolved: CoupleTheme = {
    ...THEME_LLUI,
    ...(theme?.nom && PRESETS[theme.nom] ? PRESETS[theme.nom] : {}),
    ...theme,
  }

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--theme-principal', resolved.principal)
    root.style.setProperty('--theme-secondaire', resolved.secondaire)
    root.style.setProperty('--theme-accent', resolved.accent)
    root.style.setProperty('--theme-texte', resolved.texte)
    root.style.setProperty('--theme-fond', resolved.fond)

    return () => {
      root.style.removeProperty('--theme-principal')
      root.style.removeProperty('--theme-secondaire')
      root.style.removeProperty('--theme-accent')
      root.style.removeProperty('--theme-texte')
      root.style.removeProperty('--theme-fond')
    }
  }, [resolved.principal, resolved.secondaire, resolved.accent, resolved.texte, resolved.fond])

  return resolved
}
