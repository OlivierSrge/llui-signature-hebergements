'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Loader2, Save, X, Calendar } from 'lucide-react'
import { createEvenement, updateEvenement, deleteEvenement, toggleEvenementActif } from '@/actions/evenements'

const CATEGORIES = [
  { id: 'nature', label: '🌿 Nature' },
  { id: 'gastronomie', label: '🍽 Gastronomie' },
  { id: 'culture', label: '🎭 Culture' },
  { id: 'sport', label: '⚽ Sport' },
  { id: 'wellness', label: '🧘 Bien-être' },
  { id: 'nightlife', label: '🎵 Soirée' },
]

interface Evenement {
  id: string
  titre: string
  description?: string
  categorie: string
  date_debut: string
  date_fin?: string
  heure?: string
  lieu?: string
  prix?: number
  image_url?: string
  hebergements_associes?: string[]
  actif: boolean
  recurrent?: boolean
  jour_recurrence?: string
}

interface Hebergement { id: string; name: string }

interface Props {
  evenements: Evenement[]
  hebergements: Hebergement[]
}

const EMPTY_FORM = {
  titre: '', description: '', categorie: 'nature',
  date_debut: '', date_fin: '', heure: '', lieu: '',
  prix: '', image_url: '', hebergements_associes: [] as string[],
  recurrent: false, jour_recurrence: '',
}

