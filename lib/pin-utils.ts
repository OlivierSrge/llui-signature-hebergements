// ── Utilitaires PIN pour l'authentification client L&Lui Stars ──

// Génère un code PIN à 4 chiffres
export function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

// Hash simple suffisant pour un PIN 4 chiffres avec expiry 15 min
export function hashPin(pin: string): string {
  return Buffer.from(`LLUI_${pin.trim()}_STARS_2024`).toString('base64')
}

export function verifyPin(pin: string, hash: string): boolean {
  return hashPin(pin.trim()) === hash
}
