'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import {
  creerPrescripteurPartenaire,
  modifierPrescripteurPartenaire,
  marquerCommissionVersee,
  setSubscriptionLevel,
  setDefaultImageAdmin,
  setPhotoUrlAdmin,
  type TypePartenaire,
  type RemiseType,
} from '@/actions/codes-sessions'
import type { PrescripteurPartenaire } from '@/actions/codes-sessions'
import { useRouter } from 'next/navigation'
import { useRef } from 'react'

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

function jours(d: string) {
  return Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000))
}

interface Stats {
  partenaires_actifs: number
  codes_actifs: number
  total_utilisations: number
  total_ca_fcfa: number
  commissions_dues_fcfa: number
  forfaits_percus_fcfa: number
  expirant_bientot: PrescripteurPartenaire[]
  top_partenaires: PrescripteurPartenaire[]
  commissions_par_partenaire: Record<string, number>
  tous_partenaires: PrescripteurPartenaire[]
}

const TYPES: TypePartenaire[] = ['hotel', 'restaurant', 'agence', 'bar', 'plage', 'autre']

const APPS_SCRIPT_CODE = `// ─────────────────────────────────────────────────────────────────
// Google Apps Script — Webhook Canal 2 → Firebase
// Coller dans : Extensions > Apps Script, puis déployer comme Web App
// Déclencheur : onEdit (installable) ou bouton manuel
// ─────────────────────────────────────────────────────────────────

const WEBHOOK_URL = 'https://VOTRE_DOMAINE.vercel.app/api/sheets-webhook'
const WEBHOOK_SECRET = 'VOTRE_SHEETS_WEBHOOK_SECRET'
const SHEET_NAME = 'Commandes'
const COL_CODE = 2      // B = Code
const COL_STATUT = 7    // G = Statut
const COL_SYNC = 9      // I = Sync_Firebase

function onEditCanal2(e) {
  const sheet = e.source.getActiveSheet()
  if (sheet.getName() !== SHEET_NAME) return
  if (e.range.getColumn() !== COL_STATUT) return  // seulement si col Statut modifiée

  const row = e.range.getRow()
  if (row <= 1) return  // ignorer la ligne d'en-tête

  const code = sheet.getRange(row, COL_CODE).getValue().toString().trim()
  if (!code || code.length !== 6) return

  const nouveauStatut = e.range.getValue().toString().trim().toLowerCase()
  const statutsValides = ['actif', 'expire', 'epuise']
  if (!statutsValides.includes(nouveauStatut)) return

  // Marquer "en cours" dans Sync_Firebase
  sheet.getRange(row, COL_SYNC).setValue('🔄 Sync...')

  try {
    const payload = JSON.stringify({
      secret: WEBHOOK_SECRET,
      action: 'update_statut',
      code: code,
      statut: nouveauStatut
    })

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: payload,
      muteHttpExceptions: true
    }

    const response = UrlFetchApp.fetch(WEBHOOK_URL, options)
    const result = JSON.parse(response.getContentText())

    if (result.ok) {
      const ts = new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Douala' })
      sheet.getRange(row, COL_SYNC).setValue('✅ ' + nouveauStatut + ' — ' + ts)
    } else {
      sheet.getRange(row, COL_SYNC).setValue('❌ ' + (result.error || 'Erreur'))
    }
  } catch(err) {
    sheet.getRange(row, COL_SYNC).setValue('❌ ' + err.toString().slice(0, 50))
  }
}

// Pour installer le déclencheur :
// Exécuter une fois : installTrigger()
function installTrigger() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  ScriptApp.newTrigger('onEditCanal2')
    .forSpreadsheet(ss)
    .onEdit()
    .create()
  Logger.log('Déclencheur installé ✅')
}`

const formDefault = {
  nom_etablissement: '',
  type: 'hotel' as TypePartenaire,
  telephone: '',
  adresse: '',
  remise_type: 'reduction_pct' as RemiseType,
  remise_valeur_pct: 10,
  remise_description: '',
  forfait_type: 'mensuel' as 'mensuel' | 'annuel',
}

