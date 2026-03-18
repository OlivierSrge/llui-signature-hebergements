'use client'

import { useState, useTransition } from 'react'
import { toast } from 'react-hot-toast'
import { Loader2, GripVertical, Plus, X, Check } from 'lucide-react'
import { ACCOMMODATION_TYPES, ACCOMMODATION_CATEGORIES, type AccommodationTypeInfo } from '@/lib/accommodationTypes'
import { saveAccommodationTypesSettings } from '@/actions/accommodation-types'

interface Props {
  initialTypes: AccommodationTypeInfo[]
}

function PrestigeSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i + 1)}
          className={i < value ? 'text-[#C9A84C]' : 'text-dark/20'}
          style={{ fontSize: 14 }}
        >
          ★
        </button>
      ))}
    </span>
  )
}

export default function AccommodationTypesManager({ initialTypes }: Props) {
  const [types, setTypes] = useState<AccommodationTypeInfo[]>(initialTypes)
  const [isPending, startTransition] = useTransition()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newType, setNewType] = useState<Partial<AccommodationTypeInfo>>({
    category: 'classique',
    prestige: 3,
    active: true,
  })

  const toggleActive = (id: string) => {
    setTypes((prev) => prev.map((t) => t.id === id ? { ...t, active: !t.active } : t))
  }

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveAccommodationTypesSettings(types)
      if (result.success) {
        toast.success('Types de logements mis à jour')
      } else {
        toast.error(result.error || 'Erreur lors de la sauvegarde')
      }
    })
  }

  const handleAddType = () => {
    if (!newType.id || !newType.label || !newType.icon || !newType.description) {
      toast.error('Remplissez tous les champs obligatoires')
      return
    }
    if (types.find((t) => t.id === newType.id)) {
      toast.error("Cet identifiant existe déjà")
      return
    }
    const catInfo = ACCOMMODATION_CATEGORIES.find((c) => c.id === newType.category)
    const full: AccommodationTypeInfo = {
      id: newType.id!,
      label: newType.label!,
      icon: newType.icon!,
      category: newType.category as AccommodationTypeInfo['category'],
      categoryLabel: catInfo?.label ?? '',
      categoryIcon: catInfo?.icon ?? '',
      prestige: newType.prestige as AccommodationTypeInfo['prestige'] ?? 3,
      description: newType.description!,
      tags: [],
      active: true,
    }
    setTypes((prev) => [...prev, full])
    setNewType({ category: 'classique', prestige: 3, active: true })
    setShowAddForm(false)
    toast.success('Type ajouté — pensez à sauvegarder')
  }

  const removeCustomType = (id: string) => {
    const isBuiltin = ACCOMMODATION_TYPES.find((t) => t.id === id)
    if (isBuiltin) {
      toast.error('Les types intégrés ne peuvent pas être supprimés, désactivez-les.')
      return
    }
    setTypes((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="space-y-4">
      {ACCOMMODATION_CATEGORIES.map((cat) => {
        const catTypes = types.filter((t) => t.category === cat.id)
        return (
          <div key={cat.id} className="border border-beige-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-beige-50 flex items-center gap-2">
              <span>{cat.icon}</span>
              <span className="text-sm font-semibold text-dark">{cat.label}</span>
              <span className="text-xs text-dark/40 ml-1">
                {catTypes.filter((t) => t.active).length}/{catTypes.length} actifs
              </span>
            </div>
            <div className="divide-y divide-beige-100">
              {catTypes.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <GripVertical size={14} className="text-dark/20 flex-shrink-0" />
                  <span className="text-xl flex-shrink-0">{t.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark">{t.label}</p>
                    <p className="text-xs text-dark/40 truncate">{t.description}</p>
                  </div>
                  {/* Toggle actif */}
                  <button
                    type="button"
                    onClick={() => toggleActive(t.id)}
                    className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${t.active ? 'bg-green-500' : 'bg-dark/20'}`}
                    title={t.active ? 'Désactiver' : 'Activer'}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${t.active ? 'translate-x-5' : 'translate-x-0.5'}`}
                    />
                  </button>
                  {/* Supprimer si type personnalisé */}
                  {!ACCOMMODATION_TYPES.find((bt) => bt.id === t.id) && (
                    <button
                      type="button"
                      onClick={() => removeCustomType(t.id)}
                      className="text-red-400 hover:text-red-600 flex-shrink-0"
                      title="Supprimer ce type personnalisé"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Types personnalisés hors catégorie */}
      {types.filter((t) => !['classique', 'evasion', 'unique'].includes(t.category)).length > 0 && (
        <div className="border border-beige-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-beige-50 text-sm font-semibold text-dark">Types personnalisés</div>
          <div className="divide-y divide-beige-100">
            {types.filter((t) => !['classique', 'evasion', 'unique'].includes(t.category)).map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xl">{t.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-dark">{t.label}</p>
                  <p className="text-xs text-dark/40">{t.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleActive(t.id)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${t.active ? 'bg-green-500' : 'bg-dark/20'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${t.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <button type="button" onClick={() => removeCustomType(t.id)} className="text-red-400 hover:text-red-600">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulaire ajout type personnalisé */}
      {showAddForm ? (
        <div className="border border-[#C9A84C]/40 rounded-xl p-4 space-y-3 bg-[#FDF6E3]">
          <p className="text-sm font-semibold text-dark">Nouveau type personnalisé</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Identifiant * (slug)</label>
              <input
                className="input-field text-sm font-mono"
                placeholder="mon_type_unique"
                value={newType.id ?? ''}
                onChange={(e) => setNewType((p) => ({ ...p, id: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
              />
            </div>
            <div>
              <label className="label text-xs">Icône *</label>
              <input
                className="input-field text-sm"
                placeholder="🏠"
                value={newType.icon ?? ''}
                onChange={(e) => setNewType((p) => ({ ...p, icon: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="label text-xs">Libellé *</label>
            <input
              className="input-field text-sm"
              placeholder="Nom du type affiché"
              value={newType.label ?? ''}
              onChange={(e) => setNewType((p) => ({ ...p, label: e.target.value }))}
            />
          </div>
          <div>
            <label className="label text-xs">Description *</label>
            <input
              className="input-field text-sm"
              placeholder="Courte description"
              value={newType.description ?? ''}
              onChange={(e) => setNewType((p) => ({ ...p, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Catégorie</label>
              <select
                className="input-field text-sm"
                value={newType.category}
                onChange={(e) => setNewType((p) => ({ ...p, category: e.target.value as AccommodationTypeInfo['category'] }))}
              >
                <option value="classique">Classiques de Prestige</option>
                <option value="evasion">Évasion & Caractère</option>
                <option value="unique">Expériences Uniques</option>
              </select>
            </div>
            <div>
              <label className="label text-xs">Prestige</label>
              <PrestigeSelect
                value={newType.prestige ?? 3}
                onChange={(v) => setNewType((p) => ({ ...p, prestige: v as AccommodationTypeInfo['prestige'] }))}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAddType}
              className="flex items-center gap-1.5 px-4 py-2 bg-dark text-white rounded-xl text-sm font-medium hover:bg-dark/90"
            >
              <Check size={14} /> Ajouter
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-beige-200 rounded-xl text-sm text-dark/50"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-[#C9A84C]/50 rounded-xl text-sm text-gold-700 hover:bg-gold-50 transition-colors w-full justify-center"
        >
          <Plus size={14} /> Ajouter un type personnalisé
        </button>
      )}

      {/* Bouton sauvegarder */}
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="btn-primary flex items-center gap-2"
      >
        {isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
        Sauvegarder les types
      </button>
    </div>
  )
}
