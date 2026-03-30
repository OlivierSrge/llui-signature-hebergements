'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { ArrowLeft, Plus, Trash2, Loader2, Save, X } from 'lucide-react'
import UploadFichier from '@/components/ui/UploadFichier'

const CATEGORIES = [
  { id: 'restauration', label: 'Restauration' },
  { id: 'photo_video', label: 'Photo & Vidéo' },
  { id: 'decoration', label: 'Décoration' },
  { id: 'son_animation', label: 'Son & Animation' },
  { id: 'beaute_bienetre', label: 'Beauté & Bien-être' },
  { id: 'experiences', label: 'Expériences' },
  { id: 'mariage_evenements', label: 'Mariage & Événements' },
]

const UNITES = [
  { id: 'forfait', label: 'Forfait' },
  { id: 'heure', label: 'Heure' },
  { id: 'journee', label: 'Journée' },
  { id: 'personne', label: 'Personne' },
  { id: 'piece', label: 'Pièce' },
]

interface ServiceItem {
  id: string
  titre: string
  description: string
  prix: number
  unite: string
  disponible: boolean
}

interface PortfolioItem {
  url: string
  legende: string
  type: string
}

const inputCls =
  'w-full px-3 py-2.5 rounded-xl border border-[#E8E0D0] text-sm bg-white focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]/20'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#1A1A1A]/55 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  )
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-[#E8E0D0] bg-white">
      <span className="text-sm text-[#1A1A1A]/80">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-[#C9A84C]' : 'bg-[#1A1A1A]/20'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

export default function ModifierPrestatairePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const portfolioInputRef = useRef<HTMLInputElement>(null)

  // ─── Form state ──────────────────────────────────────────────────────────
  const [nom, setNom] = useState('')
  const [slogan, setSlogan] = useState('')
  const [categorie, setCategorie] = useState('restauration')
  const [description, setDescription] = useState('')
  const [localisation, setLocalisation] = useState('')
  const [telephone, setTelephone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [commissionTaux, setCommissionTaux] = useState(10)
  const [certifie, setCertifie] = useState(false)
  const [misEnAvant, setMisEnAvant] = useState(false)
  const [statut, setStatut] = useState('actif')
  const [ordreAffichage, setOrdreAffichage] = useState(99)
  const [photoPrincipale, setPhotoPrincipale] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [services, setServices] = useState<ServiceItem[]>([])
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])

  // ─── Charger les données ──────────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/admin/prestataires-services?id=${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        const p = d.prestataire
        if (!p) {
          toast.error('Prestataire introuvable')
          router.push('/admin/prestataires-services')
          return
        }
        setNom(p.nom ?? '')
        setSlogan(p.slogan ?? '')
        setCategorie(p.categorie ?? 'restauration')
        setDescription(p.description ?? '')
        setLocalisation(p.contact?.localisation ?? '')
        setTelephone(p.contact?.telephone ?? '')
        setWhatsapp(p.contact?.whatsapp ?? '')
        setEmail(p.contact?.email ?? '')
        setCommissionTaux(p.commission_taux ?? 10)
        setCertifie(p.certifie ?? false)
        setMisEnAvant(p.mis_en_avant ?? false)
        setStatut(p.statut ?? 'actif')
        setOrdreAffichage(p.ordre_affichage ?? 99)
        setPhotoPrincipale(p.photo_principale ?? '')
        setLogoUrl(p.logo_url ?? '')
        setServices(
          (p.services ?? []).map((s: any) => ({
            id: s.id ?? String(Math.random()),
            titre: s.titre ?? '',
            description: s.description ?? '',
            prix: s.prix ?? 0,
            unite: s.unite ?? 'forfait',
            disponible: s.disponible ?? true,
          }))
        )
        setPortfolio(
          (p.portfolio ?? []).map((item: any) => ({
            url: item.url ?? '',
            legende: item.legende ?? '',
            type: item.type ?? 'image',
          }))
        )
      })
      .catch(() => {
        toast.error('Erreur de chargement')
        router.push('/admin/prestataires-services')
      })
      .finally(() => setLoading(false))
  }, [params.id, router])

  // ─── Sauvegarder ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!nom.trim()) {
      toast.error('Le nom est requis')
      return
    }
    setSaving(true)
    const res = await fetch('/api/admin/prestataires-services', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: params.id,
        nom: nom.trim(),
        slogan: slogan.trim(),
        categorie,
        description: description.trim(),
        contact: {
          localisation: localisation.trim(),
          telephone: telephone.trim(),
          whatsapp: whatsapp.trim(),
          email: email.trim(),
        },
        services,
        commission_taux: commissionTaux,
        certifie,
        mis_en_avant: misEnAvant,
        statut,
        ordre_affichage: ordreAffichage,
        photo_principale: photoPrincipale,
        logo_url: logoUrl,
        portfolio,
      }),
    })
    setSaving(false)
    if (res.ok) {
      toast.success('Prestataire mis à jour ✅')
      router.push('/admin/prestataires-services')
    } else {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  // ─── Supprimer ────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    const res = await fetch('/api/admin/prestataires-services', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: params.id }),
    })
    if (res.ok) {
      toast.success('Prestataire supprimé')
      router.push('/admin/prestataires-services')
    } else {
      toast.error('Erreur lors de la suppression')
    }
  }

  // ─── Services ────────────────────────────────────────────────────────────
  const addService = () => {
    setServices((s) => [
      ...s,
      { id: Date.now().toString(), titre: '', description: '', prix: 0, unite: 'forfait', disponible: true },
    ])
  }

  const updateService = (idx: number, field: string, value: any) => {
    setServices((s) => s.map((item, i) => (i === idx ? { ...item, [field]: value } : item)))
  }

  const removeService = (idx: number) => {
    setServices((s) => s.filter((_, i) => i !== idx))
  }

  // ─── Portfolio ───────────────────────────────────────────────────────────
  const handlePortfolioUpload = async (file: File) => {
    if (portfolio.length >= 10) {
      toast.error('Maximum 10 photos dans le portfolio')
      return
    }
    setUploadingPortfolio(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', `prestataires/${params.id}/portfolio`)
    try {
      const res = await fetch('/api/admin/upload-evenement', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) {
        setPortfolio((p) => [...p, { url: data.url, legende: '', type: 'image' }])
        toast.success('Photo ajoutée ✅')
      } else {
        toast.error(data.error || 'Erreur upload')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setUploadingPortfolio(false)
    }
  }

  const removePortfolioItem = (idx: number) => {
    setPortfolio((p) => p.filter((_, i) => i !== idx))
  }

  const updatePortfolioLegende = (idx: number, legende: string) => {
    setPortfolio((p) => p.map((item, i) => (i === idx ? { ...item, legende } : item)))
  }

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={28} className="animate-spin" style={{ color: '#C9A84C' }} />
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-8 mt-14 lg:mt-0 max-w-3xl">
      {/* ─── En-tête ─── */}
      <div className="flex items-center gap-3 mb-8 flex-wrap">
        <button
          onClick={() => router.push('/admin/prestataires-services')}
          className="flex items-center gap-1.5 text-sm text-[#1A1A1A]/50 hover:text-[#1A1A1A] transition-colors"
        >
          <ArrowLeft size={16} /> Retour à la liste
        </button>
        <span className="text-[#1A1A1A]/20">/</span>
        <h1 className="font-serif text-xl font-semibold text-[#1A1A1A] truncate">
          {nom || 'Modifier le prestataire'}
        </h1>
      </div>

      <div className="space-y-6">
        {/* ══ IDENTITÉ ══ */}
        <section className="bg-white rounded-2xl border border-[#E8E0D0] p-6">
          <h2 className="font-semibold text-[#1A1A1A] mb-5 flex items-center gap-2">
            <span className="w-6 h-6 bg-[#F5F0E8] rounded-lg flex items-center justify-center text-xs">✏️</span>
            Identité
          </h2>
          <div className="space-y-4">
            <Field label="Nom du prestataire *">
              <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex: Studio Kamer Photo" className={inputCls} />
            </Field>
            <Field label="Slogan / Accroche courte">
              <input value={slogan} onChange={(e) => setSlogan(e.target.value)} placeholder="Ex: Capturez l'instant" className={inputCls} />
            </Field>
            <Field label="Catégorie">
              <select value={categorie} onChange={(e) => setCategorie(e.target.value)} className={inputCls}>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Description">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Présentation du prestataire..."
                className={`${inputCls} resize-none`}
              />
            </Field>
            <Field label="Localisation à Kribi">
              <input value={localisation} onChange={(e) => setLocalisation(e.target.value)} placeholder="Ex: Centre-ville Kribi" className={inputCls} />
            </Field>
          </div>
        </section>

        {/* ══ CONTACT ══ */}
        <section className="bg-white rounded-2xl border border-[#E8E0D0] p-6">
          <h2 className="font-semibold text-[#1A1A1A] mb-5 flex items-center gap-2">
            <span className="w-6 h-6 bg-[#F5F0E8] rounded-lg flex items-center justify-center text-xs">📞</span>
            Contact
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Téléphone">
              <input value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="+237 6XX XXX XXX" className={inputCls} />
            </Field>
            <Field label="WhatsApp">
              <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+237 6XX XXX XXX" className={inputCls} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Email (optionnel)">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@exemple.cm" className={inputCls} />
              </Field>
            </div>
          </div>
        </section>

        {/* ══ PHOTO PRINCIPALE ══ */}
        <section className="bg-white rounded-2xl border border-[#E8E0D0] p-6">
          <h2 className="font-semibold text-[#1A1A1A] mb-2 flex items-center gap-2">
            <span className="w-6 h-6 bg-[#F5F0E8] rounded-lg flex items-center justify-center text-xs">🖼️</span>
            Photo principale
          </h2>
          <p className="text-xs text-[#1A1A1A]/40 mb-4">
            Affichée en en-tête de la fiche et sur les cards de l&apos;annuaire
          </p>
          <UploadFichier
            value={photoPrincipale || null}
            onChange={(url) => setPhotoPrincipale(url)}
            folder={`prestataires/${params.id}`}
            label="Photo de couverture"
            acceptImages
            acceptPDF={false}
            maxSizeMo={5}
          />
        </section>

        {/* ══ LOGO / ILLUSTRATION ══ */}
        <section className="bg-white rounded-2xl border border-[#E8E0D0] p-6">
          <h2 className="font-semibold text-[#1A1A1A] mb-2 flex items-center gap-2">
            <span className="w-6 h-6 bg-[#F5F0E8] rounded-lg flex items-center justify-center text-xs">🏷️</span>
            Logo / Illustration
          </h2>
          <p className="text-xs text-[#1A1A1A]/40 mb-4">
            Affiché comme avatar sur la card si pas de photo principale
          </p>
          <UploadFichier
            value={logoUrl || null}
            onChange={(url) => setLogoUrl(url)}
            folder={`prestataires/${params.id}/logo`}
            label="Logo ou illustration"
            acceptImages
            acceptPDF={false}
            maxSizeMo={5}
          />
        </section>

        {/* ══ PORTFOLIO ══ */}
        <section className="bg-white rounded-2xl border border-[#E8E0D0] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-[#1A1A1A] flex items-center gap-2">
                <span className="w-6 h-6 bg-[#F5F0E8] rounded-lg flex items-center justify-center text-xs">📸</span>
                Portfolio
                <span className="text-xs font-normal text-[#1A1A1A]/40">({portfolio.length}/10)</span>
              </h2>
            </div>
            {portfolio.length < 10 && (
              <button
                type="button"
                onClick={() => portfolioInputRef.current?.click()}
                disabled={uploadingPortfolio}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-80"
                style={{ background: '#C9A84C' }}
              >
                {uploadingPortfolio ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Plus size={12} />
                )}
                Ajouter une photo
              </button>
            )}
          </div>

          {portfolio.length === 0 ? (
            <div
              role="button"
              tabIndex={0}
              onClick={() => portfolioInputRef.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && portfolioInputRef.current?.click()}
              className="text-center py-8 rounded-xl border-2 border-dashed border-[#E8E0D0] cursor-pointer hover:border-[#C9A84C] transition-colors"
            >
              <p className="text-sm text-[#1A1A1A]/40">Aucune photo dans le portfolio</p>
              <p className="text-xs text-[#C9A84C] mt-1">Cliquez pour ajouter →</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {portfolio.map((item, idx) => (
                <div key={idx} className="relative group">
                  <div className="aspect-square rounded-xl overflow-hidden" style={{ background: '#F5F0E8' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.url} alt={item.legende || ''} className="w-full h-full object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={() => removePortfolioItem(idx)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                  >
                    <X size={10} />
                  </button>
                  <input
                    value={item.legende}
                    onChange={(e) => updatePortfolioLegende(idx, e.target.value)}
                    placeholder="Légende..."
                    className="w-full mt-1 px-2 py-1 text-xs border border-[#E8E0D0] rounded-lg focus:outline-none focus:border-[#C9A84C]"
                  />
                </div>
              ))}
              {uploadingPortfolio && (
                <div className="aspect-square rounded-xl border-2 border-dashed border-[#C9A84C] flex items-center justify-center" style={{ background: '#F5F0E8' }}>
                  <Loader2 size={20} className="animate-spin" style={{ color: '#C9A84C' }} />
                </div>
              )}
            </div>
          )}

          <input
            ref={portfolioInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handlePortfolioUpload(file)
              e.target.value = ''
            }}
          />
        </section>

        {/* ══ SERVICES ══ */}
        <section className="bg-white rounded-2xl border border-[#E8E0D0] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[#1A1A1A] flex items-center gap-2">
              <span className="w-6 h-6 bg-[#F5F0E8] rounded-lg flex items-center justify-center text-xs">🛎️</span>
              Services
              <span className="text-xs font-normal text-[#1A1A1A]/40">({services.length})</span>
            </h2>
            <button
              type="button"
              onClick={addService}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white hover:opacity-80 transition-opacity"
              style={{ background: '#C9A84C' }}
            >
              <Plus size={12} /> Ajouter un service
            </button>
          </div>

          <div className="space-y-4">
            {services.length === 0 && (
              <div className="text-center py-6 rounded-xl border-2 border-dashed border-[#E8E0D0]">
                <p className="text-sm text-[#1A1A1A]/40">Aucun service</p>
                <button type="button" onClick={addService} className="text-xs mt-1" style={{ color: '#C9A84C' }}>
                  Ajouter le premier service →
                </button>
              </div>
            )}
            {services.map((s, idx) => (
              <div key={s.id} className="p-4 rounded-xl border border-[#E8E0D0]" style={{ background: '#FAFAF8' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-[#1A1A1A]/40 uppercase tracking-wide">
                    Service {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeService(idx)}
                    className="p-1 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Titre">
                    <input
                      value={s.titre}
                      onChange={(e) => updateService(idx, 'titre', e.target.value)}
                      placeholder="Ex: Reportage photo"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Prix (FCFA)">
                    <input
                      type="number"
                      value={s.prix}
                      onChange={(e) => updateService(idx, 'prix', Number(e.target.value))}
                      placeholder="0"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Unité">
                    <select
                      value={s.unite}
                      onChange={(e) => updateService(idx, 'unite', e.target.value)}
                      className={inputCls}
                    >
                      {UNITES.map((u) => (
                        <option key={u.id} value={u.id}>{u.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Disponibilité">
                    <select
                      value={s.disponible ? 'oui' : 'non'}
                      onChange={(e) => updateService(idx, 'disponible', e.target.value === 'oui')}
                      className={inputCls}
                    >
                      <option value="oui">✅ Disponible</option>
                      <option value="non">⛔ Indisponible</option>
                    </select>
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Description courte">
                      <input
                        value={s.description}
                        onChange={(e) => updateService(idx, 'description', e.target.value)}
                        placeholder="Ex: 6h de shooting, 300 photos retouchées"
                        className={inputCls}
                      />
                    </Field>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══ PARAMÈTRES ══ */}
        <section className="bg-white rounded-2xl border border-[#E8E0D0] p-6">
          <h2 className="font-semibold text-[#1A1A1A] mb-5 flex items-center gap-2">
            <span className="w-6 h-6 bg-[#F5F0E8] rounded-lg flex items-center justify-center text-xs">⚙️</span>
            Paramètres
          </h2>
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Taux de commission (%)">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={commissionTaux}
                  onChange={(e) => setCommissionTaux(Number(e.target.value))}
                  className={inputCls}
                />
              </Field>
              <Field label="Ordre d'affichage">
                <input
                  type="number"
                  min="0"
                  value={ordreAffichage}
                  onChange={(e) => setOrdreAffichage(Number(e.target.value))}
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="Statut">
              <select value={statut} onChange={(e) => setStatut(e.target.value)} className={inputCls}>
                <option value="actif">✅ Actif — visible sur l'annuaire</option>
                <option value="suspendu">⛔ Suspendu — masqué de l'annuaire</option>
              </select>
            </Field>
            <ToggleSwitch
              checked={certifie}
              onChange={setCertifie}
              label="🛡️ Certifié L&Lui Signature"
            />
            <ToggleSwitch
              checked={misEnAvant}
              onChange={setMisEnAvant}
              label="⭐ Mis en avant (apparaît en premier)"
            />
          </div>
        </section>

        {/* ══ BOUTONS D'ACTION ══ */}
        <div className="flex items-center gap-3 flex-wrap pb-10">
          <button
            onClick={handleSave}
            disabled={saving || uploadingPortfolio}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: '#C9A84C', color: '#1A1A1A' }}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>

          <button
            onClick={() => router.push('/admin/prestataires-services')}
            className="px-6 py-3 rounded-xl font-semibold text-sm border border-[#E8E0D0] text-[#1A1A1A]/60 hover:bg-[#F5F0E8] transition-colors"
          >
            Annuler
          </button>

          <div className="flex-1" />

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-red-500 border border-red-200 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} /> Supprimer ce prestataire
          </button>
        </div>
      </div>

      {/* ══ MODALE CONFIRMATION SUPPRESSION ══ */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-serif text-lg font-semibold text-[#1A1A1A] mb-2">Supprimer ce prestataire ?</h3>
            <p className="text-sm text-[#1A1A1A]/60 mb-6">
              Cette action est irréversible. <strong>{nom}</strong> sera supprimé de l&apos;annuaire.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                Oui, supprimer
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm border border-[#E8E0D0] text-[#1A1A1A]/60 hover:bg-[#F5F0E8] transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
