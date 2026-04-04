'use client'
// components/fiche/FicheClient.tsx — Client Component fiche invitation
// Déplacé hors de app/fiche/[marie_uid]/ pour éviter l'ambiguïté webpack
// sur les chemins contenant des crochets ([marie_uid])

import { useState, useEffect } from 'react'

export interface FicheClientProps {
  marie_uid: string
  noms_maries: string
  date_mariage: string
  lieu: string
  code: string
  prenom: string
}

function formatDate(iso: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
  } catch { return iso }
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'

export default function FicheClient({ marie_uid, noms_maries, date_mariage, lieu, code, prenom }: FicheClientProps) {
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)

  const boutiqueUrl = `https://l-et-lui-signature.com?code=${code}`
  const hebergUrl = `${APP_URL}/hebergements?code=${code}`
  // URL de la fiche elle-même (QR code + partage)
  const ficheUrl = marie_uid
    ? `${APP_URL}/invite/${marie_uid}?prenom=${encodeURIComponent(prenom)}&code=${encodeURIComponent(code)}`
    : boutiqueUrl

  // QR code généré côté client uniquement (useEffect = pas de SSR)
  useEffect(() => {
    if (!ficheUrl) return
    import('qrcode').then(QRCode => {
      QRCode.toDataURL(ficheUrl, {
        width: 160, margin: 2,
        color: { dark: '#1A1A1A', light: '#F5F0E8' },
      }).then(setQrDataUrl).catch(() => {})
    })
  }, [ficheUrl])

  const handleDownloadPdf = async () => {
    setPdfLoading(true)
    try {
      // jsPDF importé dynamiquement — côté client uniquement
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' })
      const W = 148, H = 210

      doc.setFillColor(26, 26, 26)
      doc.rect(0, 0, W, H, 'F')

      doc.setDrawColor(201, 168, 76)
      doc.setLineWidth(0.8)
      doc.rect(8, 8, W - 16, H - 16)

      doc.setTextColor(201, 168, 76)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('L & L U I  S I G N A T U R E', W / 2, 22, { align: 'center' })

      doc.setDrawColor(201, 168, 76)
      doc.setLineWidth(0.3)
      doc.line(30, 26, W - 30, 26)

      doc.setTextColor(245, 240, 232)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('Vous êtes invité(e) à', W / 2, 34, { align: 'center' })

      doc.setTextColor(201, 168, 76)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      const nomsLines = doc.splitTextToSize(noms_maries || 'Nos Mariés', 120) as string[]
      doc.text(nomsLines, W / 2, 43, { align: 'center' })
      const nomH = nomsLines.length * 7

      doc.setTextColor(245, 240, 232)
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'normal')
      let yPos = 43 + nomH
      if (date_mariage) {
        doc.text(formatDate(date_mariage), W / 2, yPos, { align: 'center' })
        yPos += 7
      }

      doc.setTextColor(180, 165, 130)
      doc.setFontSize(7.5)
      doc.text(lieu || 'Kribi, Cameroun', W / 2, yPos, { align: 'center' })
      yPos += 8

      doc.setDrawColor(201, 168, 76)
      doc.line(30, yPos, W - 30, yPos)
      yPos += 10

      doc.setTextColor(201, 168, 76)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text(`Bonjour ${prenom} !`, W / 2, yPos, { align: 'center' })
      yPos += 9

      doc.setTextColor(245, 240, 232)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('Pour célébrer notre union, nous vous offrons', W / 2, yPos, { align: 'center' })
      yPos += 6
      doc.text("un accès privilégié à notre boutique de mariage.", W / 2, yPos, { align: 'center' })
      yPos += 10

      if (code) {
        doc.setDrawColor(201, 168, 76)
        doc.setLineWidth(0.5)
        doc.roundedRect(W / 2 - 32, yPos - 4, 64, 16, 3, 3, 'D')
        doc.setTextColor(201, 168, 76)
        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.text(code, W / 2, yPos + 7, { align: 'center' })
        yPos += 20
      }

      doc.setTextColor(180, 165, 130)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text('Chaque achat avec ce code participe à notre cagnotte 💝', W / 2, yPos, { align: 'center' })
      yPos += 10

      if (qrDataUrl) {
        const qrSize = 36
        doc.addImage(qrDataUrl, 'PNG', W / 2 - qrSize / 2, yPos, qrSize, qrSize)
        yPos += qrSize + 5
        doc.setTextColor(180, 165, 130)
        doc.setFontSize(6.5)
        doc.text('Scannez pour accéder à la fiche', W / 2, yPos, { align: 'center' })
        yPos += 10
      }

      const footerY = Math.max(yPos + 5, H - 25)
      doc.setDrawColor(201, 168, 76)
      doc.setLineWidth(0.2)
      doc.line(30, footerY - 5, W - 30, footerY - 5)
      doc.setTextColor(180, 165, 130)
      doc.setFontSize(7)
      doc.text('Organisé avec ❤️ par L&Lui Signature', W / 2, footerY, { align: 'center' })
      doc.text('Kribi, Cameroun', W / 2, footerY + 6, { align: 'center' })

      doc.save(`invitation-${prenom.toLowerCase().replace(/\s+/g, '-')}.pdf`)
    } catch (err) {
      console.error('PDF error', err)
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: '#1A1A1A' }}>
      <div className="w-full max-w-sm">

        {/* ═══ SECTION HAUT ═══ */}
        <div className="text-center mb-8">
          <p className="text-xs font-bold tracking-[0.3em] mb-1" style={{ color: '#C9A84C' }}>
            L &amp; L U I &nbsp; S I G N A T U R E
          </p>
          <div className="w-16 h-px mx-auto mb-6" style={{ background: '#C9A84C' }} />

          <p className="text-xs tracking-widest mb-3" style={{ color: 'rgba(245,240,232,0.55)' }}>
            VOUS ÊTES INVITÉ(E) À
          </p>

          <h1 className="text-3xl font-serif mb-3 leading-tight" style={{ color: '#C9A84C' }}>
            {noms_maries}
          </h1>

          {date_mariage && (
            <p className="text-sm font-light mb-1 capitalize" style={{ color: '#F5F0E8' }}>
              {formatDate(date_mariage)}
            </p>
          )}

          <p className="text-xs" style={{ color: 'rgba(245,240,232,0.45)' }}>
            {lieu}
          </p>

          <div className="w-24 h-px mx-auto mt-6" style={{ background: 'linear-gradient(to right, transparent, #C9A84C, transparent)' }} />
        </div>

        {/* ═══ SECTION MILIEU ═══ */}
        <div className="rounded-2xl p-6 mb-6" style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.25)' }}>

          <h2 className="text-2xl font-semibold mb-3 text-center" style={{ color: '#C9A84C' }}>
            {prenom ? <>Bonjour {prenom}&nbsp;!</> : <>Bienvenue&nbsp;! 🎉</>}
          </h2>

          <p className="text-sm text-center leading-relaxed mb-6" style={{ color: 'rgba(245,240,232,0.8)' }}>
            Pour célébrer notre union, nous vous offrons un accès privilégié à notre boutique de mariage.
          </p>

          {code && (
            <div className="rounded-xl py-4 px-6 mb-4 text-center" style={{ border: '1.5px solid #C9A84C', background: 'rgba(201,168,76,0.08)' }}>
              <p className="text-xs tracking-widest mb-2" style={{ color: 'rgba(201,168,76,0.65)' }}>VOTRE CODE PRIVILÈGE</p>
              <p className="text-2xl font-bold tracking-wider font-mono" style={{ color: '#C9A84C' }}>
                {code}
              </p>
            </div>
          )}

          <p className="text-xs text-center" style={{ color: 'rgba(245,240,232,0.45)' }}>
            Chaque achat avec ce code participe à leur cagnotte mariage 💝
          </p>

          {qrDataUrl && (
            <div className="flex flex-col items-center mt-5">
              <div className="rounded-xl p-3" style={{ background: '#F5F0E8' }}>
                <img src={qrDataUrl} alt="QR Code invitation" width={120} height={120} />
              </div>
              <p className="text-[10px] mt-2" style={{ color: 'rgba(245,240,232,0.3)' }}>
                Scannez pour accéder à votre invitation
              </p>
            </div>
          )}
        </div>

        {/* ═══ SECTION BAS — Boutons ═══ */}
        <div className="space-y-3 mb-8">
          <a
            href={boutiqueUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: '#F5F0E8', color: '#1A1A1A' }}
          >
            🛍️ Découvrir la Boutique
          </a>

          <a
            href={hebergUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: '#C9A84C', color: '#1A1A1A' }}
          >
            🏠 Sélection Hébergements
          </a>

          <button
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ border: '1px solid rgba(201,168,76,0.4)', color: '#C9A84C', background: 'transparent' }}
          >
            {pdfLoading ? '⏳ Génération…' : '📄 Télécharger en PDF'}
          </button>
        </div>

        {/* ═══ FOOTER ═══ */}
        <div className="text-center">
          <div className="w-12 h-px mx-auto mb-4" style={{ background: 'rgba(201,168,76,0.3)' }} />
          <p className="text-xs mb-1" style={{ color: 'rgba(245,240,232,0.4)' }}>
            Organisé avec ❤️ par L&amp;Lui Signature
          </p>
          <p className="text-[10px]" style={{ color: 'rgba(245,240,232,0.22)' }}>
            Kribi, Cameroun
          </p>
        </div>

      </div>
    </div>
  )
}