// ── Composant défini AU NIVEAU MODULE pour éviter la perte de focus ──
// (jamais à l'intérieur d'une fonction composant)
interface PartenaireFormValues {
  nom_etablissement: string
  type: TypePartenaire
  telephone: string
  adresse: string
  remise_type: RemiseType
  remise_valeur_pct: number
  remise_description: string
}

function PartenaireFormFields({
  vals,
  onChange,
}: {
  vals: PartenaireFormValues
  onChange: <K extends keyof PartenaireFormValues>(key: K, value: PartenaireFormValues[K]) => void
}) {
  const cls = 'w-full border border-[#F5F0E8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]'
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="text-xs text-[#1A1A1A]/60 mb-1 block">Nom de l&apos;établissement *</label>
        <input value={vals.nom_etablissement} onChange={(e) => onChange('nom_etablissement', e.target.value)}
          className={cls} placeholder="Hôtel Le Lagon" />
      </div>
      <div>
        <label className="text-xs text-[#1A1A1A]/60 mb-1 block">Type</label>
        <select value={vals.type} onChange={(e) => onChange('type', e.target.value as TypePartenaire)} className={cls}>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-[#1A1A1A]/60 mb-1 block">Téléphone *</label>
        <input value={vals.telephone} onChange={(e) => onChange('telephone', e.target.value)}
          className={cls} placeholder="237 6XX XXX XXX" />
      </div>
      <div>
        <label className="text-xs text-[#1A1A1A]/60 mb-1 block">Adresse</label>
        <input value={vals.adresse} onChange={(e) => onChange('adresse', e.target.value)}
          className={cls} placeholder="Kribi Centre" />
      </div>
      <div>
        <label className="text-xs text-[#1A1A1A]/60 mb-1 block">Type remise</label>
        <select value={vals.remise_type} onChange={(e) => onChange('remise_type', e.target.value as RemiseType)} className={cls}>
          <option value="reduction_pct">Réduction % sur réservation</option>
          <option value="non_financier">Avantage non financier</option>
        </select>
      </div>
      {vals.remise_type === 'reduction_pct' ? (
        <div>
          <label className="text-xs text-[#1A1A1A]/60 mb-1 block">Taux de réduction</label>
          <input type="number" min={1} max={50} value={vals.remise_valeur_pct}
            onChange={(e) => onChange('remise_valeur_pct', Number(e.target.value))}
            className={cls} />
        </div>
      ) : (
        <div>
          <label className="text-xs text-[#1A1A1A]/60 mb-1 block">Description avantage</label>
          <input value={vals.remise_description} onChange={(e) => onChange('remise_description', e.target.value)}
            className={cls} placeholder="Cocktail de bienvenue offert" />
        </div>
      )}
    </div>
  )
}

