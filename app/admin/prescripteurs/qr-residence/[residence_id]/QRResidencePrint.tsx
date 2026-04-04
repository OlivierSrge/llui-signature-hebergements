'use client'

import { useEffect, useRef } from 'react'
import { Printer } from 'lucide-react'

interface Props {
  residenceId: string
  nom: string
  qrPayload: string
}

export default function QRResidencePrint({ nom, qrPayload }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let cancelled = false
    async function generate() {
      const QRCode = (await import('qrcode')).default
      if (cancelled || !canvasRef.current) return
      await QRCode.toCanvas(canvasRef.current, qrPayload, {
        width: 400,
        margin: 2,
        color: { dark: '#1A1A1A', light: '#FFFFFF' },
      })
    }
    generate()
    return () => { cancelled = true }
  }, [qrPayload])

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
      {/* Screen-only controls */}
      <div className="print:hidden mb-8 flex items-center gap-4">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2.5 bg-dark text-white rounded-xl text-sm font-medium hover:bg-dark/80 transition-colors"
        >
          <Printer size={16} /> Imprimer / PDF
        </button>
        <a href="/admin/prescripteurs" className="text-sm text-dark/50 hover:underline">← Retour</a>
      </div>

      {/* Printable card */}
      <div className="w-full max-w-sm border-2 border-dashed border-dark/20 rounded-3xl p-8 flex flex-col items-center gap-5 print:border-solid print:border-dark/40 print:shadow-none">
        {/* Logo */}
        <div className="text-center">
          <h1 className="font-serif text-2xl font-semibold text-dark">
            L<span className="text-[#C9A84C]">&</span>Lui <span className="font-light">Signature</span>
          </h1>
          <p className="text-dark/40 text-xs mt-0.5">Résidence partenaire</p>
        </div>

        {/* QR */}
        <div className="rounded-2xl overflow-hidden shadow-md p-2 bg-white border border-dark/10">
          <canvas ref={canvasRef} className="block" />
        </div>

        {/* Nom de la résidence */}
        <div className="text-center">
          <p className="font-serif text-lg font-semibold text-dark">{nom}</p>
          <p className="text-dark/40 text-xs mt-1">QR Code Prescripteur</p>
        </div>

        {/* Instructions */}
        <div className="bg-[#F5F0E8] rounded-2xl p-4 w-full text-center">
          <p className="text-dark/70 text-xs leading-relaxed">
            <span className="font-semibold text-dark">Mode d'emploi :</span><br />
            1. Scannez ce QR code avec votre appli prescripteur<br />
            2. Scannez ensuite le QR code du client<br />
            3. Votre commission est créditée automatiquement !
          </p>
        </div>

        {/* Footer */}
        <p className="text-dark/30 text-[10px] text-center">
          llui-signature.com · Kribi, Cameroun
        </p>
      </div>
    </div>
  )
}
