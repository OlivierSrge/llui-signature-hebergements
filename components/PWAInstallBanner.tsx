'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Audience = 'partner' | 'client' | null

const STORAGE_KEYS = {
  partner: 'pwa_dismissed_partner',
  client: 'pwa_dismissed_client',
  visits: 'pwa_visits_client',
}

const DISMISS_DURATION = {
  partner: 30 * 24 * 60 * 60 * 1000, // 30 jours
  client: 7 * 24 * 60 * 60 * 1000,   // 7 jours
}

export default function PWAInstallBanner() {
  const pathname = usePathname()
  const [audience, setAudience] = useState<Audience>(null)
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Ne jamais afficher sur desktop
    if (window.innerWidth > 768) return

    // Ne pas afficher si déjà installé en mode standalone
    if (window.matchMedia('(display-mode: standalone)').matches) return

    // Détecter iOS/Safari
    const ua = navigator.userAgent
    const ios = /iPhone|iPad|iPod/.test(ua) && !(ua as string).includes('CriOS')
    setIsIOS(ios)

    // Détecter l'audience
    const isPartner = pathname.startsWith('/partner') || pathname.startsWith('/partenaire')
    const isClient = pathname.startsWith('/mon-compte')

    if (isPartner) {
      const dismissed = localStorage.getItem(STORAGE_KEYS.partner)
      if (dismissed && Date.now() < parseInt(dismissed)) return
      setAudience('partner')
      setShow(true)
    } else if (isClient) {
      const dismissed = localStorage.getItem(STORAGE_KEYS.client)
      if (dismissed && Date.now() < parseInt(dismissed)) return

      // Incrémenter le compteur de visites
      const visits = parseInt(localStorage.getItem(STORAGE_KEYS.visits) || '0') + 1
      localStorage.setItem(STORAGE_KEYS.visits, String(visits))

      // N'afficher qu'à partir de la 2ème visite
      if (visits < 2) return

      setAudience('client')
      setShow(true)
    }
    // Visiteur anonyme → jamais de bannière
  }, [pathname])

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleDismiss = () => {
    if (!audience) return
    const key = STORAGE_KEYS[audience]
    const duration = DISMISS_DURATION[audience]
    localStorage.setItem(key, String(Date.now() + duration))
    setShow(false)
  }

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setShow(false)
      }
      setDeferredPrompt(null)
    }
  }

  if (!show || !audience) return null

  const isPartner = audience === 'partner'

  const iosMessage = isPartner
    ? "Appuyez sur ⬆️ Partager puis 'Sur l'écran d'accueil' pour accéder à votre espace partenaire en 1 tap."
    : "Appuyez sur ⬆️ Partager puis 'Sur l'écran d'accueil' pour retrouver vos points L&Lui Stars en 1 tap."

  return (
    <>
      {/* Spacer pour éviter que la bannière masque le contenu */}
      <div style={{ height: isIOS ? '140px' : '96px' }} />

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          backgroundColor: '#F5F0E8',
          borderTop: '2px solid #C9A84C',
          borderRadius: '16px 16px 0 0',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.12)',
          padding: '16px',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {!isIOS ? (
          // Bannière Android/Chrome
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '15px', color: '#1A1A1A' }}>
                {isPartner ? '🏠 Gérez vos réservations en 1 clic' : '⭐ Retrouvez vos avantages L&Lui Stars'}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#555' }}>
                {isPartner
                  ? 'Installez votre espace partenaire L&Lui sur votre téléphone'
                  : 'Installez votre espace fidélité sur votre écran d\'accueil'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleInstall}
                style={{
                  backgroundColor: '#C9A84C',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 18px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  flex: 1,
                }}
              >
                {isPartner ? '✅ Installer l\'application' : '⭐ Installer'}
              </button>
              <button
                onClick={handleDismiss}
                style={{
                  backgroundColor: 'transparent',
                  color: '#888',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Plus tard
              </button>
            </div>
          </div>
        ) : (
          // Instructions iOS/Safari
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '15px', color: '#1A1A1A' }}>
                {isPartner ? '🏠 Espace partenaire sur votre écran' : '⭐ L&Lui Stars sur votre écran'}
              </p>
              <button
                onClick={handleDismiss}
                style={{
                  backgroundColor: 'transparent',
                  color: '#888',
                  border: 'none',
                  fontSize: '20px',
                  lineHeight: 1,
                  cursor: 'pointer',
                  padding: '0 0 0 12px',
                }}
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>
            <div
              style={{
                backgroundColor: '#FFF8EC',
                border: '1px solid #E8D5A0',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '13px',
                color: '#1A1A1A',
                lineHeight: '1.6',
              }}
            >
              {iosMessage}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#555' }}>
              <span>1️⃣</span><span>Appuyez sur <strong>⬆️ Partager</strong> en bas</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#555' }}>
              <span>2️⃣</span><span>Sélectionnez <strong>« Sur l'écran d'accueil »</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#555' }}>
              <span>3️⃣</span><span>Appuyez sur <strong>« Ajouter »</strong></span>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
