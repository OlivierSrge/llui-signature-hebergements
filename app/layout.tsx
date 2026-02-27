import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

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
      </body>
    </html>
  )
}
