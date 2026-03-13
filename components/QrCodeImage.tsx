'use client'

import { useState } from 'react'

interface QrCodeImageProps {
  src: string
  alt: string
  confirmCode: string
}

export function QrCodeImage({ src, alt, confirmCode }: QrCodeImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  return (
    <div className="relative w-48 h-48 mx-auto">
      {!loaded && !error && (
        <div className="absolute inset-0 rounded-xl border border-beige-200 bg-gray-100 animate-pulse flex items-center justify-center">
          <span className="text-xs text-dark/40">Chargement...</span>
        </div>
      )}
      {error ? (
        <div className="w-48 h-48 rounded-xl border border-red-200 bg-red-50 flex items-center justify-center">
          <span className="text-xs text-red-400 text-center px-2">QR code indisponible — utilisez le code ci-dessous</span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={`w-48 h-48 rounded-xl border border-beige-200 transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      )}
    </div>
  )
}
