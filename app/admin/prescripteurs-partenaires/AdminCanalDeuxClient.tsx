'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'react-hot-toast'
import {
  creerPrescripteurPartenaire,
  modifierPrescripteurPartenaire,
  renommerPrescripteurPartenaire,
  prolongerForfaitPartenaire,
  marquerCommissionVersee,
  setSubscriptionLevel,
  setDefaultImageAdmin,
  setPhotoUrlAdmin,
  setCarouselImagesAdmin,
  type TypePartenaire,
  type RemiseType,
} from '@/actions/codes-sessions'
import type { PrescripteurPartenaire } from '@/actions/codes-sessions'
import type { ParametresPlateforme } from '@/actions/parametres'
import { useRouter } from 'next/navigation'
import { useRef } from 'react'

const MapPickerPartenaire = dynamic(
  () => import('@/components/admin/MapPickerPartenaire'),
  { ssr: false, loading: () => <div className="h-[300px] rounded-2xl border border-[#F5F0E8] bg-[#F5F0E8]/50 flex items-center justify-center text-sm text-[#1A1A1A]/40">Chargement de la carte...</div> }
)

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
  latitude: null as number | null,
  longitude: null as number | null,
  adresse_gps: null as string | null,
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

export default function AdminCanalDeuxClient({ stats, plateformeParams }: { stats: Stats; plateformeParams: ParametresPlateforme }) {
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
  // Carrousel admin
  const [carouselEditId, setCarouselEditId] = useState<string | null>(null)
  const nbImages = plateformeParams.premium_nb_images ?? 5
  const [carouselSlots, setCarouselSlots] = useState<string[]>(() => Array(nbImages).fill(''))
  const [carouselUploading, setCarouselUploading] = useState<number | null>(null) // index du slot en upload
  const [carouselSaving, setCarouselSaving] = useState(false)
  const carouselInputRef = useRef<HTMLInputElement>(null)
  const [carouselCurrentSlot, setCarouselCurrentSlot] = useState(0)

  // Rename inline
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')
  const [renameSaving, setRenameSaving] = useState(false)

  // Prolongation forfait
  const [forfaitEditId, setForfaitEditId] = useState<string | null>(null)
  const [forfaitNewDate, setForfaitNewDate] = useState('')
  const [forfaitSaving, setForfaitSaving] = useState(false)

  // Provision Stars
  const [provisionPartnerId, setProvisionPartnerId] = useState<string | null>(null)
  const [provisionAmount, setProvisionAmount] = useState('')
  const [provisionSaving, setProvisionSaving] = useState(false)

  const [form, setForm] = useState(formDefault)

  const [editForm, setEditForm] = useState<{
    nom_etablissement: string
    type: TypePartenaire
    telephone: string
    adresse: string
    latitude: number | null
    longitude: number | null
    adresse_gps: string | null
    remise_type: RemiseType
    remise_valeur_pct: number
    remise_description: string
    statut: 'actif' | 'suspendu' | 'expire'
  }>({
    nom_etablissement: '',
    type: 'hotel',
    telephone: '',
    adresse: '',
    latitude: null,
    longitude: null,
    adresse_gps: null,
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
      latitude: p.latitude ?? null,
      longitude: p.longitude ?? null,
      adresse_gps: p.adresse_gps ?? null,
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
      latitude: form.latitude,
      longitude: form.longitude,
      adresse_gps: form.adresse_gps,
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
      latitude: editForm.latitude,
      longitude: editForm.longitude,
      adresse_gps: editForm.adresse_gps,
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

  function openCarousel(p: PrescripteurPartenaire) {
    const imgs = p.carouselImages ?? []
    setCarouselSlots([...imgs, ...Array(nbImages).fill('')].slice(0, nbImages))
    setCarouselEditId(p.uid)
  }

  async function handleCarouselUpload(partnerId: string, slotIdx: number, file: File) {
    setCarouselUploading(slotIdx)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('partnerId', partnerId)
      fd.append('slotIndex', String(slotIdx))
      const res = await fetch('/api/admin/upload-carousel-image', { method: 'POST', body: fd })
      const json = await res.json() as { success?: boolean; url?: string; error?: string }
      if (!res.ok || !json.success) {
        toast.error(json.error ?? 'Erreur upload')
      } else {
        setCarouselSlots((prev) => {
          const next = [...prev]
          next[slotIdx] = json.url!
          return next
        })
        toast.success(`Image ${slotIdx + 1} uploadée ✅`)
      }
    } catch (e) {
      toast.error('Erreur réseau')
      console.error('[admin] carousel upload exception:', e)
    } finally {
      setCarouselUploading(null)
    }
  }

  async function handleCarouselSave(partnerId: string) {
    setCarouselSaving(true)
    const res = await setCarouselImagesAdmin(partnerId, carouselSlots)
    setCarouselSaving(false)
    if (res.success) {
      toast.success('Carrousel enregistré ✅')
      setCarouselEditId(null)
      router.refresh()
    } else {
      toast.error(res.error ?? 'Erreur')
    }
  }

  async function handleRename(id: string) {
    if (!renameVal.trim()) { toast.error('Nom requis'); return }
    setRenameSaving(true)
    const res = await renommerPrescripteurPartenaire(id, renameVal)
    setRenameSaving(false)
    if (res.success) { toast.success('Nom mis à jour ✅'); setRenameId(null); router.refresh() }
    else toast.error(res.error ?? 'Erreur')
  }

  function openForfaitEdit(p: PrescripteurPartenaire) {
    setForfaitEditId(p.uid)
    // Pré-remplir avec la date actuelle d'expiration au format YYYY-MM-DD
    const d = p.forfait_expire_at ? new Date(p.forfait_expire_at) : new Date()
    setForfaitNewDate(d.toISOString().split('T')[0])
  }

  function addDays(baseDateStr: string, days: number): string {
    const base = baseDateStr ? new Date(baseDateStr) : new Date()
    base.setDate(base.getDate() + days)
    return base.toISOString().split('T')[0]
  }

  async function handleSaveForfait(id: string) {
    if (!forfaitNewDate) { toast.error('Date requise'); return }
    setForfaitSaving(true)
    const res = await prolongerForfaitPartenaire(id, forfaitNewDate + 'T23:59:59.000Z')
    setForfaitSaving(false)
    if (res.success) { toast.success('Forfait mis à jour ✅'); setForfaitEditId(null); router.refresh() }
    else toast.error(res.error ?? 'Erreur')
  }

  async function handleCreditProvision(partnerId: string) {
    const amount = Number(provisionAmount)
    if (!amount || amount <= 0) { toast.error('Montant invalide'); return }
    setProvisionSaving(true)
    try {
      const res = await fetch('/api/admin/credit-provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerId, amount }),
      })
      const json = await res.json() as { success?: boolean; newBalance?: number; error?: string }
      if (!res.ok || !json.success) {
        toast.error(json.error ?? 'Erreur')
      } else {
        toast.success(`Provision créditée : +${formatFCFA(amount)} (solde : ${formatFCFA(json.newBalance ?? 0)})`)
        setProvisionPartnerId(null)
        setProvisionAmount('')
        router.refresh()
      }
    } catch (e) {
      void e
      toast.error('Erreur réseau')
    } finally {
      setProvisionSaving(false)
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
          <div className="mt-4 space-y-2">
            <label className="text-xs text-[#1A1A1A]/60 font-medium block">📍 Position sur la carte</label>
            {editForm.latitude != null && editForm.longitude != null && (
              <p className="text-xs bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-green-700">✅ {editForm.adresse_gps || `${editForm.latitude.toFixed(5)}, ${editForm.longitude.toFixed(5)}`}</p>
            )}
            <MapPickerPartenaire
              partenaireId={editId ?? undefined}
              latitudeInitiale={editForm.latitude ?? undefined}
              longitudeInitiale={editForm.longitude ?? undefined}
              nomPartenaire={editForm.nom_etablissement}
              onPositionValidee={(lat, lng, adresse) =>
                setEditForm((f) => ({ ...f, latitude: lat, longitude: lng, adresse_gps: adresse }))
              }
            />
          </div>
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
          <div className="mt-4 space-y-2">
            <label className="text-xs text-[#1A1A1A]/60 font-medium block">📍 Position sur la carte <span className="text-[#1A1A1A]/40">(optionnel)</span></label>
            {form.latitude != null && form.longitude != null && (
              <p className="text-xs bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-green-700">✅ {form.adresse_gps || `${form.latitude.toFixed(5)}, ${form.longitude.toFixed(5)}`}</p>
            )}
            <MapPickerPartenaire
              nomPartenaire={form.nom_etablissement}
              onPositionValidee={(lat, lng, adresse) =>
                setForm((f) => ({ ...f, latitude: lat, longitude: lng, adresse_gps: adresse }))
              }
            />
          </div>
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
            {stats.top_partenaires.map((p, i) => (
              <div key={p.uid} className="flex items-center justify-between bg-[#F5F0E8]/40 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-[#C9A84C]">{`#${i + 1}`}</span>
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A]">{p.nom_etablissement}</p>
                    <p className="text-xs text-[#1A1A1A]/50">{p.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#C9A84C]">{formatFCFA((p.total_ca_hebergements_fcfa ?? 0) + (p.total_ca_boutique_fcfa ?? 0))}</p>
                  <a href={'/partenaire-prescripteur/' + p.uid} target="_blank" rel="noreferrer"
                    className="text-xs text-[#1A1A1A]/50 hover:text-[#C9A84C] underline">Dashboard →</a>
                </div>
              </div>
            ))}
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
                <a href={'https://wa.me/' + p.telephone.replace(/\D/g, '') + '?text=' + encodeURIComponent('⚠️ Votre forfait L&Lui expire dans ' + jours(p.forfait_expire_at) + ' jours.\nContactez-nous : +237 693 407 964')}
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
                      {/* Nom — rename inline */}
                      {renameId === p.uid ? (
                        <div className="flex items-center gap-2 mb-1">
                          <input
                            autoFocus
                            value={renameVal}
                            onChange={(e) => setRenameVal(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleRename(p.uid); if (e.key === 'Escape') setRenameId(null) }}
                            className="flex-1 border border-[#C9A84C] rounded-lg px-2 py-1 text-sm font-semibold focus:outline-none"
                          />
                          <button onClick={() => handleRename(p.uid)} disabled={renameSaving}
                            className="text-xs px-2.5 py-1 bg-[#C9A84C] text-white rounded-lg disabled:opacity-60">
                            {renameSaving ? '...' : '✅'}
                          </button>
                          <button onClick={() => setRenameId(null)}
                            className="text-xs px-2 py-1 bg-[#F5F0E8] text-[#1A1A1A]/60 rounded-lg">✕</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-[#1A1A1A] truncate">{p.nom_etablissement}</p>
                          <button
                            onClick={() => { setRenameId(p.uid); setRenameVal(p.nom_etablissement) }}
                            title="Renommer"
                            className="text-[10px] text-[#1A1A1A]/30 hover:text-[#C9A84C] transition-colors">
                            ✏️
                          </button>
                          <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#F5F0E8] text-[#1A1A1A]/50">{p.type}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            p.statut === 'actif' ? 'bg-green-100 text-green-700' :
                            p.statut === 'suspendu' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-600'
                          }`}>{p.statut}</span>
                        </div>
                      )}
                      <p className="text-xs text-[#1A1A1A]/50 mt-0.5">
                        {p.telephone}
                        {p.adresse ? ` · ${p.adresse}` : ''}
                        {' · '}
                        <button
                          onClick={() => openForfaitEdit(p)}
                          className={`underline decoration-dotted hover:text-[#C9A84C] transition-colors ${forfaitOk ? 'text-green-600' : 'text-red-500'}`}
                          title="Modifier la date de validité">
                          Forfait {forfaitOk ? `actif (J-${forfaitJ})` : 'expiré'}
                        </button>
                        {p.remise_type === 'reduction_pct' && p.remise_valeur_pct
                          ? ` · Remise ${p.remise_valeur_pct}%`
                          : p.remise_description ? ` · ${p.remise_description}` : ''}
                        {' · '}
                        {p.subscriptionLevel === 'premium'
                          ? <span className="text-amber-600">⭐ Premium</span>
                          : <span>Free</span>
                        }
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
                        {subscriptionLoading === p.uid
                          ? '...'
                          : p.subscriptionLevel === 'premium'
                            ? `⭐ Premium`
                            : '🔓 Free'}
                      </button>
                      {/* Carrousel images */}
                      <button
                        onClick={() => carouselEditId === p.uid ? setCarouselEditId(null) : openCarousel(p)}
                        title="Gérer le carrousel d'images"
                        className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                          carouselEditId === p.uid
                            ? 'bg-[#C9A84C] text-white'
                            : 'bg-[#F5F0E8] text-[#1A1A1A]/60 hover:bg-[#F5F0E8]/80'
                        }`}>
                        🎠
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
                      {/* Provision Stars */}
                      <button
                        onClick={() => {
                          if (provisionPartnerId === p.uid) { setProvisionPartnerId(null); setProvisionAmount('') }
                          else { setProvisionPartnerId(p.uid); setProvisionAmount('') }
                        }}
                        title="Créditer la provision Stars"
                        className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                          provisionPartnerId === p.uid
                            ? 'bg-emerald-500 text-white'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}>
                        💰
                      </button>
                      {/* Prolonger forfait */}
                      <button
                        onClick={() => forfaitEditId === p.uid ? setForfaitEditId(null) : openForfaitEdit(p)}
                        title="Modifier la date de validité du forfait"
                        className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                          forfaitEditId === p.uid
                            ? 'bg-[#C9A84C] text-white'
                            : forfaitOk ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'
                        }`}>
                        📅
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

                    {/* Panel — Prolongation forfait */}
                    {forfaitEditId === p.uid && (
                      <div className="mt-3 pt-3 border-t border-[#F5F0E8] w-full">
                        <p className="text-xs font-semibold text-[#1A1A1A] mb-2">📅 Date de validité du forfait</p>
                        <p className="text-xs text-[#1A1A1A]/50 mb-3">
                          Actuellement : <span className={forfaitOk ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                            {p.forfait_expire_at ? new Date(p.forfait_expire_at).toLocaleDateString('fr-FR') : '—'}
                            {forfaitOk ? ` (J-${forfaitJ})` : ' — expiré'}
                          </span>
                        </p>
                        {/* Raccourcis */}
                        <div className="flex gap-2 mb-3">
                          {[
                            { label: '+30 jours', days: 30 },
                            { label: '+90 jours', days: 90 },
                            { label: '+1 an', days: 365 },
                          ].map(({ label, days }) => (
                            <button
                              key={days}
                              onClick={() => setForfaitNewDate(addDays(forfaitNewDate, days))}
                              className="text-xs px-3 py-1.5 bg-[#F5F0E8] text-[#1A1A1A] rounded-lg hover:bg-[#C9A84C]/20 hover:text-[#C9A84C] transition-colors font-medium">
                              {label}
                            </button>
                          ))}
                        </div>
                        {/* Saisie date libre */}
                        <div className="flex gap-2 items-center">
                          <input
                            type="date"
                            value={forfaitNewDate}
                            onChange={(e) => setForfaitNewDate(e.target.value)}
                            className="flex-1 border border-[#F5F0E8] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#C9A84C]"
                          />
                          <button
                            onClick={() => handleSaveForfait(p.uid)}
                            disabled={forfaitSaving}
                            className="px-4 py-1.5 bg-[#C9A84C] text-white text-xs font-semibold rounded-lg disabled:opacity-60 hover:bg-[#b8963e] transition-colors">
                            {forfaitSaving ? '...' : '💾 Enregistrer'}
                          </button>
                          <button onClick={() => setForfaitEditId(null)}
                            className="px-3 py-1.5 bg-[#F5F0E8] text-[#1A1A1A]/60 text-xs rounded-lg">
                            ✕
                          </button>
                        </div>
                        {forfaitNewDate && (
                          <p className="text-xs text-[#C9A84C] mt-2 font-medium">
                            → Nouvelle expiration : {new Date(forfaitNewDate).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Panel — Provision Stars */}
                    {provisionPartnerId === p.uid && (
                      <div className="mt-3 pt-3 border-t border-[#F5F0E8] w-full">
                        <p className="text-xs font-semibold text-[#1A1A1A] mb-1">💰 Créditer la provision Stars</p>
                        <p className="text-xs text-[#1A1A1A]/50 mb-3">
                          Solde actuel : <span className="font-semibold text-emerald-700">{formatFCFA((p as PrescripteurPartenaire & { solde_provision?: number }).solde_provision ?? 0)}</span>
                        </p>
                        <div className="flex gap-2 items-center">
                          <input
                            type="number"
                            min={1}
                            value={provisionAmount}
                            onChange={(e) => setProvisionAmount(e.target.value)}
                            placeholder="Montant en FCFA"
                            className="flex-1 border border-[#F5F0E8] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#C9A84C]"
                          />
                          <button
                            onClick={() => handleCreditProvision(p.uid)}
                            disabled={provisionSaving}
                            className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg disabled:opacity-60 hover:bg-emerald-700 transition-colors">
                            {provisionSaving ? '...' : '✅'}
                          </button>
                          <button
                            onClick={() => { setProvisionPartnerId(null); setProvisionAmount('') }}
                            className="px-3 py-1.5 bg-[#F5F0E8] text-[#1A1A1A]/60 text-xs rounded-lg">
                            ✕
                          </button>
                        </div>
                        {provisionAmount && Number(provisionAmount) > 0 && (
                          <p className="text-xs text-emerald-600 mt-2 font-medium">
                            → Nouveau solde estimé : {formatFCFA(((p as PrescripteurPartenaire & { solde_provision?: number }).solde_provision ?? 0) + Number(provisionAmount))}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Panel Carrousel */}
                    {carouselEditId === p.uid && (
                      <div className="mt-3 pt-3 border-t border-[#F5F0E8] w-full">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-semibold text-[#1A1A1A]">🎠 Carrousel publicitaire</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.subscriptionLevel === 'premium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                            {p.subscriptionLevel === 'premium' ? '⭐ Premium actif' : '🔓 Free — passer Premium pour activer'}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {carouselSlots.map((url, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              {/* Miniature */}
                              <div className={`w-16 h-10 rounded-lg overflow-hidden flex-shrink-0 border-2 ${url ? 'border-[#C9A84C]' : 'border-dashed border-[#F5F0E8]'} bg-[#F5F0E8]`}>
                                {url
                                  ? /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={url} alt={`Slot ${idx + 1}`} className="w-full h-full object-cover" />
                                  : <div className="w-full h-full flex items-center justify-center text-[#C9A84C]/40 text-sm">
                                      {carouselUploading === idx ? <span className="animate-spin inline-block w-3 h-3 border-2 border-[#C9A84C] border-t-transparent rounded-full" /> : idx + 1}
                                    </div>
                                }
                              </div>
                              {/* Input URL */}
                              <input
                                type="url"
                                value={url}
                                onChange={(e) => {
                                  const next = [...carouselSlots]
                                  next[idx] = e.target.value
                                  setCarouselSlots(next)
                                }}
                                placeholder={`Image ${idx + 1} — URL ou uploader →`}
                                className="flex-1 border border-[#F5F0E8] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#C9A84C]"
                              />
                              {/* Bouton upload */}
                              <button
                                onClick={() => { setCarouselCurrentSlot(idx); setTimeout(() => carouselInputRef.current?.click(), 50) }}
                                disabled={carouselUploading !== null}
                                className="text-xs px-2 py-1.5 bg-[#F5F0E8] text-[#C9A84C] rounded-lg hover:bg-[#C9A84C]/10 disabled:opacity-50 flex-shrink-0"
                                title="Uploader une image">
                                📁
                              </button>
                              {/* Supprimer */}
                              {url && (
                                <button
                                  onClick={() => { const n = [...carouselSlots]; n[idx] = ''; setCarouselSlots(n) }}
                                  className="text-red-400 hover:text-red-600 text-base flex-shrink-0">
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleCarouselSave(p.uid)}
                            disabled={carouselSaving}
                            className="flex-1 py-2 bg-[#C9A84C] text-white text-xs font-semibold rounded-lg disabled:opacity-60 hover:bg-[#b8963e] transition-colors">
                            {carouselSaving ? 'Enregistrement...' : '💾 Enregistrer le carrousel'}
                          </button>
                          <button
                            onClick={() => setCarouselEditId(null)}
                            className="px-4 py-2 bg-[#F5F0E8] text-[#1A1A1A]/60 text-xs rounded-lg">
                            Annuler
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
        {/* Input file photo partenaire */}
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
            e.target.value = ''
          }}
        />
        {/* Input file carrousel */}
        <input
          ref={carouselInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/heic"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file && carouselEditId) {
              handleCarouselUpload(carouselEditId, carouselCurrentSlot, file)
            }
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}
