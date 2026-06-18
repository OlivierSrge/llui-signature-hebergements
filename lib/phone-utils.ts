/**
 * lib/phone-utils.ts — Utilitaires téléphone (normalisation E.164)
 * Logique Cameroun par défaut (+237), sans dépendance externe.
 */

/**
 * Normalise un numéro de téléphone en format E.164.
 * Formats acceptés :
 *   "237690123456"         → "+237690123456"
 *   "+237 690 123 456"     → "+237690123456"
 *   "690123456"            → "+237690123456"  (préfixe Cameroun ajouté)
 *   "0690123456"           → "+237690123456"
 *   "00237690123456"       → "+237690123456"
 * Retourne null si le numéro est vide ou indéterminable.
 */
export function normalizePhoneToE164(phone: string | undefined | null): string | null {
  if (!phone) return null

  let t = phone.replace(/[\s\-().+]/g, '')

  // Supprimer préfixe international 00
  if (t.startsWith('00')) t = t.slice(2)

  // 9 chiffres → numéro local Cameroun (ex: 690123456)
  if (/^\d{9}$/.test(t)) return '+237' + t

  // 10 chiffres commençant par 0 → 0690... (retirer le 0)
  if (/^0\d{9}$/.test(t)) return '+237' + t.slice(1)

  // Déjà préfixé 237 + 9 chiffres
  if (/^237\d{9}$/.test(t)) return '+' + t

  // Numéro international complet (10-15 chiffres avec indicatif)
  if (/^\d{10,15}$/.test(t)) return '+' + t

  return null
}

/**
 * Vérifie qu'un numéro est en format E.164 valide.
 */
export function isValidE164(phone: string): boolean {
  return /^\+\d{10,15}$/.test(phone)
}
