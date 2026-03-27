'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Loader2, Trash2, Save, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react'
import { createAccommodation, updateAccommodation, updateAccommodationInfo, updateAccommodationImages, deleteAccommodation, activateAccommodation } from '@/actions/accommodations'
import { getAmenityIcon } from '@/lib/amenity-icons'
import PhotoUploader from '@/components/admin/PhotoUploader'
import AccommodationTypeSelector from '@/components/admin/AccommodationTypeSelector'
import { resolveAccommodationTypeId } from '@/lib/accommodationTypes'
import type { Accommodation, Partner } from '@/lib/types'

// ─── Catalogue équipements ────────────────────────────────────────────────────
const AMENITY_CATALOG: { category: string; items: string[] }[] = [
  {
    category: 'Connectivité',
    items: [
      'WiFi haut débit',
      'Sans WiFi',
      'Câble Ethernet / RJ45',
      'Prises USB / Chargeurs',
    ],
  },
  {
    category: 'Divertissement',
    items: [
      'Télévision',
      'Smart TV / Netflix / Streaming',
      'Système audio / Enceintes Bluetooth',
      'Hi-Fi / Platine vinyle',
      'Console de jeux (PS5, Xbox…)',
      'Home cinéma / Projecteur',
    ],
  },
  {
    category: 'Cuisine & Boissons',
    items: [
      'Cuisine entièrement équipée',
      'Kitchenette / Coin cuisine',
      'Machine à café / Nespresso',
      'Chef à domicile / Service traiteur',
      'Plaque de cuisson / Four / Micro-ondes',
      'Eau potable / Fontaine filtrée',
      'Cave à vin / Cellier',
      'Barbecue / Plancha / Grill',
    ],
  },
  {
    category: 'Salle de bain & Linge',
    items: [
      'Baignoire / Balnéo',
      "Douche à l'italienne",
      'Lave-linge / Buanderie',
      'Grand lit (King/Queen size)',
      'Salon / Canapé confortable',
    ],
  },
  {
    category: 'Climat & Énergie',
    items: [
      'Climatisation',
      'Ventilateur / Brasseur d\'air',
      'Chauffage / Plancher chauffant',
      'Cheminée / Poêle à bois',
      'Sauna / Hammam / Spa / Jacuzzi',
      'Terrasse / Balcon / Patio',
      'Générateur / Panneaux solaires',
      'Eau chaude 24h/24',
    ],
  },
  {
    category: 'Sport & Bien-être',
    items: [
      'Salle de fitness / Musculation',
      'Piscine privée',
      'Vélo / VTT disponible',
      'Randonnée / Trek à proximité',
      'Tennis / Padel / Pétanque',
      'Pêche / Ponton',
      'Sports nautiques / Kayak / Paddle',
    ],
  },
  {
    category: 'Extérieur & Nature',
    items: [
      'Jardin / Espace vert',
      'Vue montagne / Massif',
      'Ski / Domaine skiable à proximité',
      'Glamping / Yourte / Tipi',
      'Éco-responsable / Zéro déchet',
      'Parasol / Transats / Bain de soleil',
      'Accès direct plage',
    ],
  },
  {
    category: 'Services & Accès',
    items: [
      'Parking privé / Garage',
      'Ascenseur',
      'Sécurité / Alarme / Gardien',
      'Coffre-fort',
      'Check-in autonome / Boîte à clés',
      'Accessible PMR / Mobilité réduite',
      'Enfants bienvenus (lit bébé, chaise haute)',
      'Animaux acceptés',
    ],
  },
  {
    category: 'Travail',
    items: ['Bureau / Espace de travail / Télétravail'],
  },
  {
    category: 'Vues & Ambiance',
    items: [
      'Vue mer / Océan',
      'Vue coucher de soleil / Panoramique',
      'Service de ménage inclus',
      'Conciergerie / Service premium',
      'Vue dégagée / Imprenable',
    ],
  },
]

const ALL_CATALOG_ITEMS = AMENITY_CATALOG.flatMap((c) => c.items)

