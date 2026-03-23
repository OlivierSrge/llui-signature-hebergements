'use client'
// components/album/AlbumClient.tsx — #9 Album souvenir post-mariage

import { useState, useRef } from 'react'

interface Photo {
  url: string
  caption?: string
  uploaded_at?: string
}

interface Props {
  marie_uid: string
  noms_maries: string
  date_mariage: string
  photos: Photo[]
}

function formatDate(iso: string) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return iso }
}

export default function AlbumClient({ marie_uid, noms_maries, date_mariage, photos: initialPhotos }: Props) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState<Photo | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const reader = new FileReader()
      await new Promise<void>(resolve => {
        reader.onload = async () => {
          const dataUrl = reader.result as string
          // Compresser via canvas
          const img = new Image()
          img.src = dataUrl
          await new Promise<void>(r => { img.onload = () => r() })
          const canvas = document.createElement('canvas')
          const MAX = 1200
          const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
          canvas.width = img.width * ratio
          canvas.height = img.height * ratio
          canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
          const compressed = canvas.toDataURL('image/jpeg', 0.82)

          const res = await fetch('/api/portail/album', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ marie_uid, url: compressed, caption: '' }),
          })
          if (res.ok) {
            const newPhoto: Photo = { url: compressed, caption: '', uploaded_at: new Date().toISOString() }
            setPhotos(prev => [...prev, newPhoto])
          }
          resolve()
        }
        reader.readAsDataURL(file)
      })
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function supprimerPhoto(url: string) {
    setDeleting(url)
    await fetch('/api/portail/album', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marie_uid, url }),
    }).catch(() => null)
    setPhotos(prev => prev.filter(p => p.url !== url))
    setDeleting(null)
    if (lightbox?.url === url) setLightbox(null)
  }

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: '#1A1A1A' }}>
      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={() => setLightbox(null)}>
          <div className="relative max-w-3xl w-full px-4" onClick={e => e.stopPropagation()}>
            <img src={lightbox.url} alt={lightbox.caption || ''} className="w-full rounded-2xl object-contain max-h-[80vh]" />
            {lightbox.caption && <p className="text-center text-sm text-white mt-3">{lightbox.caption}</p>}
            <div className="flex justify-center gap-3 mt-4">
              <button onClick={() => setLightbox(null)} className="px-4 py-2 rounded-xl text-sm text-white" style={{ background: '#333' }}>✕ Fermer</button>
              <button onClick={() => supprimerPhoto(lightbox.url)} disabled={deleting === lightbox.url}
                className="px-4 py-2 rounded-xl text-sm text-white disabled:opacity-50" style={{ background: '#C0392B' }}>
                🗑️ Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#C9A84C] mb-2">ALBUM SOUVENIR</p>
          <h1 className="text-3xl font-serif text-white">{noms_maries}</h1>
          {date_mariage && <p className="text-sm text-[#888] mt-2">💍 {formatDate(date_mariage)}</p>}
          <p className="text-xs text-[#555] mt-1">Vos souvenirs, accessibles à vie ✨</p>
        </div>

        {/* Upload */}
        <div className="mb-6">
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-full py-4 rounded-2xl font-bold text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            style={{ background: uploading ? '#333' : 'linear-gradient(90deg, #C9A84C, #E8C87A)', color: uploading ? '#888' : '#1A1A1A' }}>
            {uploading ? (
              <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Upload en cours…</>
            ) : <>📸 Ajouter des photos ({photos.length} dans l'album)</>}
          </button>
        </div>

        {/* Galerie */}
        {photos.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📷</div>
            <p className="text-[#555] text-sm">Votre album est vide — commencez à ajouter vos plus beaux souvenirs !</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((photo, i) => (
              <div key={i} className="relative group aspect-square rounded-2xl overflow-hidden cursor-pointer"
                style={{ background: '#2A2A2A' }} onClick={() => setLightbox(photo)}>
                <img src={photo.url} alt={photo.caption || `Photo ${i + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-end justify-center pb-3">
                  {photo.caption && (
                    <p className="text-white text-xs px-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {photo.caption}
                    </p>
                  )}
                </div>
                <button onClick={e => { e.stopPropagation(); supprimerPhoto(photo.url) }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  disabled={deleting === photo.url}>
                  {deleting === photo.url ? '…' : '✕'}
                </button>
              </div>
            ))}
          </div>
        )}

        {photos.length > 0 && (
          <p className="text-center text-xs text-[#555] mt-6">{photos.length} photo{photos.length > 1 ? 's' : ''} dans votre album · Cliquez pour agrandir</p>
        )}
      </div>
    </div>
  )
}
