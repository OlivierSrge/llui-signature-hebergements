import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import PWAInstallBanner from '@/components/PWAInstallBanner'

export const metadata: Metadata = {
  title: {
    default: 'L&Lui Signature – Hébergements Premium à Kribi',
    template: '%s | L&Lui Signature',
  },
  description:
    "Réservez les plus beaux hébergements de Kribi pour votre mariage ou séjour de luxe. L&Lui Signature sélectionne villas, appartements et chambres d'exception au Cameroun.",
  keywords: ['hébergement', 'Kribi', 'mariage', 'villa', 'Cameroun', 'luxe', 'L&Lui Signature'],
  openGraph: {
    siteName: 'L&Lui Signature',
    locale: 'fr_FR',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#C9A84C" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="L&Lui" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/icons/icon-144x144.png" />
      </head>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1A1A1A',
              color: '#FAFAF8',
              fontFamily: 'Inter, sans-serif',
              borderRadius: '10px',
              padding: '12px 16px',
            },
            success: {
              iconTheme: { primary: '#C9A84C', secondary: '#FAFAF8' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#FAFAF8' },
            },
          }}
        />
        <PWAInstallBanner />
      </body>
    </html>
  )
}
