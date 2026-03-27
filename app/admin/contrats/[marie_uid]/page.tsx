'use client'
// app/admin/contrats/[marie_uid]/page.tsx — #125 Générateur contrat automatique
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { FileText, Send, CheckCircle, Download, Clock, AlertCircle, RefreshCw } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { generateContratMariagePDF } from '@/lib/generateContratMariagePDF'

interface ContratMarige {
  contrat_id: string
  noms_maries: string
  statut: 'en_attente_signature' | 'signe' | 'annule'
  date_generation: string
  signed_at: string | null
  pdf_url: string | null
  montant_total: number
  pack_nom: string
  date_mariage: string
}

interface MariéData {
  marie_uid: string
  noms_maries: string
  whatsapp: string
  date_mariage: string
  lieu: string
  pack_nom?: string
  pack?: string
  montant_total?: number
  budget_total?: number
  acompte_verse?: number
}

export default function ContratsPage() {
  const params = useParams()
  const marie_uid = params.marie_uid as string

  const [marie, setMarie] = useState<MariéData | null>(null)
  const [contrats, setContrats] = useState<ContratMarige[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [signing, setSigning] = useState(false)
  const [pendingContrat, setPendingContrat] = useState<ContratMarige | null>(null)
  const [otpCode, setOtpCode] = useState('')
  const [clauses, setClauses] = useState('')
  const [showOtpModal, setShowOtpModal] = useState(false)

  useEffect(() => {
    loadData()
  }, [marie_uid])

  async function loadData() {
    setLoading(true)
    try {
      const [userRes, contratsRes] = await Promise.all([
        fetch(`/api/portail/user?uid=${marie_uid}`),
        fetch(`/api/admin/contrats?marie_uid=${marie_uid}`),
      ])
      if (userRes.ok) {
        const ud = await userRes.json()
        // Normaliser date_mariage si c'est un objet Timestamp sérialisé
        const rawUser = ud.user || ud
        if (rawUser?.date_mariage && typeof rawUser.date_mariage === 'object') {
          rawUser.date_mariage = new Date(rawUser.date_mariage._seconds * 1000).toISOString()
        }
        setMarie(rawUser)
      }
      if (contratsRes.ok) {
        const cd = await contratsRes.json()
        setContrats(cd.contrats || [])
        const pending = (cd.contrats || []).find((c: ContratMarige) => c.statut === 'en_attente_signature')
        if (pending) setPendingContrat(pending)
      }
    } catch {
      toast.error('Erreur chargement données')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await fetch('/api/admin/contrats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marie_uid, clauses_supplementaires: clauses }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur génération')
      toast.success(`Contrat N° ${data.contrat_id} créé. OTP envoyé par WhatsApp.`)
      await loadData()
      setShowOtpModal(true)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setGenerating(false)
    }
  }

  async function handleSign() {
    if (!pendingContrat || !otpCode || otpCode.length !== 6) {
      toast.error('Entrez le code OTP à 6 chiffres')
      return
    }
    setSigning(true)
    try {
      // Générer le PDF côté client
      const pdfDataUri = generateContratMariagePDF({
        contrat_id: pendingContrat.contrat_id,
        marie_uid,
        noms_maries: marie?.noms_maries || '',
        whatsapp: marie?.whatsapp || '',
        date_mariage: pendingContrat.date_mariage || marie?.date_mariage || '',
        lieu: marie?.lieu || 'Kribi',
        pack_nom: pendingContrat.pack_nom || marie?.pack_nom || marie?.pack || 'Sur mesure',
        montant_total: pendingContrat.montant_total || marie?.montant_total || marie?.budget_total || 0,
        acompte_verse: marie?.acompte_verse || 0,
        date_generation: pendingContrat.date_generation,
        clauses_supplementaires: clauses,
      })

      const res = await fetch('/api/admin/contrats', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contrat_id: pendingContrat.contrat_id,
          otp: otpCode,
          pdf_base64: pdfDataUri,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur signature')
      toast.success('Contrat signé et archivé !')
      setShowOtpModal(false)
      setOtpCode('')
      setPendingContrat(null)
      await loadData()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSigning(false)
    }
  }

  function handlePreview() {
    if (!marie) return
    const pdfDataUri = generateContratMariagePDF({
      contrat_id: `PREVIEW-${Date.now()}`,
      marie_uid,
      noms_maries: marie.noms_maries,
      whatsapp: marie.whatsapp,
      date_mariage: marie.date_mariage || new Date().toISOString(),
      lieu: marie.lieu || 'Kribi',
      pack_nom: marie.pack_nom || marie.pack || 'Sur mesure',
      montant_total: marie.montant_total || marie.budget_total || 0,
      acompte_verse: marie.acompte_verse || 0,
      date_generation: new Date().toISOString(),
      clauses_supplementaires: clauses,
    })
    const win = window.open()
    win?.document.write(`<iframe width='100%' height='100%' src='${pdfDataUri}'></iframe>`)
  }

  const statusBadge = (statut: string) => {
    if (statut === 'signe') return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle size={12} /> Signé</span>
    if (statut === 'en_attente_signature') return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700"><Clock size={12} /> En attente OTP</span>
    return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700"><AlertCircle size={12} /> Annulé</span>
  }

  if (loading) return (
    <div className="p-8 mt-14 lg:mt-0 flex items-center justify-center min-h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gold-500" />
    </div>
  )

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <FileText size={24} className="text-gold-500" />
          <h1 className="font-serif text-3xl font-semibold text-dark">Contrats — {marie?.noms_maries || marie_uid}</h1>
        </div>
        <p className="text-dark/50 text-sm">Générateur de contrat PDF avec signature OTP WhatsApp · Archivage automatique</p>
      </div>

      {/* Infos marié */}
      {marie && (
        <div className="bg-beige-50 border border-gold-200 rounded-2xl p-5 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ['Couple', marie.noms_maries],
            ['WhatsApp', marie.whatsapp],
            ['Date mariage', marie.date_mariage ? new Date(marie.date_mariage).toLocaleDateString('fr-FR') : '—'],
            ['Montant', `${new Intl.NumberFormat('fr-FR').format(marie.montant_total || marie.budget_total || 0)} FCFA`],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-xs text-dark/40 mb-0.5">{label}</p>
              <p className="text-sm font-medium text-dark truncate">{val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Nouveau contrat */}
      <div className="bg-white border border-beige-200 rounded-2xl p-6 mb-6 shadow-sm">
        <h2 className="font-semibold text-dark mb-4 flex items-center gap-2">
          <Send size={18} className="text-gold-500" /> Générer un nouveau contrat
        </h2>
        <div className="mb-4">
          <label className="text-sm text-dark/60 mb-1 block">Clauses particulières (optionnel)</label>
          <textarea
            rows={3}
            value={clauses}
            onChange={(e) => setClauses(e.target.value)}
            placeholder="Ex : Accès plage privée inclus, DJ partenaire confirmé..."
            className="w-full border border-beige-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-300"
          />
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handlePreview}
            className="px-5 py-2.5 rounded-xl border border-gold-300 text-gold-600 text-sm font-medium hover:bg-gold-50 transition-colors"
          >
            <Download size={16} className="inline mr-1.5" /> Aperçu PDF
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-6 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {generating ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
            {generating ? 'Génération...' : '1 clic — Générer & Envoyer OTP'}
          </button>
        </div>
      </div>

      {/* Modal OTP */}
      {showOtpModal && pendingContrat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="font-serif text-xl font-semibold text-dark mb-2">Signature électronique</h3>
            <p className="text-sm text-dark/60 mb-4">
              Un code OTP a été envoyé par WhatsApp à {marie?.whatsapp}.<br />
              Entrez le code pour signer et archiver le contrat.
            </p>
            <div className="mb-4">
              <label className="text-sm font-medium text-dark mb-1 block">Code OTP (6 chiffres)</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full border border-beige-200 rounded-xl px-4 py-3 text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-gold-300"
                placeholder="______"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowOtpModal(false); setOtpCode('') }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-beige-200 text-dark/60 text-sm font-medium hover:bg-beige-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSign}
                disabled={signing || otpCode.length !== 6}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {signing ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                {signing ? 'Signature...' : 'Signer le contrat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contrat en attente */}
      {pendingContrat && !showOtpModal && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
          <p className="text-amber-800 font-medium text-sm mb-3">
            <Clock size={14} className="inline mr-1" />
            Contrat {pendingContrat.contrat_id} en attente de signature OTP
          </p>
          <button
            onClick={() => setShowOtpModal(true)}
            className="px-5 py-2 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors"
          >
            Entrer le code OTP
          </button>
        </div>
      )}

      {/* Historique contrats */}
      <div className="bg-white border border-beige-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-beige-100">
          <h2 className="font-semibold text-dark">Historique des contrats</h2>
        </div>
        {contrats.length === 0 ? (
          <div className="p-8 text-center text-dark/40 text-sm">Aucun contrat généré pour ce couple</div>
        ) : (
          <div className="divide-y divide-beige-100">
            {contrats.map((c) => (
              <div key={c.contrat_id} className="px-6 py-4 flex items-center gap-4">
                <FileText size={20} className="text-gold-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark">{c.contrat_id}</p>
                  <p className="text-xs text-dark/50">
                    Généré le {c.date_generation ? new Date(c.date_generation).toLocaleDateString('fr-FR') : '—'}
                    {c.signed_at && ` · Signé le ${new Date(c.signed_at).toLocaleDateString('fr-FR')}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {statusBadge(c.statut)}
                  {c.pdf_url && (
                    <a href={c.pdf_url} target="_blank" rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg border border-beige-200 text-xs text-dark/60 hover:bg-beige-50 transition-colors flex items-center gap-1.5">
                      <Download size={12} /> PDF
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
