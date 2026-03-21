'use client'
// BLOC Saisie Hébergement — Enregistrement hébergement choisi sur site externe

import { useState, useEffect, useCallback } from 'react'

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

const STATUT_COLORS: Record<string, string> = {
  'En attente': '#C9A84C', 'Confirmé': '#7C9A7E', 'Payé': '#3B82F6'
}

interface Hebergement {
  nom: string; date_arrivee: string; date_depart: string
  montant: number; numero_reservation: string; statut: string
}

interface Props { uid: string }

export default function SaisieHebergement({ uid }: Props) {
  const [heberg, setHeberg] = useState<Hebergement | null>(null)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nom: '', date_arrivee: '', date_depart: '', montant: '', numero_reservation: '', statut: 'En attente' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const loadHeberg = useCallback(() => {
    fetch(`/api/portail/hebergement-choisi?uid=${uid}`).then(r => r.json())
      .then(d => { if (d.hebergement) setHeberg(d.hebergement) }).catch(() => {})
  }, [uid])

  useEffect(() => { loadHeberg() }, [loadHeberg])

  const openModal = () => {
    if (heberg) setForm({ nom: heberg.nom, date_arrivee: heberg.date_arrivee, date_depart: heberg.date_depart, montant: String(heberg.montant || ''), numero_reservation: heberg.numero_reservation ?? '', statut: heberg.statut })
    setModal(true)
  }

  const handleSave = async () => {
    if (!form.nom) return
    setSaving(true)
    try {
      await fetch('/api/portail/hebergement-choisi', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, ...form, montant: form.montant ? Number(form.montant) : 0 }),
      })
      showToast('✓ Hébergement enregistré')
      setModal(false)
      loadHeberg()
    } catch { showToast('Erreur lors de l\'enregistrement') }
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white text-xs px-4 py-2 rounded-xl shadow-lg">{toast}</div>}

      <div className="flex justify-between items-center mb-3">
        <p className="text-xs font-semibold text-[#888] uppercase tracking-wide">🏡 Mon Hébergement</p>
        <button onClick={openModal} className="px-3 py-1 rounded-xl text-xs font-semibold" style={{ background: heberg ? '#F5F0E8' : '#C9A84C', color: heberg ? '#1A1A1A' : '#1A1A1A' }}>
          {heberg ? 'Modifier' : '+ Ajouter'}
        </button>
      </div>

      {!heberg ? (
        <p className="text-sm text-[#AAA] text-center py-2">Aucun hébergement renseigné</p>
      ) : (
        <div className="space-y-1.5">
          <div className="flex justify-between items-start">
            <p className="text-sm font-semibold text-[#1A1A1A]">{heberg.nom}</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2" style={{ background: (STATUT_COLORS[heberg.statut] ?? '#888') + '22', color: STATUT_COLORS[heberg.statut] ?? '#888' }}>{heberg.statut}</span>
          </div>
          {(heberg.date_arrivee || heberg.date_depart) && (
            <p className="text-xs text-[#888]">{[heberg.date_arrivee, heberg.date_depart].filter(Boolean).join(' → ')}</p>
          )}
          {heberg.montant > 0 && <p className="text-sm font-semibold" style={{ color: '#C9A84C' }}>{formatFCFA(heberg.montant)}</p>}
          {heberg.numero_reservation && <p className="text-[10px] text-[#AAA]">Réf : {heberg.numero_reservation}</p>}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setModal(false)}>
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <p className="text-base font-semibold mb-4">{heberg ? 'Modifier' : 'Enregistrer'} mon hébergement</p>
            <div className="space-y-3">
              <input className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm" placeholder="Nom de l'hébergement *" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <input type="date" className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm" placeholder="Date arrivée" value={form.date_arrivee} onChange={e => setForm(f => ({ ...f, date_arrivee: e.target.value }))} />
                <input type="date" className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm" placeholder="Date départ" value={form.date_depart} onChange={e => setForm(f => ({ ...f, date_depart: e.target.value }))} />
              </div>
              <input type="number" className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm" placeholder="Montant réservation (FCFA)" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} />
              <input className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm" placeholder="N° de réservation (optionnel)" value={form.numero_reservation} onChange={e => setForm(f => ({ ...f, numero_reservation: e.target.value }))} />
              <select className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm bg-white" value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}>
                {['En attente', 'Confirmé', 'Payé'].map(s => <option key={s}>{s}</option>)}
              </select>
              <button onClick={handleSave} disabled={saving || !form.nom} className="w-full py-3 rounded-xl text-sm font-semibold text-[#1A1A1A] disabled:opacity-50" style={{ background: '#C9A84C' }}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
