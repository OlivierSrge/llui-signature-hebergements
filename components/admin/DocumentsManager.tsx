'use client'

import { useState, useRef } from 'react'
import { toast } from 'react-hot-toast'
import { Upload, Download, FileText, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react'
import type { StoredDocument, DocKey } from '@/actions/documents'

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
  return `${Math.round(bytes / 1024)} Ko`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

interface Props {
  documents: StoredDocument[]
}

export default function DocumentsManager({ documents: initial }: Props) {
  const [docs, setDocs] = useState(initial)
  const [uploading, setUploading] = useState<DocKey | null>(null)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const handleFileChange = async (key: DocKey, file: File | null) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error('Seuls les fichiers PDF sont acceptés')
      return
    }

    setUploading(key)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('key', key)

    try {
      const res = await fetch('/api/upload-document', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur upload')

      setDocs((prev) =>
        prev.map((d) =>
          d.key === key
            ? { ...d, url: data.url, uploadedAt: new Date().toISOString(), size: file.size }
            : d
        )
      )
      toast.success('Document mis à jour')
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de l\'upload')
    } finally {
      setUploading(null)
      // Reset input
      if (inputRefs.current[key]) inputRefs.current[key]!.value = ''
    }
  }

  const DOC_ICONS: Record<DocKey, string> = {
    notice_partenaire: '📖',
    notice_client: '🧳',
    notice_administrateur: '⚙️',
  }

  const DOC_DESC: Record<DocKey, string> = {
    notice_partenaire: 'Visible dans /partenaire/guide pour tous les partenaires',
    notice_client: 'Disponible pour les clients après réservation',
    notice_administrateur: 'Usage interne administration',
  }

  return (
    <div className="space-y-4">
      {docs.map((doc) => (
        <div key={doc.key} className="bg-white rounded-2xl border border-beige-200 p-5">
          <div className="flex items-start gap-4">
            <div className="text-2xl flex-shrink-0 mt-0.5">{DOC_ICONS[doc.key]}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <h3 className="font-semibold text-dark">{doc.label}</h3>
                {doc.url && (
                  <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                    <CheckCircle2 size={10} /> En ligne
                  </span>
                )}
              </div>
              <p className="text-xs text-dark/40 mb-3">{DOC_DESC[doc.key]}</p>

              <div className="flex flex-wrap gap-3 text-xs text-dark/40 mb-4">
                <span>Taille : {formatBytes(doc.size)}</span>
                <span>Mis à jour : {formatDate(doc.uploadedAt)}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {doc.url && (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 bg-beige-50 border border-beige-200 text-dark/60 rounded-xl text-xs font-medium hover:border-dark/30 transition-colors"
                  >
                    <Download size={12} /> Télécharger
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => inputRefs.current[doc.key]?.click()}
                  disabled={uploading === doc.key}
                  className="flex items-center gap-1.5 px-3 py-2 bg-dark text-white rounded-xl text-xs font-medium hover:bg-dark/80 transition-colors disabled:opacity-50"
                >
                  {uploading === doc.key ? (
                    <><Loader2 size={12} className="animate-spin" /> Upload en cours...</>
                  ) : doc.url ? (
                    <><RefreshCw size={12} /> Remplacer</>
                  ) : (
                    <><Upload size={12} /> Uploader</>
                  )}
                </button>

                <input
                  ref={(el) => { inputRefs.current[doc.key] = el }}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => handleFileChange(doc.key, e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
