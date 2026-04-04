// lib/fcm.ts — Envoi de notifications push FCM via firebase-admin

import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'

function ensureInit() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  }
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  data?: Record<string, string>
}

export async function sendPushNotification(
  fcmToken: string,
  payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
  if (!fcmToken) return { success: false, error: 'Token FCM manquant' }
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    console.warn('[FCM] Firebase admin non configuré — push désactivé')
    return { success: false, error: 'FCM non configuré' }
  }
  try {
    ensureInit()
    const messaging = getMessaging()
    await messaging.send({
      token: fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        url: payload.url ?? '/prescripteur/accueil',
        ...payload.data,
      },
      webpush: {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
        },
        fcmOptions: {
          link: payload.url ?? '/prescripteur/accueil',
        },
      },
    })
    return { success: true }
  } catch (err: any) {
    console.error('[FCM] Erreur push:', err.message)
    return { success: false, error: err.message }
  }
}