export default function CalendrierClient({ evenements, hebergements }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (ev: Evenement) => {
    setEditingId(ev.id)
    setForm({
      titre: ev.titre ?? '',
      description: ev.description ?? '',
      categorie: ev.categorie ?? 'nature',
      date_debut: ev.date_debut ? ev.date_debut.slice(0, 16) : '',
      date_fin: ev.date_fin ? ev.date_fin.slice(0, 16) : '',
      heure: ev.heure ?? '',
      lieu: ev.lieu ?? '',
      prix: ev.prix !== undefined ? String(ev.prix) : '',
      image_url: ev.image_url ?? '',
      hebergements_associes: ev.hebergements_associes ?? [],
      recurrent: ev.recurrent ?? false,
      jour_recurrence: ev.jour_recurrence ?? '',
    })
    setShowForm(true)
  }

  const toggleH = (id: string) => {
    setForm((f) => ({
      ...f,
      hebergements_associes: f.hebergements_associes.includes(id)
        ? f.hebergements_associes.filter((x) => x !== id)
        : [...f.hebergements_associes, id],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.titre.trim() || !form.date_debut) {
      toast.error('Titre et date de début requis')
      return
    }
    startTransition(async () => {
      const payload = {
        ...form,
        prix: form.prix !== '' ? Number(form.prix) : 0,
      }
      const result = editingId
        ? await updateEvenement(editingId, payload)
        : await createEvenement(payload)

      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(editingId ? 'Événement mis à jour' : 'Événement créé')
      setShowForm(false)
      router.refresh()
    })
  }

  const handleDelete = (id: string, titre: string) => {
    if (!confirm(`Supprimer "${titre}" ?`)) return
    startTransition(async () => {
      const result = await deleteEvenement(id)
      if (!result.success) toast.error(result.error)
      else { toast.success('Événement supprimé'); router.refresh() }
    })
  }

  const handleToggle = (id: string, actif: boolean) => {
    startTransition(async () => {
      const result = await toggleEvenementActif(id, !actif)
      if (!result.success) toast.error(result.error)
      else { toast.success(actif ? 'Événement désactivé' : 'Événement activé'); router.refresh() }
    })
  }

  const Field = ({ label, name, type = 'text', required, placeholder, value, onChange, rows }: any) => (
    <div>
      <label className="label">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
      {rows ? (
        <textarea rows={rows} value={value} onChange={onChange} placeholder={placeholder}
          className="input-field resize-none" required={required} />
      ) : (
        <input type={type} value={value} onChange={onChange} placeholder={placeholder}
          className="input-field" required={required} step={type === 'number' ? 'any' : undefined} />
      )}
    </div>
  )

  return (
    <div className="p-6 sm:p-8 mt-14 lg:mt-0">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-100 flex items-center justify-center">
            <Calendar size={18} className="text-gold-600" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-semibold text-dark">Calendrier Kribi</h1>
            <p className="text-dark/50 text-sm">{evenements.length} événement{evenements.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> Créer un événement
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-beige-200 p-6 mb-6 space-y-5">
          <div className="flex items-center justify-between border-b border-beige-200 pb-3">
            <h2 className="font-semibold text-dark">{editingId ? "Modifier l'événement" : 'Créer un événement'}</h2>
            <button onClick={() => setShowForm(false)} className="text-dark/40 hover:text-dark">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Titre" required value={form.titre} onChange={(e: any) => setForm((f) => ({ ...f, titre: e.target.value }))} placeholder="Excursion pirogue Lobé" />
              <div>
                <label className="label">Catégorie <span className="text-red-500">*</span></label>
                <select value={form.categorie} onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value }))} className="input-field">
                  {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <Field label="Description" value={form.description} onChange={(e: any) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="Description de l'événement" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Date début" type="datetime-local" required value={form.date_debut} onChange={(e: any) => setForm((f) => ({ ...f, date_debut: e.target.value }))} />
              <Field label="Date fin" type="datetime-local" value={form.date_fin} onChange={(e: any) => setForm((f) => ({ ...f, date_fin: e.target.value }))} />
              <Field label="Heure affichée" value={form.heure} onChange={(e: any) => setForm((f) => ({ ...f, heure: e.target.value }))} placeholder="9h00 – 12h00" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Lieu" value={form.lieu} onChange={(e: any) => setForm((f) => ({ ...f, lieu: e.target.value }))} placeholder="Plage de Kribi" />
              <Field label="Prix (0 = Gratuit)" type="number" value={form.prix} onChange={(e: any) => setForm((f) => ({ ...f, prix: e.target.value }))} placeholder="0" />
            </div>
            <Field label="URL image" value={form.image_url} onChange={(e: any) => setForm((f) => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />

            {/* Hébergements associés */}
            {hebergements.length > 0 && (
              <div>
                <label className="label">Hébergements associés</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  {hebergements.map((h) => (
                    <label key={h.id} className="flex items-center gap-2 p-2.5 rounded-xl border border-beige-200 cursor-pointer hover:bg-beige-50">
                      <input
                        type="checkbox"
                        checked={form.hebergements_associes.includes(h.id)}
                        onChange={() => toggleH(h.id)}
                        className="w-4 h-4 rounded border-beige-300 text-gold-500 focus:ring-gold-400"
                      />
                      <span className="text-sm text-dark/80 truncate">{h.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Récurrence */}
            <div className="flex items-center gap-3">
              <input type="checkbox" id="recurrent" checked={form.recurrent}
                onChange={(e) => setForm((f) => ({ ...f, recurrent: e.target.checked }))}
                className="w-4 h-4 rounded border-beige-300 text-gold-500 focus:ring-gold-400" />
              <label htmlFor="recurrent" className="text-sm text-dark/70">Événement récurrent</label>
              {form.recurrent && (
                <select value={form.jour_recurrence}
                  onChange={(e) => setForm((f) => ({ ...f, jour_recurrence: e.target.value }))}
                  className="input-field ml-2 py-1.5 text-sm">
                  <option value="">Choisir</option>
                  <option value="samedi">Chaque samedi</option>
                  <option value="dimanche">Chaque dimanche</option>
                  <option value="weekend">Chaque weekend</option>
                </select>
              )}
            </div>

            <div className="flex gap-3 pt-2 border-t border-beige-200">
              <button type="submit" disabled={isPending} className="btn-primary flex items-center gap-2">
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {editingId ? 'Modifier' : 'Créer'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des événements */}
      <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
        {evenements.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🗓</div>
            <h3 className="font-serif text-xl text-dark mb-2">Aucun événement</h3>
            <p className="text-dark/50 text-sm mb-4">Créez votre premier événement Kribi</p>
            <button onClick={openCreate} className="btn-primary">Créer un événement</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-beige-200 bg-beige-50">
                <th className="text-left px-4 py-3 font-semibold text-dark/70 text-xs uppercase tracking-wider">Événement</th>
                <th className="text-left px-4 py-3 font-semibold text-dark/70 text-xs uppercase tracking-wider hidden sm:table-cell">Catégorie</th>
                <th className="text-left px-4 py-3 font-semibold text-dark/70 text-xs uppercase tracking-wider hidden md:table-cell">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-dark/70 text-xs uppercase tracking-wider hidden lg:table-cell">Lieu</th>
                <th className="text-center px-4 py-3 font-semibold text-dark/70 text-xs uppercase tracking-wider">Statut</th>
                <th className="text-right px-4 py-3 font-semibold text-dark/70 text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-beige-100">
              {evenements.map((ev) => (
                <tr key={ev.id} className="hover:bg-beige-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-dark leading-tight">{ev.titre}</p>
                    {ev.recurrent && (
                      <span className="text-xs text-gold-600 mt-0.5 block">↻ Récurrent</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs bg-beige-100 text-dark/70 px-2 py-1 rounded-full capitalize">{ev.categorie}</span>
                  </td>
                  <td className="px-4 py-3 text-dark/60 hidden md:table-cell">
                    {ev.date_debut ? new Date(ev.date_debut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-dark/60 hidden lg:table-cell text-xs">{ev.lieu || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleToggle(ev.id, ev.actif)} disabled={isPending}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${ev.actif ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      {ev.actif ? <><ToggleRight size={12} /> Actif</> : <><ToggleLeft size={12} /> Inactif</>}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(ev)} className="p-1.5 rounded-lg text-dark/40 hover:text-dark hover:bg-beige-100 transition-colors" title="Modifier">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(ev.id, ev.titre)} disabled={isPending}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Supprimer">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
