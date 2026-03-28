'use client'

import { useState, useEffect, useRef } from 'react'
import { Download, QrCode, Users, BarChart2, Info, MessageCircle, Send, Eye, EyeOff, Clock, CheckCircle2, FileText, RefreshCw } from 'lucide-react'

const KRIBI_URL = 'https://llui-signature-hebergements.vercel.app/kribi'

const POINTS_DIFFUSION = [
  { lieu: 'Restaurants', conseil: 'Déposer la carte de table sur chaque table', format: 'Carte A7' },
  { lieu: 'Salons de coiffure', conseil: "Afficher le flyer A5 dans la salle d'attente", format: 'Flyer A5' },
  { lieu: 'Hôtels partenaires', conseil: 'Affichette A4 à la réception', format: 'Affichette A4' },
  { lieu: 'Boutiques', conseil: 'Flyer A5 sur le comptoir', format: 'Flyer A5' },
  { lieu: 'Chutes de la Lobé', conseil: "Affichette A4 à l'embarcadère", format: 'Affichette A4' },
  { lieu: 'Plages publiques', conseil: 'Affichette A4 sur panneau', format: 'Affichette A4' },
]

export default function QRCodeAdminPage() {
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [stats, setStats] = useState<{ scans_total: number; scans_ce_mois: number; abonnes: number } | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [newsletter, setNewsletter] = useState<any>(null)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<any>(null)
  const [showPreview, setShowPreview] = useState(false)

  const fetchNewsletter = () => {
    fetch('/api/newsletter/admin')
      .then((r) => r.json())
      .then(setNewsletter)
      .catch(() => {})
  }

  const handleSendNewsletter = async () => {
    setSending(true)
    setSendResult(null)
    try {
      const res = await fetch('/api/newsletter/admin', { method: 'POST' })
      const data = await res.json()
      setSendResult(data)
      fetchNewsletter()
    } catch {
      setSendResult({ error: 'Erreur réseau' })
    } finally {
      setSending(false)
    }
  }

  const downloadCSV = () => {
    if (!newsletter?.abonnes_tous?.length) return
    const rows = [['telephone', 'source', 'actif', 'created_at']]
    newsletter.abonnes_tous.forEach((a: any) => {
      rows.push([a.telephone, a.source, a.actif ? 'oui' : 'non', a.created_at])
    })
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `abonnes-kribi-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Generate QR code
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const QRCode = (await import('qrcode')).default
        const url = await QRCode.toDataURL(KRIBI_URL, {
          width: 512,
          margin: 2,
          color: { dark: '#1A1A1A', light: '#FFFFFF' },
          errorCorrectionLevel: 'H',
        })
        if (!cancelled) setQrDataUrl(url)
      } catch (e) {
        console.error('QR error', e)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Fetch stats QR
  useEffect(() => {
    fetch('/api/kribi/scan')
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
  }, [])

  // Fetch newsletter stats
  useEffect(() => {
    fetchNewsletter()
  }, [])

  // ── Download helpers ──────────────────────────────────────────────────

  const downloadPNG = () => {
    if (!qrDataUrl) return
    const link = document.createElement('a')
    link.download = 'llui-qr-kribi.png'
    link.href = qrDataUrl
    link.click()
  }

  const getJsPDF = async () => {
    const mod = await import('jspdf')
    const JsPDF = (mod as any).default ?? (mod as any).jsPDF
    return JsPDF
  }

  const downloadFlyerA5 = async () => {
    if (!qrDataUrl) return
    setDownloading('a5')
    try {
      const JsPDF = await getJsPDF()
      // A5: 148×210mm portrait
      const doc = new JsPDF({ format: 'a5', orientation: 'portrait', unit: 'mm' })

      // Fond sombre
      doc.setFillColor(26, 26, 26)
      doc.rect(0, 0, 148, 210, 'F')

      // Bande dorée en haut
      doc.setFillColor(201, 168, 76)
      doc.rect(0, 0, 148, 2, 'F')

      // Logo / titre en haut
      doc.setTextColor(201, 168, 76)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('L&Lui Signature', 74, 14, { align: 'center' })

      // Titre principal
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(22)
      doc.text('Que faire à Kribi', 74, 35, { align: 'center' })
      doc.text('ce weekend ?', 74, 47, { align: 'center' })

      // QR Code (60×60mm, centré)
      doc.addImage(qrDataUrl, 'PNG', 44, 58, 60, 60)

      // Sous-titre doré
      doc.setTextColor(201, 168, 76)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text('Scannez pour découvrir les', 74, 130, { align: 'center' })
      doc.text('activités et hébergements', 74, 138, { align: 'center' })

      // URL
      doc.setTextColor(180, 180, 180)
      doc.setFontSize(8)
      doc.text(KRIBI_URL, 74, 152, { align: 'center' })

      // Bande dorée en bas
      doc.setFillColor(201, 168, 76)
      doc.rect(0, 208, 148, 2, 'F')

      // Footer
      doc.setTextColor(200, 200, 200)
      doc.setFontSize(9)
      doc.text('L&Lui Signature · Kribi, Cameroun', 74, 200, { align: 'center' })

      doc.save('flyer-kribi-weekend.pdf')
    } finally {
      setDownloading(null)
    }
  }

  const downloadCarteA7 = async () => {
    if (!qrDataUrl) return
    setDownloading('a7')
    try {
      const JsPDF = await getJsPDF()
      // A7: 74×105mm portrait
      const doc = new JsPDF({ format: [74, 105], orientation: 'portrait', unit: 'mm' })

      doc.setFillColor(26, 26, 26)
      doc.rect(0, 0, 74, 105, 'F')

      // Bordure dorée
      doc.setDrawColor(201, 168, 76)
      doc.setLineWidth(0.5)
      doc.rect(2, 2, 70, 101)

      // Logo
      doc.setTextColor(201, 168, 76)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.text('L&Lui Signature', 37, 10, { align: 'center' })

      // QR Code (40×40mm, centré)
      doc.addImage(qrDataUrl, 'PNG', 17, 15, 40, 40)

      // Texte
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('Que faire ce weekend ?', 37, 65, { align: 'center' })

      doc.setTextColor(201, 168, 76)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text('Scannez le QR Code', 37, 73, { align: 'center' })

      // Footer
      doc.setTextColor(180, 180, 180)
      doc.setFontSize(6)
      doc.text('L&Lui Signature · Kribi', 37, 96, { align: 'center' })

      doc.save('carte-table-kribi.pdf')
    } finally {
      setDownloading(null)
    }
  }

  const downloadAffichetteA4 = async () => {
    if (!qrDataUrl) return
    setDownloading('a4')
    try {
      const JsPDF = await getJsPDF()
      // A4: 210×297mm portrait
      const doc = new JsPDF({ format: 'a4', orientation: 'portrait', unit: 'mm' })

      // Fond sombre
      doc.setFillColor(26, 26, 26)
      doc.rect(0, 0, 210, 297, 'F')

      // Bande dorée en haut
      doc.setFillColor(201, 168, 76)
      doc.rect(0, 0, 210, 4, 'F')

      // Logo
      doc.setTextColor(201, 168, 76)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('L&Lui Signature', 105, 22, { align: 'center' })

      // Titre très grand
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(32)
      doc.text('Que faire à Kribi', 105, 50, { align: 'center' })
      doc.setFontSize(32)
      doc.text('ce weekend ?', 105, 68, { align: 'center' })

      // Ligne décorative
      doc.setDrawColor(201, 168, 76)
      doc.setLineWidth(0.8)
      doc.line(55, 78, 155, 78)

      // QR Code (80×80mm, centré)
      doc.addImage(qrDataUrl, 'PNG', 65, 88, 80, 80)

      // Sous-titre
      doc.setTextColor(201, 168, 76)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'normal')
      doc.text('Scannez pour découvrir les activités du weekend', 105, 183, { align: 'center' })
      doc.text('et les hébergements sélectionnés', 105, 194, { align: 'center' })

      // URL visible
      doc.setTextColor(180, 180, 180)
      doc.setFontSize(10)
      doc.text('llui-sig.app/kribi', 105, 210, { align: 'center' })

      // Bande dorée en bas
      doc.setFillColor(201, 168, 76)
      doc.rect(0, 293, 210, 4, 'F')

      // Footer
      doc.setTextColor(200, 200, 200)
      doc.setFontSize(11)
      doc.text('L&Lui Signature · Kribi, Cameroun', 105, 282, { align: 'center' })

      doc.save('affichette-kribi-a4.pdf')
    } finally {
      setDownloading(null)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* En-tête */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <QrCode size={24} className="text-[#C9A84C]" />
          <h1 className="text-2xl font-serif font-semibold text-[#1A1A1A]">QR Code &amp; Diffusion</h1>
        </div>
        <p className="text-[#1A1A1A]/50 text-sm">
          Téléchargez et imprimez le QR Code pour diffuser la page publique{' '}
          <a href={KRIBI_URL} target="_blank" rel="noopener noreferrer" className="text-[#C9A84C] underline">
            /kribi
          </a>{' '}
          dans les commerces et lieux touristiques de Kribi.
        </p>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Scans total', value: stats.scans_total, icon: BarChart2 },
            { label: 'Scans ce mois', value: stats.scans_ce_mois, icon: BarChart2 },
            { label: 'Abonnés WhatsApp', value: stats.abonnes, icon: Users },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-[#F5F0E8] rounded-2xl p-4 text-center">
              <Icon size={18} className="text-[#C9A84C] mx-auto mb-1" />
              <p className="text-2xl font-bold text-[#1A1A1A]">{value}</p>
              <p className="text-xs text-[#1A1A1A]/50 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* QR Code affiché */}
      <div className="bg-[#F5F0E8] rounded-2xl p-8 flex flex-col items-center mb-8 border border-beige-200">
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt="QR Code /kribi"
            width={300}
            height={300}
            className="rounded-xl shadow-sm"
          />
        ) : (
          <div className="w-[300px] h-[300px] bg-white rounded-xl flex items-center justify-center animate-pulse">
            <QrCode size={48} className="text-[#C9A84C]/40" />
          </div>
        )}
        <p className="text-[#1A1A1A]/40 text-xs mt-4 font-mono">{KRIBI_URL}</p>
      </div>

      {/* Téléchargements */}
      <div className="mb-10">
        <h2 className="font-semibold text-[#1A1A1A] text-lg mb-4 flex items-center gap-2">
          <Download size={18} className="text-[#C9A84C]" />
          Téléchargements
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* PNG */}
          <button
            onClick={downloadPNG}
            disabled={!qrDataUrl}
            className="flex items-center gap-3 p-4 rounded-2xl text-left transition-colors hover:bg-[#F5F0E8] disabled:opacity-40 border border-beige-200 bg-white"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
              <QrCode size={18} className="text-[#C9A84C]" />
            </div>
            <div>
              <p className="font-semibold text-sm text-[#1A1A1A]">QR Code PNG</p>
              <p className="text-xs text-[#1A1A1A]/40">512×512px · Fond blanc</p>
              <p className="text-xs text-[#C9A84C] font-mono mt-0.5">llui-qr-kribi.png</p>
            </div>
          </button>

          {/* Flyer A5 */}
          <button
            onClick={downloadFlyerA5}
            disabled={!qrDataUrl || downloading === 'a5'}
            className="flex items-center gap-3 p-4 rounded-2xl text-left transition-colors hover:bg-[#F5F0E8] disabled:opacity-40 border border-beige-200 bg-white"
          >
            <div className="w-10 h-10 rounded-xl bg-[#712B13] flex items-center justify-center flex-shrink-0">
              <Download size={18} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm text-[#1A1A1A]">
                Flyer A5 PDF {downloading === 'a5' && '…'}
              </p>
              <p className="text-xs text-[#1A1A1A]/40">148×210mm · Salons, boutiques</p>
              <p className="text-xs text-[#C9A84C] font-mono mt-0.5">flyer-kribi-weekend.pdf</p>
            </div>
          </button>

          {/* Carte A7 */}
          <button
            onClick={downloadCarteA7}
            disabled={!qrDataUrl || downloading === 'a7'}
            className="flex items-center gap-3 p-4 rounded-2xl text-left transition-colors hover:bg-[#F5F0E8] disabled:opacity-40 border border-beige-200 bg-white"
          >
            <div className="w-10 h-10 rounded-xl bg-[#0C447C] flex items-center justify-center flex-shrink-0">
              <Download size={18} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm text-[#1A1A1A]">
                Carte de table A7 {downloading === 'a7' && '…'}
              </p>
              <p className="text-xs text-[#1A1A1A]/40">74×105mm · Restaurants, tables</p>
              <p className="text-xs text-[#C9A84C] font-mono mt-0.5">carte-table-kribi.pdf</p>
            </div>
          </button>

          {/* Affichette A4 */}
          <button
            onClick={downloadAffichetteA4}
            disabled={!qrDataUrl || downloading === 'a4'}
            className="flex items-center gap-3 p-4 rounded-2xl text-left transition-colors hover:bg-[#F5F0E8] disabled:opacity-40 border border-beige-200 bg-white"
          >
            <div className="w-10 h-10 rounded-xl bg-[#085041] flex items-center justify-center flex-shrink-0">
              <Download size={18} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm text-[#1A1A1A]">
                Affichette A4 {downloading === 'a4' && '…'}
              </p>
              <p className="text-xs text-[#1A1A1A]/40">210×297mm · Vitrines, réceptions</p>
              <p className="text-xs text-[#C9A84C] font-mono mt-0.5">affichette-kribi-a4.pdf</p>
            </div>
          </button>
        </div>
      </div>

      {/* ── Newsletter WhatsApp ──────────────────────────────────────────────── */}
      <div className="mb-10">
        <h2 className="font-semibold text-[#1A1A1A] text-lg mb-4 flex items-center gap-2">
          <MessageCircle size={18} className="text-[#25D366]" />
          Newsletter WhatsApp abonnés
        </h2>

        {/* Stats abonnés */}
        {newsletter && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
            <div className="bg-[#F5F0E8] rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-[#1A1A1A]">{newsletter.nb_abonnes_actifs ?? 0}</p>
              <p className="text-xs text-[#1A1A1A]/50 mt-0.5">Abonnés actifs</p>
            </div>
            <div className="bg-[#F5F0E8] rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-[#1A1A1A]">{newsletter.nb_evenements ?? 0}</p>
              <p className="text-xs text-[#1A1A1A]/50 mt-0.5">Activités ce weekend</p>
            </div>
            {newsletter.dernier_envoi && (
              <div className="bg-[#F5F0E8] rounded-2xl p-4 text-center col-span-2 sm:col-span-1">
                <p className="text-sm font-bold text-[#1A1A1A]">
                  {newsletter.dernier_envoi.nb_envoyes ?? 0} envoyés
                </p>
                <p className="text-xs text-[#1A1A1A]/50 mt-0.5 flex items-center justify-center gap-1">
                  <Clock size={10} />
                  {new Date(newsletter.dernier_envoi.date_envoi).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Prévisualisation message */}
        {newsletter?.preview && (
          <div className="mb-5">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 text-sm text-[#C9A84C] mb-2"
            >
              {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
              {showPreview ? 'Masquer le message' : 'Prévisualiser le message à envoyer'}
            </button>
            {showPreview && (
              <pre className="text-xs bg-[#1A1A1A] text-[#F5F0E8] p-4 rounded-xl whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {newsletter.preview}
              </pre>
            )}
          </div>
        )}

        {/* Bouton envoyer */}
        <div className="flex gap-3 flex-wrap mb-5">
          <button
            onClick={handleSendNewsletter}
            disabled={sending}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-60"
            style={{ background: '#25D366', color: '#fff' }}
          >
            {sending ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
            {sending ? 'Envoi en cours…' : 'Envoyer la newsletter maintenant'}
          </button>
          <button
            onClick={downloadCSV}
            disabled={!newsletter?.abonnes_tous?.length}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors hover:bg-[#F5F0E8] disabled:opacity-40 border border-beige-200 bg-white"
          >
            <FileText size={15} className="text-[#C9A84C]" />
            Exporter CSV
          </button>
        </div>

        {/* Résultat envoi */}
        {sendResult && (
          <div
            className={`p-4 rounded-xl mb-5 text-sm ${sendResult.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'}`}
          >
            {sendResult.error ? (
              <p>❌ {sendResult.error}</p>
            ) : (
              <>
                <p className="font-semibold mb-1 flex items-center gap-1.5">
                  <CheckCircle2 size={15} />
                  {sendResult.message}
                  {sendResult.dry_run && <span className="text-amber-600 font-normal">(DRY RUN)</span>}
                </p>
                {sendResult.evenements?.length > 0 && (
                  <p className="text-xs opacity-70">Activités : {sendResult.evenements.join(', ')}</p>
                )}
                {sendResult.logs?.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs opacity-60">Voir les logs ({sendResult.logs.length})</summary>
                    <pre className="text-xs mt-1 opacity-60 max-h-32 overflow-y-auto">{sendResult.logs.join('\n')}</pre>
                  </details>
                )}
              </>
            )}
          </div>
        )}

        {/* Liste des 10 derniers abonnés */}
        {newsletter?.abonnes_recents?.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2">10 derniers abonnés</h3>
            <div className="rounded-2xl overflow-hidden border border-beige-200">
              {newsletter.abonnes_recents.map((a: any, i: number) => (
                <div
                  key={a.id ?? i}
                  className={`flex items-center gap-3 px-4 py-2.5 bg-white ${i < newsletter.abonnes_recents.length - 1 ? 'border-b border-beige-200' : ''}`}
                >
                  <div className="w-7 h-7 rounded-full bg-[#F5F0E8] flex items-center justify-center flex-shrink-0">
                    <MessageCircle size={12} className={a.actif ? 'text-[#25D366]' : 'text-[#1A1A1A]/30'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-[#1A1A1A]">{a.telephone_masque}</p>
                    <p className="text-xs text-[#1A1A1A]/40">{a.source}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-[#1A1A1A]/40">
                      {a.created_at ? new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}
                    </p>
                    {!a.actif && <span className="text-[10px] text-red-400">désabonné</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {newsletter && !newsletter.nb_abonnes_actifs && (
          <p className="text-sm text-[#1A1A1A]/40 text-center py-6">
            Aucun abonné pour le moment. Les inscriptions viennent de la page{' '}
            <a href="/kribi" target="_blank" className="text-[#C9A84C] underline">/kribi</a>.
          </p>
        )}
      </div>

      {/* Guide de diffusion */}
      <div>
        <h2 className="font-semibold text-[#1A1A1A] text-lg mb-4 flex items-center gap-2">
          <Info size={18} className="text-[#C9A84C]" />
          Où diffuser ce QR Code ?
        </h2>
        <div className="rounded-2xl overflow-hidden border border-beige-200">
          {POINTS_DIFFUSION.map((point, i) => (
            <div
              key={point.lieu}
              className={`flex items-start gap-4 p-4 ${i < POINTS_DIFFUSION.length - 1 ? 'border-b border-beige-200' : ''} bg-white`}
            >
              <div className="flex-1">
                <p className="font-semibold text-sm text-[#1A1A1A]">{point.lieu}</p>
                <p className="text-xs text-[#1A1A1A]/50 mt-0.5">{point.conseil}</p>
              </div>
              <span className="flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full bg-[#F5F0E8] text-[#C9A84C]">
                {point.format}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
