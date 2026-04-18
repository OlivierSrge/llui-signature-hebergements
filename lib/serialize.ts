/**
 * lib/serialize.ts
 * Sérialise les données Firestore avant de les passer à des Client Components.
 * Les objets Timestamp Firestore ont un prototype null → crash SSR Next.js.
 * Cette fonction les convertit en chaînes ISO et supprime les types non sérialisables.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) => {
      // Timestamp Firestore : possède une méthode toDate()
      if (value !== null && typeof value === 'object' && typeof value.toDate === 'function') {
        return (value.toDate() as Date).toISOString()
      }
      // Date native JS
      if (value instanceof Date) {
        return value.toISOString()
      }
      // undefined → omis par JSON.stringify, null est conservé
      return value
    })
  ) as T
}
