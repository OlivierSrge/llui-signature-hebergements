'use client'

import { useState, useEffect } from 'react'
import { QrCode, RefreshCw, Maximize2, X, Users } from 'lucide-react'
import { compterPrescripteursActifsPartenaire, getQrEtablissement, sauvegarderQrEtablissement } from '@/actions/prescripteurs'

interface Props {
  partenaireId: string
  partenaireNom: string
}

export default function QrPrescripteurSection({ partenaireId, partenaireNom }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [qrStorageUrl, setQrStorageUrl] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [prescripteursActifs, setPrescripteursActifs] = useState<number | null>(null)

  const generateLocalQr = async (payload: string) => {
    const QRCode = (await import('qrcode')).default
    const url = await QRCode.toDataURL(payload, {
      width: 400,
      margin: 2,
      color: { dark: '#1a1a1a', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
    return url
  }

  const buildPayload = () => JSON.stringify({
    type: 'partenaire',
    partenaire_id: partenaireId,
    nom: partenaireNom,
    generated_at: Date.now(),
  })

  // On mount: load existing QR from Firestore or generate new one
  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsGenerating(true)
      try {
        const existing = await getQrEtablissement(partenaireId)
        if (existing?.qr_data && !cancelled) {
          const url = await generateLocalQr(existing.qr_data)
          if (!cancelled) {
            setQrDataUrl(url)
            setQrStorageUrl(existing.qr_url ?? null)
          }
        } else if (!cancelled) {
          const payload = buildPayload()
          const url = await generateLocalQr(payload)
          if (!cancelled) {
            setQrDataUrl(url)
            sauvegarderQrEtablissement(partenaireId, payload)
              .then((res) => { if (res.qr_url && !cancelled) setQrStorageUrl(res.qr_url) })
              .catch(() => {})
          }
        }
      } catch (err) {
        console.error('[QrPrescripteur] Erreur chargement', err)
      } finally {
        if (!cancelled) setIsGenerating(false)
      }
    }
    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partenaireId])

  useEffect(() => {
    compterPrescripteursActifsPartenaire(partenaireId)
      .then(setPrescripteursActifs)
      .catch(() => {})
  }, [partenaireId])

  const handleRegenerate = async () => {
    const confirmed = window.confirm(
      'Régénérer le QR ? Les sessions prescripteurs en cours seront annulées.'
    )
    if (!confirmed) return
    setIsSaving(true)
    setIsGenerating(true)
    try {
      const payload = buildPayload()
      const url = await generateLocalQr(payload)
      setQrDataUrl(url)
      const res = await sauvegarderQrEtablissement(partenaireId, payload)
      if (res.qr_url) setQrStorageUrl(res.qr_url)
    } catch (err) {
      console.error('[QrPrescripteur] Erreur regeneration', err)
    } finally {
      setIsGenerating(false)
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="bg-white border border-beige-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-serif text-lg font-semibold text-dark flex items-center gap-2">
              <QrCode size={18} className="text-gold-500" />
              Mon QR Prescripteur
            </h2>
            <p className="text-xs text-dark/40 mt-0.5">
              Le moto-taxi scanne ce QR pour se positionner chez vous
            </p>
          </div>
          {prescripteursActifs !== null && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-xl text-xs font-medium">
              <Users size={13} />
              {prescripteursActifs} actif{prescripteursActifs !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-4">
          {/* QR Code */}
          <div className="relative w-48 h-48 flex items-center justify-center bg-beige-50 rounded-2xl border border-beige-200 overflow-hidden">
            {isGenerating && (
              <div className="absolute inset-0 flex items-center justify-center bg-beige-50">
                <RefreshCw size={24} className="text-gold-400 animate-spin" />
              </div>
            )}
            {qrDataUrl && !isGenerating && (
              <img src={qrDataUrl} alt="QR Prescripteur" className="w-44 h-44 object-contain" />
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setIsFullscreen(true)}
              disabled={!qrDataUrl}
              className="flex items-center gap-2 px-4 py-2 bg-dark text-white rounded-xl text-sm font-medium hover:bg-dark/80 transition-colors disabled:opacity-40"
            >
              <Maximize2 size={14} /> Plein écran
            </button>
            <button
              onClick={handleRegenerate}
              disabled={isGenerating || isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-beige-200 text-dark/60 rounded-xl text-sm font-medium hover:border-dark/30 transition-colors disabled:opacity-40"
            >
              <RefreshCw size={14} className={isGenerating || isSaving ? 'animate-spin' : ''} />
              Régénérer
            </button>
          </div>

          <p className="text-xs text-dark/40 text-center max-w-xs">
            Affichez ce QR à l&apos;entrée ou montrez votre téléphone au moto-taxi.
            La session est valide <strong>2 heures</strong>.
          </p>
        </div>
      </div>

      {/* Fullscreen overlay */}
      {isFullscreen && qrDataUrl && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center gap-6 px-8">
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-5 right-5 p-2 rounded-full bg-beige-100 hover:bg-beige-200 transition-colors"
          >
            <X size={22} className="text-dark" />
          </button>
          <p className="font-serif text-2xl font-semibold text-dark text-center">{partenaireNom}</p>
          <img src={qrDataUrl} alt="QR Prescripteur" className="w-72 h-72 object-contain" />
          <p className="text-dark/50 text-sm text-center">
            Le moto-taxi scanne ce QR pour se positionner chez vous
          </p>
          <button
            onClick={handleRegenerate}
            disabled={isGenerating || isSaving}
            className="flex items-center gap-2 px-5 py-2.5 border border-beige-300 rounded-xl text-sm text-dark/60 hover:bg-beige-50 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={14} className={isGenerating || isSaving ? 'animate-spin' : ''} />
            Régénérer le QR
          </button>
        </div>
      )}
    </>
  )
}