// ─── Composant sélecteur ──────────────────────────────────────────────────────
function AmenitiesPicker({
  selected,
  onChange,
}: {
  selected: Set<string>
  onChange: (next: Set<string>) => void
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toggle = (item: string) => {
    const next = new Set(selected)
    next.has(item) ? next.delete(item) : next.add(item)
    onChange(next)
  }

  const toggleCategory = (cat: string, items: string[]) => {
    const allChecked = items.every((i) => selected.has(i))
    const next = new Set(selected)
    if (allChecked) items.forEach((i) => next.delete(i))
    else items.forEach((i) => next.add(i))
    onChange(next)
  }

  const toggleCollapse = (cat: string) =>
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }))

  return (
    <div className="space-y-3">
      {AMENITY_CATALOG.map(({ category, items }) => {
        const checkedCount = items.filter((i) => selected.has(i)).length
        const allChecked = checkedCount === items.length
        const isCollapsed = collapsed[category]

        return (
          <div key={category} className="border border-beige-200 rounded-xl overflow-hidden">
            {/* Header catégorie */}
            <div className="flex items-center gap-3 px-4 py-3 bg-beige-50">
              <input
                type="checkbox"
                checked={allChecked}
                ref={(el) => { if (el) el.indeterminate = checkedCount > 0 && !allChecked }}
                onChange={() => toggleCategory(category, items)}
                className="w-4 h-4 rounded border-beige-300 text-gold-500 focus:ring-gold-400 flex-shrink-0"
              />
              <button
                type="button"
                onClick={() => toggleCollapse(category)}
                className="flex-1 flex items-center justify-between text-left"
              >
                <span className="text-sm font-semibold text-dark">{category}</span>
                <span className="flex items-center gap-2">
                  {checkedCount > 0 && (
                    <span className="text-xs bg-gold-100 text-gold-700 px-2 py-0.5 rounded-full font-medium">
                      {checkedCount}/{items.length}
                    </span>
                  )}
                  {isCollapsed
                    ? <ChevronDown size={14} className="text-dark/40" />
                    : <ChevronUp size={14} className="text-dark/40" />}
                </span>
              </button>
            </div>

            {/* Items */}
            {!isCollapsed && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 px-4 py-2">
                {items.map((item) => {
                  const Icon = getAmenityIcon(item)
                  return (
                    <label
                      key={item}
                      className="flex items-center gap-3 py-2.5 cursor-pointer hover:text-dark group"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(item)}
                        onChange={() => toggle(item)}
                        className="w-4 h-4 rounded border-beige-300 text-gold-500 focus:ring-gold-400 flex-shrink-0"
                      />
                      <Icon size={15} className="text-dark/40 group-hover:text-dark/70 flex-shrink-0 transition-colors" strokeWidth={1.5} />
                      <span className="text-sm text-dark/70 group-hover:text-dark transition-colors">
                        {item}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Formulaire principal ─────────────────────────────────────────────────────
interface Props {
  accommodation?: Accommodation
  partners: Partner[]
}

export default function AccommodationForm({ accommodation, partners }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isSavingPhotos, setIsSavingPhotos] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(accommodation?.status || 'active')
  const isEdit = !!accommodation

  const [imageUrls, setImageUrls] = useState<string[]>(accommodation?.images || [])
  const [selectedType, setSelectedType] = useState<string>(
    resolveAccommodationTypeId(accommodation?.type) ?? accommodation?.type ?? 'villa_exception'
  )

  // Séparer les équipements existants entre catalogue et personnalisés
  const existingAmenities = accommodation?.amenities ?? []
  const [selectedAmenities, setSelectedAmenities] = useState<Set<string>>(
    () => new Set(existingAmenities.filter((a) => ALL_CATALOG_ITEMS.includes(a)))
  )
  const [customAmenities, setCustomAmenities] = useState<string>(
    existingAmenities.filter((a) => !ALL_CATALOG_ITEMS.includes(a)).join('\n')
  )

  // Soumission du formulaire d'infos (ne touche pas aux images)
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    formData.set('type', selectedType)

    const custom = customAmenities.split('\n').map((s) => s.trim()).filter(Boolean)
    const all = Array.from(selectedAmenities).concat(custom)
    formData.set('amenities', all.join('\n'))

    startTransition(async () => {
      let result
      if (isEdit) {
        // Sauvegarder uniquement les infos, sans toucher aux images
        result = await updateAccommodationInfo(accommodation.id, formData)
      } else {
        // Création : inclure les images dans le formulaire complet
        formData.set('images', imageUrls.join('\n'))
        result = await createAccommodation(formData)
      }

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(isEdit ? 'Informations mises à jour' : 'Hébergement créé')
      if (!isEdit) {
        router.push('/admin/hebergements')
        router.refresh()
      }
    })
  }

  // Sauvegarde séparée des photos (ne touche pas aux infos)
  const handleSavePhotos = async () => {
    if (!isEdit || !accommodation) return
    setIsSavingPhotos(true)
    const result = await updateAccommodationImages(accommodation.id, imageUrls)
    setIsSavingPhotos(false)
    if (!result.success) {
      toast.error(result.error)
    } else {
      toast.success('Photos mises à jour')
    }
  }

  const handleToggleStatus = async () => {
    if (!accommodation) return
    const isInactive = currentStatus === 'inactive'

    setDeleting(true)
    const result = isInactive
      ? await activateAccommodation(accommodation.id)
      : await deleteAccommodation(accommodation.id)
    if (!result.success) {
      toast.error(result.error)
    } else {
      const newStatus = isInactive ? 'active' : 'inactive'
      toast.success(isInactive ? 'Hébergement activé' : 'Hébergement désactivé')
      setCurrentStatus(newStatus)
      router.refresh()
    }
    setDeleting(false)
  }

  const Field = ({
    label, name, type = 'text', required, placeholder, defaultValue, rows,
  }: {
    label: string; name: string; type?: string; required?: boolean
    placeholder?: string; defaultValue?: string | number; rows?: number
  }) => (
    <div>
      <label htmlFor={name} className="label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {rows ? (
        <textarea
          id={name} name={name} rows={rows} required={required}
          defaultValue={defaultValue as string}
          placeholder={placeholder}
          className="input-field resize-none"
        />
      ) : (
        <input
          id={name} name={name} type={type} required={required}
          defaultValue={defaultValue as string}
          placeholder={placeholder}
          className="input-field"
          step={type === 'number' ? 'any' : undefined}
        />
      )}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-5">
        <h2 className="font-semibold text-dark border-b border-beige-200 pb-3">
          Informations générales
        </h2>

        {/* Partner */}
        <div>
          <label className="label">Partenaire <span className="text-red-500">*</span></label>
          <select name="partner_id" required defaultValue={accommodation?.partner_id || ''} className="input-field">
            <option value="">Sélectionner un partenaire</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Type — sélecteur visuel */}
        <div>
          <label className="label">Type d'hébergement <span className="text-red-500">*</span></label>
          <input type="hidden" name="type" value={selectedType} />
          <AccommodationTypeSelector value={selectedType} onChange={setSelectedType} />
        </div>

        <Field label="Nom de l'hébergement" name="name" required defaultValue={accommodation?.name} placeholder="Villa Royale M'Bekaa" />
        <Field label="Description courte" name="short_description" rows={2} defaultValue={accommodation?.short_description || ''} placeholder="Résumé accrocheur (200 caractères max)" />
        <Field label="Description complète" name="description" rows={5} defaultValue={accommodation?.description || ''} placeholder="Description détaillée, ambiance, prestations..." />
        <Field label="Localisation" name="location" defaultValue={accommodation?.location || ''} placeholder="Route de Londji, Kribi" />
      </div>

      <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-4">
        <h2 className="font-semibold text-dark border-b border-beige-200 pb-3">
          Capacité & tarification
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field label="Capacité (pers.)" name="capacity" type="number" required defaultValue={accommodation?.capacity || 2} />
          <Field label="Chambres" name="bedrooms" type="number" required defaultValue={accommodation?.bedrooms || 1} />
          <Field label="Salles de bain" name="bathrooms" type="number" required defaultValue={accommodation?.bathrooms || 1} />
          <Field label="Prix/nuit (FCFA)" name="price_per_night" type="number" required defaultValue={accommodation?.price_per_night || ''} placeholder="150000" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Taux de commission L&Lui (%)" name="commission_rate" type="number" required defaultValue={accommodation?.commission_rate || 10} placeholder="10" />
          {isEdit && (
            <div>
              <label className="label">Statut</label>
              <select name="status" defaultValue={accommodation?.status || 'active'} className="input-field">
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="featured"
            name="featured"
            value="true"
            defaultChecked={accommodation?.featured}
            className="w-4 h-4 rounded border-beige-300 text-gold-500 focus:ring-gold-400"
          />
          <label htmlFor="featured" className="text-sm text-dark/70">
            ⭐ Mettre en avant (coup de cœur)
          </label>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-4">
        <h2 className="font-semibold text-dark border-b border-beige-200 pb-3">
          Photos (7 max)
        </h2>
        <PhotoUploader
          initialUrls={accommodation?.images || []}
          onChange={setImageUrls}
          maxPhotos={7}
        />
        {isEdit && (
          <button
            type="button"
            onClick={handleSavePhotos}
            disabled={isSavingPhotos}
            className="flex items-center gap-2 px-4 py-2.5 bg-beige-100 text-dark border border-beige-300 rounded-xl text-sm font-medium hover:bg-beige-200 transition-colors disabled:opacity-50"
          >
            {isSavingPhotos ? (
              <><Loader2 size={14} className="animate-spin" /> Enregistrement...</>
            ) : (
              <><Save size={14} /> Sauvegarder les photos</>
            )}
          </button>
        )}
        {!isEdit && <input type="hidden" name="images" value={imageUrls.join('\n')} />}
      </div>

      <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-beige-200 pb-3">
          <h2 className="font-semibold text-dark">Équipements</h2>
          {selectedAmenities.size > 0 && (
            <span className="text-xs bg-gold-100 text-gold-700 px-2.5 py-1 rounded-full font-medium">
              {selectedAmenities.size} sélectionné{selectedAmenities.size > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <AmenitiesPicker selected={selectedAmenities} onChange={setSelectedAmenities} />

        <div>
          <label className="label">Équipements personnalisés (un par ligne)</label>
          <textarea
            rows={3}
            value={customAmenities}
            onChange={(e) => setCustomAmenities(e.target.value)}
            placeholder="Autres équipements non listés ci-dessus…"
            className="input-field resize-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-4">
        <h2 className="font-semibold text-dark border-b border-beige-200 pb-3">Notes & avis</h2>
        <p className="text-xs text-dark/40">Renseignez les notes pour afficher la section avis. Laisser vide pour masquer.</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Note globale (/5)" name="ratings_overall" type="number" defaultValue={accommodation?.ratings?.overall ?? ''} placeholder="4.9" />
          <Field label="Nombre d'avis" name="ratings_count" type="number" defaultValue={accommodation?.ratings?.count ?? ''} placeholder="42" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Propreté" name="ratings_cleanliness" type="number" defaultValue={accommodation?.ratings?.cleanliness ?? ''} placeholder="5.0" />
          <Field label="Exactitude" name="ratings_accuracy" type="number" defaultValue={accommodation?.ratings?.accuracy ?? ''} placeholder="5.0" />
          <Field label="Arrivée" name="ratings_checkin" type="number" defaultValue={accommodation?.ratings?.checkin ?? ''} placeholder="5.0" />
          <Field label="Communication" name="ratings_communication" type="number" defaultValue={accommodation?.ratings?.communication ?? ''} placeholder="5.0" />
          <Field label="Emplacement" name="ratings_location" type="number" defaultValue={accommodation?.ratings?.location ?? ''} placeholder="4.9" />
          <Field label="Rapport qualité-prix" name="ratings_value" type="number" defaultValue={accommodation?.ratings?.value ?? ''} placeholder="5.0" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="btn-primary"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Enregistrement...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save size={16} />
                {isEdit ? 'Sauvegarder les infos' : "Créer l'hébergement"}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary"
          >
            Annuler
          </button>
        </div>

        {isEdit && (
          <button
            type="button"
            onClick={handleToggleStatus}
            disabled={deleting}
            className={`flex items-center gap-2 px-4 py-3 text-sm rounded-lg transition-colors disabled:opacity-50 border ${
              currentStatus === 'inactive'
                ? 'text-green-600 border-green-200 hover:bg-green-50'
                : 'text-red-500 border-red-200 hover:bg-red-50'
            }`}
          >
            {deleting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : currentStatus === 'inactive' ? (
              <CheckCircle size={14} />
            ) : (
              <Trash2 size={14} />
            )}
            {currentStatus === 'inactive' ? 'Activer' : 'Désactiver'}
          </button>
        )}
      </div>
    </form>
  )
}
