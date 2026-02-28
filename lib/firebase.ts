import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

let _db: Firestore | null = null

export function getDb(): Firestore {
  if (!_db) {
    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      })
    }
    _db = getFirestore()
  }
  return _db
}

// Proxy object so existing code can use `db.collection(...)` directly
export const db = new Proxy({} as Firestore, {
  get(_target, prop) {
    return (getDb() as any)[prop]
  },
})
