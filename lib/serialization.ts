/**
 * lib/serialization.ts
 * Sérialise récursivement les objets Firestore avant passage aux Client Components.
 * Convertit : Timestamp → ISO string, Date → ISO string, objets imbriqués → récursif.
 * Utilisé dans actions/ pour garantir que tout retour de Server Action est sérialisable.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

export function serializeFirestoreDoc<T = AnyRecord>(data: AnyRecord): T {
  const result: AnyRecord = {}
  for (const [key, value] of Object.entries(data)) {
    result[key] = serializeValue(value)
  }
  return result as T
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeValue(value: any): any {
  if (value === null || value === undefined) return null

  // Firestore Timestamp : possède toDate()
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    return (value.toDate() as Date).toISOString()
  }

  // Date native JS
  if (value instanceof Date) {
    return value.toISOString()
  }

  // Tableau → mapper récursivement
  if (Array.isArray(value)) {
    return value.map((item) =>
      item !== null && typeof item === 'object' ? serializeValue(item) : item
    )
  }

  // Objet avec prototype null ou prototype classe (Firestore GeoPoint, etc.)
  if (typeof value === 'object') {
    const proto = Object.getPrototypeOf(value)
    if (proto !== Object.prototype) {
      // Prototype non-plain → JSON round-trip pour aplatir (convertit Timestamp déjà géré au-dessus)
      try {
        return JSON.parse(JSON.stringify(value))
      } catch {
        return null
      }
    }
    // Objet plain → récursif
    return serializeFirestoreDoc(value as AnyRecord)
  }

  return value
}