export default function AdminCanalDeuxClient({ stats }: { stats: Stats }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [versementId, setVersementId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [showScript, setShowScript] = useState(false)
  const [copied, setCopied] = useState(false)
  const [subscriptionLoading, setSubscriptionLoading] = useState<string | null>(null)
  const [defaultImageEdit, setDefaultImageEdit] = useState<string | null>(null)
  const [defaultImageVal, setDefaultImageVal] = useState('')
  const [defaultImageSaving, setDefaultImageSaving] = useState(false)
  const [photoUploadId, setPhotoUploadId] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<Record<string, string>>({})
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState(formDefault)

  const [editForm, setEditForm] = useState<{
    nom_etablissement: string
    type: TypePartenaire
    telephone: string
    adresse: string
    remise_type: RemiseType
    remise_valeur_pct: number
    remise_description: string
    statut: 'actif' | 'suspendu' | 'expire'
  }>({
    nom_etablissement: '',
    type: 'hotel',
    telephone: '',
    adresse: '',
    remise_type: 'reduction_pct',
    remise_valeur_pct: 10,
    remise_description: '',
    statut: 'actif',
  })

  function openEdit(p: PrescripteurPartenaire) {
    setEditId(p.uid)
    setEditForm({
      nom_etablissement: p.nom_etablissement,
      type: p.type,
      telephone: p.telephone,
      adresse: p.adresse ?? '',
      remise_type: p.remise_type,
      remise_valeur_pct: p.remise_valeur_pct ?? 10,
      remise_description: p.remise_description ?? '',
      statut: p.statut,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleCreer() {
    if (!form.nom_etablissement || !form.telephone) {
      toast.error('Nom et téléphone requis')
      return
    }
    setSaving(true)
    const res = await creerPrescripteurPartenaire({
      ...form,
      remise_valeur_pct: form.remise_type === 'reduction_pct' ? form.remise_valeur_pct : null,
      remise_description: form.remise_type === 'non_financier' ? form.remise_description : null,
    })
    setSaving(false)
    if (res.success) {
      toast.success('Prescripteur partenaire créé ✅')
      setShowForm(false)
      setForm(formDefault)
      router.refresh()
    } else {
      toast.error(res.error ?? 'Erreur')
    }
  }

  async function handleModifier() {
    if (!editId || !editForm.nom_etablissement || !editForm.telephone) {
      toast.error('Nom et téléphone requis')
      return
    }
    setEditSaving(true)
    const res = await modifierPrescripteurPartenaire(editId, {
      ...editForm,
      remise_valeur_pct: editForm.remise_type === 'reduction_pct' ? editForm.remise_valeur_pct : null,
      remise_description: editForm.remise_type === 'non_financier' ? editForm.remise_description : null,
    })
    setEditSaving(false)
    if (res.success) {
      toast.success('Partenaire mis à jour ✅')
      setEditId(null)
      router.refresh()
    } else {
      toast.error(res.error ?? 'Erreur')
    }
  }

  async function handleVerser(partenaireId: string) {
    setVersementId(partenaireId)
    const res = await marquerCommissionVersee(partenaireId)
    setVersementId(null)
    if (res.success) { toast.success('Commission marquée versée ✅'); router.refresh() }
    else toast.error('Erreur lors du versement')
  }

  function copyScript() {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function handleToggleSubscription(p: PrescripteurPartenaire) {
    const newLevel = p.subscriptionLevel === 'premium' ? 'free' : 'premium'
    setSubscriptionLoading(p.uid)
    const res = await setSubscriptionLevel(p.uid, newLevel)
    setSubscriptionLoading(null)
    if (res.success) {
      toast.success(`${p.nom_etablissement} → ${newLevel === 'premium' ? '⭐ Premium' : '🔓 Free'}`)
      router.refresh()
    } else {
      toast.error(res.error ?? 'Erreur')
    }
  }

  async function handleSaveDefaultImage(id: string) {
    setDefaultImageSaving(true)
    const res = await setDefaultImageAdmin(id, defaultImageVal)
    setDefaultImageSaving(false)
    if (res.success) {
      toast.success('Image par défaut mise à jour ✅')
      setDefaultImageEdit(null)
      router.refresh()
    } else {
      toast.error(res.error ?? 'Erreur')
    }
  }

  async function handlePhotoUpload(partnerId: string, file: File) {
    setPhotoUploading(true)
    console.log('[admin] upload photo →', partnerId, file.name)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('partnerId', partnerId)
      const res = await fetch('/api/admin/upload-photo-partenaire', { method: 'POST', body: fd })
      const json = await res.json() as { success?: boolean; photoUrl?: string; error?: string }
      if (!res.ok || !json.success) {
        toast.error(json.error ?? 'Erreur upload')
        console.error('[admin] upload error:', json.error)
      } else {
        toast.success('Photo mise à jour ✅')
        setPhotoPreview((prev) => ({ ...prev, [partnerId]: json.photoUrl! }))
        // Revalider sans attendre le router.refresh complet
        await setPhotoUrlAdmin(partnerId, json.photoUrl!)
        router.refresh()
      }
    } catch (e) {
      toast.error('Erreur réseau')
      console.error('[admin] upload exception:', e)
    } finally {
      setPhotoUploading(false)
      setPhotoUploadId(null)
    }
  }

  // Helper onChange pour les deux formulaires (création + édition)
  function onChangeForm<K extends keyof PartenaireFormValues>(key: K, value: PartenaireFormValues[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }
  function onChangeEditForm<K extends keyof PartenaireFormValues>(key: K, value: PartenaireFormValues[K]) {
    setEditForm((f) => ({ ...f, [key]: value }))
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Entête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-[#1A1A1A]">🏨 Canal 2 — Prescripteurs Partenaires</h1>
          <p className="text-sm text-[#1A1A1A]/50 mt-1">Hôtels, restaurants, bars, agences, plages</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowScript(!showScript)}
            className="px-3 py-2 border border-[#C9A84C] text-[#C9A84C] text-sm font-medium rounded-xl hover:bg-[#C9A84C]/10 transition-colors">
            📋 Apps Script
          </button>
          <button onClick={() => { setShowForm(!showForm); setEditId(null) }}
            className="px-4 py-2.5 bg-[#C9A84C] text-white text-sm font-semibold rounded-xl hover:bg-[#b8963e] transition-colors">
            + Nouveau partenaire
          </button>
        </div>
      </div>

      {/* Formulaire édition partenaire existant */}
      {editId && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#C9A84C]/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#1A1A1A]">✏️ Modifier le partenaire</h2>
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#1A1A1A]/60">Statut</label>
              <select value={editForm.statut} onChange={(e) => setEditForm((f) => ({ ...f, statut: e.target.value as typeof editForm.statut }))}
                className="border border-[#F5F0E8] rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#C9A84C]">
                <option value="actif">Actif</option>
                <option value="suspendu">Suspendu</option>
                <option value="expire">Expiré</option>
              </select>
            </div>
          </div>
          <PartenaireFormFields vals={editForm} onChange={onChangeEditForm} />
          <div className="flex gap-3 mt-4">
            <button onClick={handleModifier} disabled={editSaving}
              className="px-6 py-2.5 bg-[#C9A84C] text-white text-sm font-semibold rounded-xl disabled:opacity-60 hover:bg-[#b8963e] transition-colors">
              {editSaving ? 'Sauvegarde...' : '💾 Enregistrer'}
            </button>
            <button onClick={() => setEditId(null)}
              className="px-6 py-2.5 bg-[#F5F0E8] text-[#1A1A1A] text-sm font-medium rounded-xl">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Formulaire création */}
      {showForm && !editId && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#F5F0E8]">
          <h2 className="text-sm font-semibold mb-4 text-[#1A1A1A]">Nouveau prescripteur partenaire</h2>
          <PartenaireFormFields vals={form} onChange={onChangeForm} />
          <div className="mt-4">
            <label className="text-xs text-[#1A1A1A]/60 mb-1 block">Forfait</label>
            <select value={form.forfait_type} onChange={(e) => setForm((f) => ({ ...f, forfait_type: e.target.value as 'mensuel' | 'annuel' }))}
              className="w-full sm:w-1/2 border border-[#F5F0E8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]">
              <option value="mensuel">Mensuel</option>
              <option value="annuel">Annuel</option>
            </select>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleCreer} disabled={saving}
              className="px-6 py-2.5 bg-[#C9A84C] text-white text-sm font-semibold rounded-xl disabled:opacity-60 hover:bg-[#b8963e] transition-colors">
              {saving ? 'Création...' : '✅ Créer'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-6 py-2.5 bg-[#F5F0E8] text-[#1A1A1A] text-sm font-medium rounded-xl">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Apps Script code */}
      {showScript && (
        <div className="bg-gray-900 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-white">📋 Code Google Apps Script</p>
            <button onClick={copyScript}
              className="text-xs px-3 py-1.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors">
              {copied ? '✅ Copié !' : '📋 Copier'}
            </button>
          </div>
          <p className="text-xs text-white/50 mb-3">
            Extensions → Apps Script → Coller → Déployer comme Web App → Exécuter <code>installTrigger()</code>
          </p>
          <pre className="text-xs text-green-300 overflow-auto max-h-64 whitespace-pre-wrap leading-relaxed">
            {APPS_SCRIPT_CODE}
          </pre>
          <div className="mt-3 space-y-1.5 text-xs text-white/60">
            <p>1. Remplacer <code className="text-amber-300">VOTRE_DOMAINE</code> par votre URL Vercel</p>
            <p>2. Remplacer <code className="text-amber-300">VOTRE_SHEETS_WEBHOOK_SECRET</code> par la valeur de votre env var <code>SHEETS_WEBHOOK_SECRET</code></p>
            <p>3. Ajouter l&apos;email de votre service account Firebase (valeur de <code className="text-amber-300">FIREBASE_CLIENT_EMAIL</code>) comme éditeur du Google Sheet Canal 2</p>
            <p>4. Ajouter <code className="text-amber-300">GOOGLE_SHEETS_CANAL2_ID</code> dans les env vars Vercel (ID du Google Sheet)</p>
            <p>5. Ajouter <code className="text-amber-300">SHEETS_WEBHOOK_SECRET</code> dans les env vars Vercel (chaîne secrète longue)</p>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Partenaires actifs', val: stats.partenaires_actifs },
          { label: 'Codes actifs', val: stats.codes_actifs },
          { label: 'Utilisations ce mois', val: stats.total_utilisations },
        ].map(({ label, val }) => (
          <div key={label} className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <p className="text-3xl font-bold text-[#C9A84C]">{val}</p>
            <p className="text-xs text-[#1A1A1A]/60 mt-1">{label}</p>
          </div>
        ))}
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <p className="text-xl font-bold text-[#C9A84C]">{formatFCFA(stats.total_ca_fcfa)}</p>
          <p className="text-xs text-[#1A1A1A]/60 mt-1">CA total généré</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <p className="text-xl font-bold text-amber-600">{formatFCFA(stats.commissions_dues_fcfa)}</p>
          <p className="text-xs text-[#1A1A1A]/60 mt-1">Commissions dues</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <p className="text-xl font-bold text-green-600">{formatFCFA(stats.forfaits_percus_fcfa)}</p>
          <p className="text-xs text-[#1A1A1A]/60 mt-1">Forfaits perçus</p>
        </div>
      </div>

      {/* Top partenaires */}
      {stats.top_partenaires.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#1A1A1A] mb-3">🏆 Top partenaires</h2>
          <div className="space-y-2">
            {stats.top_partenaires.map((p, i) => {
              const ca = (p.total_ca_hebergements_fcfa ?? 0) + (p.total_ca_boutique_fcfa ?? 0)
              return (
                <div key={p.uid} className="flex items-center justify-between bg-[#F5F0E8]/40 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-[#C9A84C]">#{i + 1}</span>
                    <div>
                      <p className="text-sm font-semibold text-[#1A1A1A]">{p.nom_etablissement}</p>
                      <p className="text-xs text-[#1A1A1A]/50">{p.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#C9A84C]">{formatFCFA(ca)}</p>
                    <a href={`/partenaire-prescripteur/${p.uid}`} target="_blank" rel="noreferrer"
                      className="text-xs text-[#1A1A1A]/50 hover:text-[#C9A84C] underline">Dashboard →</a>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Forfaits expirant bientôt */}
      {stats.expirant_bientot.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-amber-800 mb-3">⚠️ Forfaits expirant dans 7 jours</h2>
          <div className="space-y-2">
            {stats.expirant_bientot.map((p) => (
              <div key={p.uid} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#1A1A1A]">{p.nom_etablissement}</p>
                  <p className="text-xs text-amber-600">dans {jours(p.forfait_expire_at)} jours</p>
                </div>
                <a href={`https://wa.me/${p.telephone.replace(/\D/g, '')}?text=${encodeURIComponent(`⚠️ Votre forfait L&Lui expire dans ${jours(p.forfait_expire_at)} jours.\nContactez-nous : +237 693 407 964`)}`}
                  target="_blank" rel="noreferrer"
                  className="text-xs px-3 py-1.5 bg-amber-500 text-white rounded-lg">
                  Contacter
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Commissions à verser */}
      {Object.keys(stats.commissions_par_partenaire).length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#1A1A1A] mb-3">💰 Commissions à verser</h2>
          <div className="space-y-2">
            {stats.tous_partenaires
              .filter((p) => (stats.commissions_par_partenaire[p.uid] ?? 0) > 0)
              .map((p) => (
                <div key={p.uid} className="flex items-center justify-between bg-[#F5F0E8]/40 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A]">{p.nom_etablissement}</p>
                    <p className="text-sm font-bold text-amber-600">{formatFCFA(stats.commissions_par_partenaire[p.uid] ?? 0)}</p>
                  </div>
                  <button onClick={() => handleVerser(p.uid)} disabled={versementId === p.uid}
                    className="text-xs px-3 py-1.5 bg-[#C9A84C] text-white rounded-lg disabled:opacity-60 hover:bg-[#b8963e] transition-colors">
                    {versementId === p.uid ? '...' : '✅ Marquer versé'}
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Liste complète de tous les partenaires */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1A1A1A] mb-3">
          📋 Tous les partenaires ({stats.tous_partenaires.length})
        </h2>
        {stats.tous_partenaires.length === 0 ? (
          <p className="text-sm text-[#1A1A1A]/40 text-center py-6">Aucun partenaire pour l&apos;instant.</p>
        ) : (
          <div className="space-y-2">
            {stats.tous_partenaires.map((p) => {
              const isEditing = editId === p.uid
              const forfaitJ = p.forfait_expire_at ? jours(p.forfait_expire_at) : 0
              const forfaitOk = p.forfait_statut === 'actif' && forfaitJ > 0
              return (
                <div key={p.uid} className={`rounded-xl px-4 py-3 border transition-colors ${isEditing ? 'border-[#C9A84C] bg-[#C9A84C]/5' : 'border-[#F5F0E8] bg-[#F5F0E8]/30'}`}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-[#1A1A1A] truncate">{p.nom_etablissement}</p>
                        <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#F5F0E8] text-[#1A1A1A]/50">{p.type}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          p.statut === 'actif' ? 'bg-green-100 text-green-700' :
                          p.statut === 'suspendu' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-600'
                        }`}>{p.statut}</span>
                      </div>
                      <p className="text-xs text-[#1A1A1A]/50 mt-0.5">
                        {p.telephone}
                        {p.adresse ? ` · ${p.adresse}` : ''}
                        {' · '}
                        <span className={forfaitOk ? 'text-green-600' : 'text-red-500'}>
                          Forfait {forfaitOk ? `actif (J-${forfaitJ})` : 'expiré'}
                        </span>
                        {p.remise_type === 'reduction_pct' && p.remise_valeur_pct
                          ? ` · Remise ${p.remise_valeur_pct}%`
                          : p.remise_description ? ` · ${p.remise_description}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                      {/* Badge abonnement + toggle */}
                      <button
                        onClick={() => handleToggleSubscription(p)}
                        disabled={subscriptionLoading === p.uid}
                        title={p.subscriptionLevel === 'premium' ? 'Rétrograder Free' : 'Passer Premium'}
                        className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-60 ${
                          p.subscriptionLevel === 'premium'
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}>
                        {subscriptionLoading === p.uid ? '...' : p.subscriptionLevel === 'premium' ? '⭐ Premium' : '🔓 Free'}
                      </button>
                      {/* Image par défaut */}
                      <button
                        onClick={() => { setDefaultImageEdit(p.uid); setDefaultImageVal(p.defaultImage ?? '') }}
                        className="text-xs px-2.5 py-1.5 bg-[#F5F0E8] text-[#1A1A1A]/60 rounded-lg hover:bg-[#F5F0E8]/80 transition-colors"
                        title="Définir image par défaut">
                        🖼️
                      </button>
                      {/* Upload photo partenaire */}
                      <button
                        onClick={() => { setPhotoUploadId(p.uid); setTimeout(() => photoInputRef.current?.click(), 50) }}
                        disabled={photoUploading && photoUploadId === p.uid}
                        className="text-xs px-2.5 py-1.5 bg-[#F5F0E8] text-[#1A1A1A]/60 rounded-lg hover:bg-[#F5F0E8]/80 transition-colors disabled:opacity-60"
                        title="Uploader photo/logo partenaire">
                        {photoUploading && photoUploadId === p.uid ? '⏳' : '📷'}
                      </button>
                      <a href={`/partenaire-prescripteur/${p.uid}`} target="_blank" rel="noreferrer"
                        className="text-xs px-3 py-1.5 border border-[#C9A84C] text-[#C9A84C] rounded-lg hover:bg-[#C9A84C]/10 transition-colors">
                        Dashboard
                      </a>
                      <button onClick={() => isEditing ? setEditId(null) : openEdit(p)}
                        className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                          isEditing
                            ? 'bg-gray-200 text-gray-600'
                            : 'bg-[#1A1A1A] text-white hover:bg-[#333]'
                        }`}>
                        {isEditing ? 'Fermer' : '✏️ Éditer'}
                      </button>
                    </div>
                    {/* Panel image par défaut */}
                    {defaultImageEdit === p.uid && (
                      <div className="mt-3 pt-3 border-t border-[#F5F0E8] w-full">
                        <p className="text-xs text-[#1A1A1A]/60 mb-2">🖼️ Image par défaut (enseigne)</p>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={defaultImageVal}
                            onChange={(e) => setDefaultImageVal(e.target.value)}
                            placeholder="https://... URL de l'image"
                            className="flex-1 border border-[#F5F0E8] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#C9A84C]"
                          />
                          <button onClick={() => handleSaveDefaultImage(p.uid)} disabled={defaultImageSaving}
                            className="text-xs px-3 py-1.5 bg-[#C9A84C] text-white rounded-lg disabled:opacity-60">
                            {defaultImageSaving ? '...' : '✅'}
                          </button>
                          <button onClick={() => setDefaultImageEdit(null)}
                            className="text-xs px-3 py-1.5 bg-[#F5F0E8] text-[#1A1A1A]/60 rounded-lg">
                            ✕
                          </button>
                        </div>
                        {defaultImageVal && (
                          <div className="mt-2 h-20 bg-[#F5F0E8] rounded-xl overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={defaultImageVal} alt="Aperçu" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    )}
                    {/* Aperçu photo courante */}
                    {(photoPreview[p.uid] || p.photoUrl) && photoUploadId !== p.uid && (
                      <div className="mt-2 w-full flex items-center gap-3 pt-2 border-t border-[#F5F0E8]">
                        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-[#F5F0E8]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photoPreview[p.uid] || p.photoUrl || ''}
                            alt="Photo partenaire"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-xs text-[#1A1A1A]/60">📷 Photo enregistrée</p>
                          <button
                            onClick={() => { setPhotoUploadId(p.uid); setTimeout(() => photoInputRef.current?.click(), 50) }}
                            className="text-[10px] text-[#C9A84C] underline mt-0.5">
                            Changer la photo
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {/* Input file global caché — un seul pour tous les partenaires */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/heic"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file && photoUploadId) {
              handlePhotoUpload(photoUploadId, file)
            }
            e.target.value = '' // reset pour permettre re-upload du même fichier
          }}
        />
      </div>
    </div>
  )
}
