import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'L&Lui Commercial',
  description: 'Espace commercial L&Lui Signature',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1A1A1A',
}

export default function CommercialLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-dark flex flex-col">
      {children}
    </div>
  )
}
