'use client'
// app/admin/contrats/[marie_uid]/avenants/page.tsx — #126 Avenants et modifications contrat
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { FileEdit, Send, CheckCircle, Download, Clock, RefreshCw, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

interface Avenant {
  avenant_id: string
  ancien_pack: string
  nouveau_pack: string
  ancien_montant: number
  nouveau_montant: number
  diff_montant: number
  motif: string
  statut: 'en_attente_signature' | 'signe'
  date_creation: string
  signed_at: string | null
  pdf_url: string | null
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(Math.abs(n))) + ' FCFA'
}

export default function AvenantsPage() {
  const params = useParams()
  const marie_uid = params.marie_uid as string

  const [avenants, setAvenants] = useState<Avenant[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [signing, setSigning] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showOtp, setShowOtp] = useState(false)
  const [pendingAvenant, setPendingAvenant] = useState<Avenant | null>(null)
  const [otpCode, setOtpCode] = useState('')

  const [form, setForm] = useState({
    nouveau_pack: '',
    nouveau_montant: '',
    motif: '',
  })

  useEffect(() => { loadData() }, [marie_uid])

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/avenants?marie_uid=${marie_uid}`)
      if (res.ok) {
        const d = await res.json()
        setAvenants(d.avenants || [])
        const pending = (d.avenants || []).find((a: Avenant) => a.statut === 'en_attente_signature')
        if (pending) setPendingAvenant(pending)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!form.nouveau_pack || !form.nouveau_montant) {
      toast.error('Pack et montant requis')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/admin/avenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marie_uid,
          nouveau_pack: form.nouveau_pack,
          nouveau_montant: parseInt(form.nouveau_montant),
          motif: form.motif,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur création avenant')
      toast.success(`Avenant ${data.avenant_id} créé. OTP envoyé par WhatsApp.`)
      setShowForm(false)
      setForm({ nouveau_pack: '', nouveau_montant: '', motif: '' })
      await loadData()
      setShowOtp(true)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleSign() {
    if (!pendingAvenant || otpCode.length !== 6) {
      toast.error('Code OTP à 6 chiffres requis')
      return
    }
    setSigning(true)
    try {
      // Générer un PDF simple pour l'avenant (texte récapitulatif)
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      doc.setFontSize(16)
      doc.text('AVENANT DE CONTRAT - L&Lui Signature', 20, 30)
      doc.setFontSize(11)
      doc.text(`Avenant N° : ${pendingAvenant.avenant_id}`, 20, 50)
      doc.text(`Ancien pack : ${pendingAvenant.ancien_pack} — ${fmt(pendingAvenant.ancien_montant)}`, 20, 60)
      doc.text(`Nouveau pack : ${pendingAvenant.nouveau_pack} — ${fmt(pendingAvenant.nouveau_montant)}`, 20, 70)
      const diff = pendingAvenant.diff_montant
      doc.text(`Différentiel : ${diff >= 0 ? '+' : '-'}${fmt(diff)}`, 20, 80)
      doc.text(`Motif : ${pendingAvenant.motif}`, 20, 90)
      doc.text(`Signé électroniquement via OTP WhatsApp`, 20, 110)
      doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, 20, 120)
      const pdfDataUri = doc.output('datauristring')

      const res = await fetch('/api/admin/avenants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avenant_id: pendingAvenant.avenant_id,
          otp: otpCode,
          pdf_base64: pdfDataUri,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur signature')
      toast.success('Avenant signé et archivé !')
      setShowOtp(false)
      setOtpCode('')
      setPendingAvenant(null)
      await loadData()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSigning(false)
    }
  }

  if (loading) return (
    <div className="p-8 mt-14 lg:mt-0 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500" /></div>
  )

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0">
      <Toaster position="top-right" />

      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileEdit size={24} className="text-gold-500" />
          <div>
            <h1 className="font-serif text-2xl font-semibold text-dark">Avenants de contrat</h1>
            <p className="text-dark/50 text-sm">Modifications de pack · Re-signature OTP automatique</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-white text-sm font-medium transition-colors flex items-center gap-2"
        >
          <FileEdit size={16} /> Nouvel avenant
        </button>
      </div>

      {/* Formulaire création */}
      {showForm && (
        <div className="bg-white border border-beige-200 rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="font-semibold text-dark mb-4">Créer un avenant</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs text-dark/50 mb-1 block">Nouveau pack</label>
              <input
                value={form.nouveau_pack}
                onChange={(e) => setForm({ ...form, nouveau_pack: e.target.value })}
                placeholder="ex: Pack PRESTIGE"
                className="w-full border border-beige-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-300"
              />
            </div>
            <div>
              <label className="text-xs text-dark/50 mb-1 block">Nouveau montant (FCFA)</label>
              <input
                type="number"
                value={form.nouveau_montant}
                onChange={(e) => setForm({ ...form, nouveau_montant: e.target.value })}
                placeholder="ex: 2500000"
                className="w-full border border-beige-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-300"
              />
            </div>
            <div>
              <label className="text-xs text-dark/50 mb-1 block">Motif</label>
              <input
                value={form.motif}
                onChange={(e) => setForm({ ...form, motif: e.target.value })}
                placeholder="ex: Upgrade pack demandé par couple"
                className="w-full border border-beige-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-300"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-beige-200 text-dark/60 text-sm hover:bg-beige-50 transition-colors">Annuler</button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-6 py-2 rounded-xl bg-gold-500 text-white text-sm font-medium hover:bg-gold-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {creating ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              {creating ? 'Création...' : 'Créer & envoyer OTP'}
            </button>
          </div>
        </div>
      )}

      {/* OTP Modal */}
      {showOtp && pendingAvenant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-serif text-xl font-semibold text-dark mb-2">Signer l'avenant</h3>
            <p className="text-sm text-dark/60 mb-4">Entrez le code OTP envoyé par WhatsApp pour valider l'avenant.</p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full border border-beige-200 rounded-xl px-4 py-3 text-center text-2xl tracking-widest font-mono mb-4 focus:outline-none focus:ring-2 focus:ring-gold-300"
              placeholder="______"
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowOtp(false); setOtpCode('') }} className="flex-1 py-2.5 rounded-xl border border-beige-200 text-sm text-dark/60 hover:bg-beige-50 transition-colors">Annuler</button>
              <button
                onClick={handleSign}
                disabled={signing || otpCode.length !== 6}
                className="flex-1 py-2.5 rounded-xl bg-gold-500 text-white text-sm font-medium hover:bg-gold-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {signing ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                {signing ? 'Signature...' : 'Signer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avenant en attente */}
      {pendingAvenant && !showOtp && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex items-center justify-between">
          <p className="text-amber-800 text-sm font-medium"><Clock size={14} className="inline mr-1" /> Avenant {pendingAvenant.avenant_id} en attente OTP</p>
          <button onClick={() => setShowOtp(true)} className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors">Entrer l'OTP</button>
        </div>
      )}

      {/* Liste avenants */}
      <div className="bg-white border border-beige-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-beige-100">
          <h2 className="font-semibold text-dark">Historique des avenants</h2>
        </div>
        {avenants.length === 0 ? (
          <div className="p-8 text-center text-dark/40 text-sm">Aucun avenant pour ce couple</div>
        ) : (
          <div className="divide-y divide-beige-100">
            {avenants.map((a) => (
              <div key={a.avenant_id} className="px-6 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-dark">{a.avenant_id}</p>
                    {a.statut === 'signe'
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700"><CheckCircle size={11} /> Signé</span>
                      : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700"><Clock size={11} /> En attente</span>
                    }
                  </div>
                  <p className="text-xs text-dark/50">{a.ancien_pack} → {a.nouveau_pack} · {a.motif}</p>
                  <p className="text-xs text-dark/40 mt-0.5">
                    {a.date_creation ? new Date(a.date_creation).toLocaleDateString('fr-FR') : '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-sm font-semibold flex items-center gap-1 ${a.diff_montant >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {a.diff_montant >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {a.diff_montant >= 0 ? '+' : '-'}{fmt(a.diff_montant)}
                  </span>
                  {a.pdf_url && (
                    <a href={a.pdf_url} target="_blank" rel="noopener noreferrer"
                      className="p-2 rounded-lg border border-beige-200 text-dark/50 hover:bg-beige-50 transition-colors">
                      <Download size={14} />
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
