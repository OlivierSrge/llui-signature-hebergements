'use client'
// app/admin/annulations/[marie_uid]/page.tsx — #127 Gestion remboursements/annulations
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Ban, AlertTriangle, CheckCircle, Clock, RefreshCw, Send } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

interface AnnulationResult {
  annulation_id: string
  joursRestants: number
  tauxPct: number
  montantRembourse: number
  montantRetenu: number
  tranche: string
  montant_verse: number
}

interface Annulation {
  annulation_id: string
  statut: 'demande' | 'rembourse' | 'refuse'
  taux_remboursement: number
  montant_rembourse: number
  montant_retenu: number
  montant_verse: number
  jours_restants: number
  tranche: string
  motif: string
  date_demande: string
  date_traitement: string | null
  noms_maries: string
}

interface MariéData {
  noms_maries: string
  whatsapp: string
  date_mariage: string
  montant_total: number
  budget_total: number
  acompte_verse: number
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

const POLICY_TRANCHES = [
  { range: 'Avant J-90', taux: 100, color: 'green' },
  { range: 'J-60 à J-90', taux: 70, color: 'blue' },
  { range: 'J-30 à J-60', taux: 50, color: 'amber' },
  { range: 'J-7 à J-30', taux: 0, color: 'red' },
  { range: 'Après J-7', taux: 0, color: 'red' },
]

export default function AnnulationsPage() {
  const params = useParams()
  const marie_uid = params.marie_uid as string

  const [marie, setMarie] = useState<MariéData | null>(null)
  const [annulations, setAnnulations] = useState<Annulation[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [preview, setPreview] = useState<AnnulationResult | null>(null)
  const [motif, setMotif] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => { loadData() }, [marie_uid])

  async function loadData() {
    setLoading(true)
    try {
      const [userRes, annulRes] = await Promise.all([
        fetch(`/api/portail/user?uid=${marie_uid}`),
        fetch(`/api/admin/annulations?marie_uid=${marie_uid}`),
      ])
      if (userRes.ok) {
        const ud = await userRes.json()
        const u = ud.user || ud
        if (u?.date_mariage && typeof u.date_mariage === 'object') {
          u.date_mariage = new Date(u.date_mariage._seconds * 1000).toISOString()
        }
        setMarie(u)
        // Calculer aperçu remboursement localement
        if (u?.date_mariage) {
          const now = new Date()
          const dm = new Date(u.date_mariage)
          const jours = Math.ceil((dm.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          const montantVerse = u.acompte_verse || 0
          let taux = 0
          let tranche = ''
          if (jours >= 90) { taux = 100; tranche = 'Avant J-90' }
          else if (jours >= 60) { taux = 70; tranche = 'Entre J-60 et J-90' }
          else if (jours >= 30) { taux = 50; tranche = 'Entre J-30 et J-60' }
          else { taux = 0; tranche = jours >= 7 ? 'J-7 à J-30' : 'Après J-7' }
          setPreview({
            annulation_id: '',
            joursRestants: jours,
            tauxPct: taux,
            montantRembourse: Math.round(montantVerse * taux / 100),
            montantRetenu: Math.round(montantVerse * (100 - taux) / 100),
            tranche,
            montant_verse: montantVerse,
          })
        }
      }
      if (annulRes.ok) {
        const d = await annulRes.json()
        setAnnulations(d.annulations || [])
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleAnnuler() {
    setProcessing(true)
    try {
      const res = await fetch('/api/admin/annulations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marie_uid, motif }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur annulation')
      toast.success(`Annulation ${data.annulation_id} créée. Notification WhatsApp envoyée.`)
      setShowConfirm(false)
      setMotif('')
      await loadData()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setProcessing(false)
    }
  }

  async function handleStatut(annulation_id: string, statut: string) {
    setProcessing(true)
    try {
      const res = await fetch('/api/admin/annulations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ annulation_id, statut }),
      })
      if (!res.ok) throw new Error('Erreur MAJ statut')
      toast.success('Statut mis à jour')
      await loadData()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return (
    <div className="p-8 mt-14 lg:mt-0 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500" /></div>
  )

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0">
      <Toaster position="top-right" />

      <div className="mb-8 flex items-center gap-3">
        <Ban size={24} className="text-red-500" />
        <div>
          <h1 className="font-serif text-2xl font-semibold text-dark">Annulations — {marie?.noms_maries || marie_uid}</h1>
          <p className="text-dark/50 text-sm">Politique d'annulation formalisée · Calcul automatique remboursement · Traçabilité</p>
        </div>
      </div>

      {/* Politique d'annulation */}
      <div className="bg-white border border-beige-200 rounded-2xl p-6 mb-6 shadow-sm">
        <h2 className="font-semibold text-dark mb-4">Politique d'annulation L&Lui</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {POLICY_TRANCHES.map((t) => (
            <div key={t.range} className={`rounded-xl p-3 text-center ${
              t.color === 'green' ? 'bg-green-50 border border-green-200' :
              t.color === 'blue' ? 'bg-blue-50 border border-blue-200' :
              t.color === 'amber' ? 'bg-amber-50 border border-amber-200' :
              'bg-red-50 border border-red-200'
            }`}>
              <p className="text-xs font-medium text-dark/60 mb-1">{t.range}</p>
              <p className={`text-2xl font-bold ${
                t.color === 'green' ? 'text-green-600' :
                t.color === 'blue' ? 'text-blue-600' :
                t.color === 'amber' ? 'text-amber-600' :
                'text-red-600'
              }`}>{t.taux}%</p>
              <p className="text-xs text-dark/40">remboursé</p>
            </div>
          ))}
        </div>
      </div>

      {/* Aperçu calcul remboursement */}
      {preview && marie && (
        <div className="bg-beige-50 border border-gold-200 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-dark mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            Simulation d'annulation — Aujourd'hui
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {[
              ['Jours restants', `J-${Math.max(0, preview.joursRestants)}`],
              ['Montant versé', fmt(preview.montant_verse)],
              ['Taux remboursement', `${preview.tauxPct}%`],
              ['Remboursement', fmt(preview.montantRembourse)],
            ].map(([label, val]) => (
              <div key={label} className="bg-white rounded-xl p-3">
                <p className="text-xs text-dark/40 mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-dark">{val}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-dark/60 mb-4">
            Tranche : <span className="font-medium text-dark">{preview.tranche}</span>
            {' · '}Frais retenus : <span className="font-medium text-red-600">{fmt(preview.montantRetenu)}</span>
          </p>
          <button
            onClick={() => setShowConfirm(true)}
            className="px-6 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Ban size={16} /> Déclarer l'annulation
          </button>
        </div>
      )}

      {/* Modal confirmation */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="font-serif text-xl font-semibold text-dark mb-2">Confirmer l'annulation</h3>
            <p className="text-sm text-dark/60 mb-4">
              Cette action enverra une notification WhatsApp au couple avec le détail du remboursement.
            </p>
            <div className="mb-4">
              <label className="text-xs text-dark/50 mb-1 block">Motif de l'annulation</label>
              <input
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="ex: Annulation volontaire du couple"
                className="w-full border border-beige-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </div>
            {preview && (
              <div className="bg-red-50 rounded-xl p-4 mb-4 text-sm">
                <p className="text-red-800 font-medium">Remboursement : {fmt(preview.montantRembourse)} ({preview.tauxPct}%)</p>
                <p className="text-red-600">Frais retenus : {fmt(preview.montantRetenu)}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-beige-200 text-sm text-dark/60 hover:bg-beige-50 transition-colors">Annuler</button>
              <button
                onClick={handleAnnuler}
                disabled={processing}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                {processing ? 'Traitement...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historique annulations */}
      <div className="bg-white border border-beige-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-beige-100">
          <h2 className="font-semibold text-dark">Historique des annulations</h2>
        </div>
        {annulations.length === 0 ? (
          <div className="p-8 text-center text-dark/40 text-sm">Aucune annulation pour ce couple</div>
        ) : (
          <div className="divide-y divide-beige-100">
            {annulations.map((a) => (
              <div key={a.annulation_id} className="px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-dark">{a.annulation_id}</p>
                  <div className="flex items-center gap-2">
                    {a.statut === 'rembourse'
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700"><CheckCircle size={11} /> Remboursé</span>
                      : a.statut === 'refuse'
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700"><Ban size={11} /> Refusé</span>
                      : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700"><Clock size={11} /> En cours</span>
                    }
                    {a.statut === 'demande' && (
                      <button
                        onClick={() => handleStatut(a.annulation_id, 'rembourse')}
                        disabled={processing}
                        className="px-3 py-1 rounded-lg bg-green-500 text-white text-xs font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
                      >
                        Marquer remboursé
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-dark/50">
                  <span>Versé : {fmt(a.montant_verse)}</span>
                  <span className="text-green-600">Remboursé : {fmt(a.montant_rembourse)} ({a.taux_remboursement}%)</span>
                  <span className="text-red-600">Retenu : {fmt(a.montant_retenu)}</span>
                  <span>{a.tranche}</span>
                </div>
                <p className="text-xs text-dark/40 mt-1">
                  {a.date_demande ? new Date(a.date_demande).toLocaleDateString('fr-FR') : '—'}
                  {a.motif && ` · ${a.motif}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
