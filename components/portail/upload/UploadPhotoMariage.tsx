'use client'
// components/portail/upload/UploadPhotoMariage.tsx
// Zone d'upload drag & drop pour la photo principale du mariage

import { useState, useRef, useCallback } from 'react'

interface Props {
  currentPhotoUrl?: string
  onUploaded?: (url: string) => void
}

export default function UploadPhotoMariage({ currentPhotoUrl, onUploaded }: Props) {
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl || null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setError('')
    setSuccess(false)

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('Format non supporté. Utilisez JPG, PNG ou WEBP.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Fichier trop lourd. Maximum 5 Mo.')
      return
    }

    // Aperçu immédiat (avant upload)
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/portail/photo-mariage', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur upload')
      setSuccess(true)
      onUploaded?.(data.url)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'upload")
    } finally {
      setUploading(false)
    }
  }, [onUploaded])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-3">
      {preview ? (
        /* Aperçu photo existante */
        <div className="relative rounded-2xl overflow-hidden" style={{ height: 200 }}>
          <img src={preview} alt="Photo de mariage" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

          {/* Overlay chargement */}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Overlay succès */}
          {success && !uploading && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <span className="text-white text-3xl">✓</span>
            </div>
          )}

          {/* Actions */}
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
            <span className="text-white/80 text-xs">Photo principale</span>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#1A1A1A] disabled:opacity-50 transition-opacity hover:opacity-90"
              style={{ background: '#C9A84C' }}
            >
              {uploading ? 'Upload…' : 'Modifier la photo'}
            </button>
          </div>
        </div>
      ) : (
        /* Zone drag & drop vide */
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="relative rounded-2xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center gap-3 py-10"
          style={{
            borderColor: dragOver ? '#C9A84C' : '#E8E0D0',
            background: dragOver ? 'rgba(201,168,76,0.06)' : '#FAFAFA',
          }}
        >
          {uploading ? (
            <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: 'rgba(201,168,76,0.1)' }}
              >
                📸
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-[#1A1A1A]">Ajouter une photo de mariage</p>
                <p className="text-xs text-[#888] mt-0.5">Glissez ici ou cliquez · JPG, PNG, WEBP · 5 Mo max</p>
              </div>
              <div
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white"
                style={{ background: '#1A1A1A' }}
              >
                Choisir une photo
              </div>
            </>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-600 px-1">{error}</p>}
      {success && (
        <p className="text-xs font-medium px-1" style={{ color: '#7C9A7E' }}>
          ✓ Photo enregistrée — elle apparaît maintenant dans le dashboard
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  )
}
