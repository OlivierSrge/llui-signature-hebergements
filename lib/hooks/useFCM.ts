'use client'

import { useEffect } from 'react'
import { saveFcmToken } from '@/actions/prescripteurs'

const VAPID_KEY = process.env.NEXT_PUBLIC_FCM_VAPID_KEY ?? ''
const SW_URL = '/sw-prescripteur.js'

export function useFCM(prescripteurId: string | null) {
  useEffect(() => {
    if (!prescripteurId || !VAPID_KEY) return
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) return

    async function registerFCM() {
      try {
        // Demander la permission
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return

        // Enregistrer le service worker prescripteur
        const reg = await navigator.serviceWorker.register(SW_URL, { scope: '/prescripteur/' })
        await navigator.serviceWorker.ready

        // Charger Firebase depuis CDN
        // @ts-ignore
        if (typeof firebase === 'undefined') {
          await loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
          await loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')
        }

        // @ts-ignore
        const app = firebase.apps.length
          // @ts-ignore
          ? firebase.apps[0]
          // @ts-ignore
          : firebase.initializeApp({
              apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
              authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
              projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
              storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
              messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
              appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
            })

        // @ts-ignore
        const messaging = firebase.messaging(app)
        const token = await messaging.getToken({
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: reg,
        })

        if (token) {
          await saveFcmToken(prescripteurId as string, token)
          console.log('[FCM] Token enregistre')
        }
      } catch (err) {
        console.warn('[FCM] Erreur enregistrement:', err)
      }
    }

    registerFCM()
  }, [prescripteurId])
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve()
    s.onerror = reject
    document.head.appendChild(s)
  })
}
