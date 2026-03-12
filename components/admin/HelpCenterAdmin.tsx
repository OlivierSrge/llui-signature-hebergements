'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { Loader2, Save, ChevronDown } from 'lucide-react'
import { DEFAULT_HELP_CATEGORIES, type HelpCategory, type HelpItem } from '@/lib/helpCenterDefaults'
import { saveHelpCenterCategory } from '@/actions/help-center'

function mergeWithDefaults(stored: Record<string, any>): HelpCategory[] {
  return DEFAULT_HELP_CATEGORIES.map((cat) => {
    const s = stored[cat.id]
    if (!s) return cat
    return {
      ...cat,
      title: s.title ?? cat.title,
      items: cat.items.map((item) => {
        const si = s.items?.find((x: any) => x.id === item.id)
        return si ? { ...item, question: si.question ?? item.question, answer: si.answer ?? item.answer } : item
      }),
    }
  })
}

interface Props {
  initialData: Record<string, any>
}

export default function HelpCenterAdmin({ initialData }: Props) {
  const [categories, setCategories] = useState<HelpCategory[]>(mergeWithDefaults(initialData))
  const [openCat, setOpenCat] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  const updateItem = (catId: string, itemId: string, field: keyof HelpItem, value: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id !== catId ? cat : {
          ...cat,
          items: cat.items.map((item) =>
            item.id !== itemId ? item : { ...item, [field]: value }
          ),
        }
      )
    )
  }

  const handleSave = async (catId: string) => {
    setSaving(catId)
    const cat = categories.find((c) => c.id === catId)!
    const res = await saveHelpCenterCategory(catId, {
      title: cat.title,
      items: cat.items.map(({ id, question, answer }) => ({ id, question, answer })),
    })
    setSaving(null)
    if (res.success) toast.success('Catégorie sauvegardée')
    else toast.error(res.error || 'Erreur')
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-dark/50">
        Modifiez les questions et réponses visibles par les partenaires dans le Centre d&apos;aide.
        Les modifications sont enregistrées par catégorie.
      </p>

      {categories.map((cat) => (
        <div key={cat.id} className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setOpenCat(openCat === cat.id ? null : cat.id)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-beige-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{cat.emoji}</span>
              <span className="font-semibold text-dark">{cat.title}</span>
              <span className="text-xs text-dark/40">({cat.items.length} questions)</span>
            </div>
            <ChevronDown size={16} className={`text-dark/40 transition-transform ${openCat === cat.id ? 'rotate-180' : ''}`} />
          </button>

          {openCat === cat.id && (
            <div className="border-t border-beige-100 p-5 space-y-5">
              {cat.items.map((item) => (
                <div key={item.id} className="space-y-2 bg-beige-50 rounded-xl p-4">
                  <div>
                    <label className="label">Question</label>
                    <input
                      type="text"
                      value={item.question}
                      onChange={(e) => updateItem(cat.id, item.id, 'question', e.target.value)}
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="label">Réponse</label>
                    <textarea
                      value={item.answer}
                      onChange={(e) => updateItem(cat.id, item.id, 'answer', e.target.value)}
                      rows={4}
                      className="input-field text-sm resize-none"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => handleSave(cat.id)}
                disabled={saving === cat.id}
                className="flex items-center gap-2 px-4 py-2.5 bg-dark text-white rounded-xl text-sm font-medium hover:bg-dark/80 transition-colors disabled:opacity-50"
              >
                {saving === cat.id ? (
                  <><Loader2 size={14} className="animate-spin" /> Sauvegarde...</>
                ) : (
                  <><Save size={14} /> Sauvegarder cette catégorie</>
                )}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
