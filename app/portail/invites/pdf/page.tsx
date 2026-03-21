'use client'
// app/portail/invites/pdf/page.tsx — Génération PDF invitations personnalisées

import { useState, useEffect } from 'react'
import { useClientIdentity } from '@/hooks/useClientIdentity'
import type { Guest } from '@/components/portail/GuestCard'

function getUid() {
  if (typeof document === 'undefined') return ''
  return decodeURIComponent(document.cookie.match(/portail_uid=([^;]+)/)?.[1] ?? '')
}

export default function InvitesPdfPage() {
  const identity = useClientIdentity()
  const [guests, setGuests] = useState<Guest[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    const uid = getUid()
    if (!uid) return
    fetch('/api/portail/invites').then(r => r.json()).then(d => setGuests(d.guests ?? []))
  }, [])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const selectAll = () => setSelected(new Set(guests.map(g => g.id)))
  const clearAll = () => setSelected(new Set())

  const handleGenerate = async (targetGuests: Guest[]) => {
    if (targetGuests.length === 0) return
    setGenerating(true)
    try {
      const { generateInvitationPDF } = await import('@/lib/generateInvitationPDF')
      const mariage = {
        noms_maries: identity.noms_maries,
        date_evenement: null as string | null,
        lieu: identity.lieu,
      }
      for (const g of targetGuests) {
        await generateInvitationPDF(
          { id: g.id, nom: g.nom, magic_link_slug: g.magic_link_slug },
          mariage
        )
        await new Promise(r => setTimeout(r, 300))
      }
      showToast(`✓ ${targetGuests.length} PDF généré${targetGuests.length > 1 ? 's' : ''}`)
    } catch (err) {
      showToast('Erreur lors de la génération PDF')
      console.error(err)
    } finally {
      setGenerating(false)
    }
  }

  const selectedGuests = guests.filter(g => selected.has(g.id))

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white text-sm px-4 py-2 rounded-xl shadow-lg">{toast}</div>}

      <div className="flex items-center gap-3 mb-5">
        <a href="/portail/invites" className="text-xs text-[#C9A84C]">← Retour aux invités</a>
        <div className="flex-1" />
      </div>

      <h1 className="font-serif italic text-2xl text-[#1A1A1A] mb-1">Invitations PDF</h1>
      <p className="text-sm text-[#888] mb-5">Générez des invitations personnalisées format A5 avec QR code</p>

      {/* Actions globales */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8] mb-4">
        <div className="flex flex-wrap gap-2 mb-3">
          <button onClick={selectAll} className="px-3 py-1.5 rounded-xl text-xs border border-[#E8E0D0] text-[#888] hover:border-[#C9A84C]">Tout sélectionner</button>
          <button onClick={clearAll} className="px-3 py-1.5 rounded-xl text-xs border border-[#E8E0D0] text-[#888]">Effacer</button>
          <button
            onClick={() => handleGenerate(selectedGuests)}
            disabled={generating || selectedGuests.length === 0}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white disabled:opacity-50"
            style={{ background: '#C9A84C' }}
          >
            {generating ? 'Génération…' : `Générer PDF (${selectedGuests.length})`}
          </button>
          <button
            onClick={() => handleGenerate(guests)}
            disabled={generating || guests.length === 0}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white disabled:opacity-50"
            style={{ background: '#1A1A1A' }}
          >
            {generating ? 'Génération…' : `Tous (${guests.length})`}
          </button>
        </div>
        <p className="text-[10px] text-[#AAA]">PDF A5 · Bordure dorée · QR code magic link · Téléchargement direct</p>
      </div>

      {/* Liste des invités */}
      {guests.length === 0 ? (
        <div className="text-center py-12 text-[#888] text-sm">
          <p className="text-3xl mb-3">📭</p>
          <p>Aucun invité enregistré.</p>
          <a href="/portail/invites" className="inline-block mt-3 text-xs text-[#C9A84C]">Ajouter des invités →</a>
        </div>
      ) : (
        <div className="space-y-2">
          {guests.map(g => (
            <div key={g.id} className="bg-white rounded-xl p-3 shadow-sm border border-[#F5F0E8] flex items-center gap-3">
              <input type="checkbox" checked={selected.has(g.id)} onChange={() => toggle(g.id)}
                className="w-4 h-4 accent-[#C9A84C] cursor-pointer" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1A1A1A] truncate">{g.nom}</p>
                <p className="text-[11px] text-[#888] truncate">{g.telephone}</p>
              </div>
              <button
                onClick={() => handleGenerate([g])}
                disabled={generating}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white disabled:opacity-50 flex-shrink-0"
                style={{ background: '#C9A84C' }}
              >
                PDF
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
