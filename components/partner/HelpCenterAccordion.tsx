'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, MessageCircle } from 'lucide-react'
import { DEFAULT_HELP_CATEGORIES, type HelpCategory } from '@/lib/helpCenterDefaults'

interface Props {
  helpCenter: Record<string, any>
}

function mergeWithDefaults(helpCenter: Record<string, any>): HelpCategory[] {
  return DEFAULT_HELP_CATEGORIES.map((cat) => {
    const stored = helpCenter[cat.id]
    if (!stored) return cat
    return {
      ...cat,
      title: stored.title ?? cat.title,
      items: cat.items.map((item) => {
        const si = stored.items?.find((s: any) => s.id === item.id)
        return si ? { ...item, question: si.question ?? item.question, answer: si.answer ?? item.answer } : item
      }),
    }
  })
}

export default function HelpCenterAccordion({ helpCenter }: Props) {
  const [openCat, setOpenCat] = useState<string | null>(null)
  const [openItem, setOpenItem] = useState<string | null>(null)

  const categories = mergeWithDefaults(helpCenter)

  const toggleCat = (id: string) => {
    setOpenCat(openCat === id ? null : id)
    setOpenItem(null)
  }
  const toggleItem = (id: string) => setOpenItem(openItem === id ? null : id)

  return (
    <div className="space-y-3">
      {categories.map((cat) => (
        <div key={cat.id} className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
          {/* En-tête catégorie */}
          <button
            type="button"
            onClick={() => toggleCat(cat.id)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-beige-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{cat.emoji}</span>
              <span className="font-semibold text-dark">{cat.title}</span>
              <span className="text-xs text-dark/40 bg-beige-100 px-2 py-0.5 rounded-full">
                {cat.items.length} question{cat.items.length > 1 ? 's' : ''}
              </span>
            </div>
            <ChevronDown
              size={18}
              className={`text-dark/40 flex-shrink-0 transition-transform ${openCat === cat.id ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Items de la catégorie */}
          {openCat === cat.id && (
            <div className="border-t border-beige-100">
              <div className="divide-y divide-beige-50">
                {cat.items.map((item) => (
                  <div key={item.id}>
                    <button
                      type="button"
                      onClick={() => toggleItem(`${cat.id}-${item.id}`)}
                      className="w-full flex items-center justify-between px-6 py-3.5 text-left hover:bg-beige-50/50 transition-colors"
                    >
                      <span className="text-sm text-dark/80 font-medium pr-4">{item.question}</span>
                      <ChevronDown
                        size={15}
                        className={`text-dark/30 flex-shrink-0 transition-transform ${openItem === `${cat.id}-${item.id}` ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {openItem === `${cat.id}-${item.id}` && (
                      <div className="px-6 pb-4">
                        <p className="text-sm text-dark/60 leading-relaxed">{item.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Bouton "Je n'ai pas trouvé" */}
              <div className="px-5 py-4 bg-beige-50 border-t border-beige-100">
                <p className="text-xs text-dark/40 mb-2">Vous n&apos;avez pas trouvé votre réponse ?</p>
                <Link
                  href="/partenaire/messages"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-dark text-white rounded-xl text-xs font-medium hover:bg-dark/80 transition-colors"
                >
                  <MessageCircle size={12} /> Contacter L&amp;Lui
                </Link>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
