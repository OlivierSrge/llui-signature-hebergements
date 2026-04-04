import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { getStorage, type Storage } from 'firebase-admin/storage'

// Singleton Firebase Admin — un seul initializeApp() par instance Lambda.
// getApps()[0] réutilise l'app déjà initialisée sans recréer les connexions.
function initFirebase() {
  if (getApps().length > 0) return   // déjà initialisé → réutiliser
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  })
}

let _db: Firestore | null = null
export function getDb(): Firestore {
  initFirebase()
  if (!_db) _db = getFirestore()
  return _db
}

let _storage: Storage | null = null
export function getStorageBucket() {
  initFirebase()
  if (!_storage) _storage = getStorage()
  return _storage.bucket()
}

// Proxy object so existing code can use `db.collection(...)` directly
export const db = new Proxy({} as Firestore, {
  get(_target, prop) {
    return (getDb() as any)[prop]
  },
})
