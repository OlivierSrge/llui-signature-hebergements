'use client'

import { useState } from 'react'
import { PlusCircle, ClipboardList } from 'lucide-react'
import type { DevisRecord } from '@/actions/devis'
import DevisWizard from '@/components/admin/DevisWizard'
import DevisHistorique from '@/components/admin/DevisHistorique'

interface Props {
  devisList: DevisRecord[]
}

export default function DevisAdminTabs({ devisList: initialList }: Props) {
  const [tab, setTab] = useState<'nouveau' | 'historique'>('nouveau')
  const [list, setList] = useState<DevisRecord[]>(initialList)
  const [editingId, setEditingId] = useState<string | null>(null)

  const tabs = [
    { key: 'nouveau', label: 'Nouveau devis', icon: PlusCircle },
    { key: 'historique', label: `Mes devis (${list.length})`, icon: ClipboardList },
  ] as const

  return (
    <div className="space-y-6">
      {/* Onglets */}
      <div className="flex gap-2 border-b border-beige-200">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all -mb-px ${
              tab === key
                ? 'border-gold-500 text-gold-600'
                : 'border-transparent text-dark/50 hover:text-dark hover:border-beige-300'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {tab === 'nouveau' && (
        <DevisWizard
          key={editingId || 'new'}
          onSaved={(id) => {
            // Refresh list is handled by revalidatePath server-side
            setEditingId(null)
          }}
        />
      )}

      {tab === 'historique' && (
        <DevisHistorique
          devisList={list}
          onEdit={(id) => {
            setEditingId(id)
            setTab('nouveau')
          }}
          onListChange={setList}
        />
      )}
    </div>
  )
}
