'use client'

import { useState, useRef, useCallback } from 'react'
import { Camera, ImagePlus, X, Loader2, GripVertical, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'react-hot-toast'

interface Props {
  initialUrls?: string[]
  onChange: (urls: string[]) => void
  maxPhotos?: number
}

export default function PhotoUploader({ initialUrls = [], onChange, maxPhotos = 20 }: Props) {
  const [urls, setUrls] = useState<string[]>(initialUrls)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const uploadFiles = useCallback(async (files: File[]) => {
    if (urls.length + files.length > maxPhotos) {
      toast.error(`Maximum ${maxPhotos} photos autorisées`)
      return
    }

    setUploading(true)
    const newUrls: string[] = []

    for (let i = 0; i < files.length; i++) {
      setUploadProgress(Math.round(((i) / files.length) * 100))
      const file = files[i]
      const fd = new FormData()
      fd.append('file', file)

      try {
        const res = await fetch('/api/upload-image', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Échec upload')
        newUrls.push(data.url)
      } catch (err: any) {
        toast.error(`${file.name}: ${err.message}`)
      }
    }

    setUploadProgress(null)
    setUploading(false)

    if (newUrls.length > 0) {
      const updated = [...urls, ...newUrls]
      setUrls(updated)
      onChange(updated)
      toast.success(`${newUrls.length} photo${newUrls.length > 1 ? 's' : ''} ajoutée${newUrls.length > 1 ? 's' : ''}`)
    }
  }, [urls, maxPhotos, onChange])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length) uploadFiles(files)
    e.target.value = ''
  }

  const removeUrl = (index: number) => {
    const updated = urls.filter((_, i) => i !== index)
    setUrls(updated)
    onChange(updated)
  }

  // Drag & drop reorder
  const handleDragStart = (index: number) => setDraggingIndex(index)
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }
  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggingIndex === null || draggingIndex === index) return
    const reordered = [...urls]
    const [moved] = reordered.splice(draggingIndex, 1)
    reordered.splice(index, 0, moved)
    setUrls(reordered)
    onChange(reordered)
    setDraggingIndex(null)
    setDragOverIndex(null)
  }
  const handleDragEnd = () => { setDraggingIndex(null); setDragOverIndex(null) }

  // Drop zone for files
  const handleZoneDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
    if (files.length) uploadFiles(files)
  }

  const canAddMore = urls.length < maxPhotos && !uploading

  return (
    <div className="space-y-3">

      {/* Boutons d'action */}
      <div className="flex flex-wrap gap-2">
        {/* Prise de photo directe (caméra arrière) */}
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={!canAddMore}
          className="flex items-center gap-2 px-4 py-2.5 bg-dark text-white rounded-xl text-sm font-medium hover:bg-dark/80 transition-colors disabled:opacity-40"
        >
          <Camera size={16} /> Prendre une photo
        </button>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Sélection depuis galerie / fichier */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!canAddMore}
          className="flex items-center gap-2 px-4 py-2.5 bg-beige-100 text-dark border border-beige-300 rounded-xl text-sm font-medium hover:bg-beige-200 transition-colors disabled:opacity-40"
        >
          <ImagePlus size={16} /> Choisir depuis la galerie
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,image/heic,image/heif"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Barre de progression */}
      {uploading && (
        <div className="flex items-center gap-3 px-4 py-3 bg-gold-50 border border-gold-200 rounded-xl">
          <Loader2 size={16} className="animate-spin text-gold-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-medium text-gold-800">
              Compression et upload en cours{uploadProgress !== null ? ` (${uploadProgress}%)` : '…'}
            </p>
            {uploadProgress !== null && (
              <div className="mt-1.5 h-1.5 bg-gold-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold-500 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Zone de drop */}
      {urls.length === 0 && !uploading && (
        <div
          ref={dropZoneRef}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleZoneDrop}
          className="border-2 border-dashed border-beige-300 rounded-xl p-8 text-center text-dark/40 hover:border-gold-400 hover:text-dark/60 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Glissez des photos ici ou cliquez pour sélectionner</p>
          <p className="text-xs mt-1">JPEG, PNG, WebP, HEIC — max 10 Mo par photo</p>
        </div>
      )}

      {/* Grille de prévisualisation */}
      {urls.length > 0 && (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {urls.map((url, i) => (
              <div
                key={url + i}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={(e) => handleDrop(e, i)}
                onDragEnd={handleDragEnd}
                className={`relative group aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing ${
                  dragOverIndex === i ? 'border-gold-400 scale-105' : 'border-transparent'
                } ${draggingIndex === i ? 'opacity-40' : ''}`}
              >
                <Image
                  src={url}
                  alt={`Photo ${i + 1}`}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="200px"
                />

                {/* Badge photo principale */}
                {i === 0 && (
                  <div className="absolute top-1.5 left-1.5 bg-gold-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    Principale
                  </div>
                )}

                {/* Numéro */}
                <div className="absolute bottom-1.5 left-1.5 bg-black/50 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                  {i + 1}
                </div>

                {/* Drag handle */}
                <div className="absolute top-1.5 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical size={14} className="text-white drop-shadow" />
                </div>

                {/* Bouton supprimer */}
                <button
                  type="button"
                  onClick={() => removeUrl(i)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                  title="Supprimer"
                >
                  <X size={12} />
                </button>

                {/* Overlay drag-over */}
                {dragOverIndex === i && draggingIndex !== i && (
                  <div className="absolute inset-0 bg-gold-400/20 rounded-xl" />
                )}
              </div>
            ))}

            {/* Slot "ajouter" dans la grille */}
            {canAddMore && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-beige-300 flex flex-col items-center justify-center gap-1.5 text-dark/30 hover:border-gold-400 hover:text-dark/50 transition-colors"
              >
                <ImagePlus size={24} />
                <span className="text-xs">Ajouter</span>
              </button>
            )}
          </div>

          <p className="text-xs text-dark/40 mt-2 flex items-center gap-1">
            <GripVertical size={11} />
            Glissez pour réordonner · La 1ère photo est la photo principale
          </p>
        </div>
      )}

      {urls.length >= maxPhotos && (
        <p className="text-xs text-amber-700 flex items-center gap-1.5">
          <AlertCircle size={12} /> Maximum {maxPhotos} photos atteint
        </p>
      )}
    </div>
  )
}
