'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { X, FileText, ImageIcon, Loader2 } from 'lucide-react'

interface UploadFichierProps {
  value: string | null
  onChange: (url: string, type: 'image' | 'pdf') => void
  folder?: string
  label: string
  acceptImages?: boolean
  acceptPDF?: boolean
  maxSizeMo?: number
}

export default function UploadFichier({
  value,
  onChange,
  folder = 'evenements_kribi',
  label,
  acceptImages = true,
  acceptPDF = true,
  maxSizeMo = 10,
}: UploadFichierProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [fileType, setFileType] = useState<'image' | 'pdf' | null>(() => {
    if (!value) return null
    return value.includes('.pdf') ? 'pdf' : 'image'
  })
  const [fileName, setFileName] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const acceptAttr = [
    ...(acceptImages ? ['image/jpeg', 'image/png', 'image/webp'] : []),
    ...(acceptPDF ? ['application/pdf'] : []),
  ].join(',')

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)

      if (file.size > maxSizeMo * 1024 * 1024) {
        setError(`Fichier trop grand. Maximum ${maxSizeMo} Mo.`)
        return
      }

      const isImage = file.type.startsWith('image/')
      const isPDF = file.type === 'application/pdf'
      if ((isImage && !acceptImages) || (isPDF && !acceptPDF) || (!isImage && !isPDF)) {
        setError('Format non supporté.')
        return
      }

      setUploading(true)
      setProgress(0)
      setFileName(file.name)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', folder)

      try {
        const result = await new Promise<{ url: string; type: 'image' | 'pdf' }>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
          }
          xhr.onload = () => {
            if (xhr.status === 200) {
              resolve(JSON.parse(xhr.responseText))
            } else {
              try {
                reject(new Error(JSON.parse(xhr.responseText).error || "Erreur lors de l'upload"))
              } catch {
                reject(new Error("Erreur lors de l'upload"))
              }
            }
          }
          xhr.onerror = () => reject(new Error('Erreur réseau'))
          xhr.open('POST', '/api/admin/upload-evenement')
          xhr.send(formData)
        })

        setFileType(result.type)
        onChange(result.url, result.type)
      } catch (err: any) {
        setError(err.message || "Erreur lors de l'upload")
        setFileName(null)
      } finally {
        setUploading(false)
        setProgress(0)
      }
    },
    [folder, maxSizeMo, acceptImages, acceptPDF, onChange]
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const handleClear = () => {
    onChange('', 'image')
    setFileType(null)
    setFileName(null)
    setError(null)
  }

  return (
    <div>
      <label className="label">{label}</label>

      {/* Uploading */}
      {uploading && (
        <div
          className="rounded-xl border border-dashed p-4 flex flex-col gap-2"
          style={{ borderColor: '#C9A84C', background: '#F5F0E8' }}
        >
          <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(26,26,26,0.7)' }}>
            <Loader2 size={14} className="animate-spin" style={{ color: '#C9A84C' }} />
            <span>Upload en cours...</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(26,26,26,0.1)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, background: '#C9A84C' }}
            />
          </div>
          <span className="text-xs" style={{ color: 'rgba(26,26,26,0.5)' }}>{progress}%</span>
        </div>
      )}

      {/* Preview when value is set */}
      {!uploading && value && (
        <div
          className="rounded-xl border p-3 flex items-center gap-3"
          style={{ borderColor: 'rgba(0,0,0,0.1)', background: '#F5F0E8' }}
        >
          {fileType === 'image' ? (
            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'rgba(26,26,26,0.05)' }}>
              <Image src={value} alt="aperçu" fill unoptimized className="object-cover" sizes="64px" />
            </div>
          ) : (
            <div
              className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(201,168,76,0.15)' }}
            >
              <FileText size={24} style={{ color: '#C9A84C' }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: '#1A1A1A' }}>
              {fileName ?? (fileType === 'pdf' ? 'Fichier PDF' : 'Image uploadée')}
            </p>
            {fileType === 'image' ? (
              <p className="text-xs mt-0.5" style={{ color: 'rgba(26,26,26,0.5)' }}>✅ Image uploadée</p>
            ) : (
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline underline-offset-2 mt-0.5 inline-block"
                style={{ color: '#C9A84C' }}
              >
                Prévisualiser →
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
            style={{ background: 'rgba(26,26,26,0.08)' }}
            title="Changer"
          >
            <X size={14} style={{ color: 'rgba(26,26,26,0.6)' }} />
          </button>
        </div>
      )}

      {/* Drop zone */}
      {!uploading && !value && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors"
          style={{ borderColor: '#C9A84C', background: '#F5F0E8' }}
          onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(201,168,76,0.08)')}
          onMouseOut={(e) => (e.currentTarget.style.background = '#F5F0E8')}
        >
          <div className="flex justify-center gap-3 mb-2" style={{ color: '#C9A84C' }}>
            {acceptImages && <ImageIcon size={20} />}
            {acceptPDF && <FileText size={20} />}
          </div>
          <p className="text-sm font-medium" style={{ color: 'rgba(26,26,26,0.7)' }}>
            Cliquez ou déposez un fichier
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(26,26,26,0.4)' }}>
            {[acceptImages && 'JPG, PNG, WebP', acceptPDF && 'PDF'].filter(Boolean).join(' · ')}
            {' · '}Max {maxSizeMo} Mo
          </p>
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={acceptAttr}
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  )
}
