'use client'
// BLOC Saisie Boutique — Enregistrement manuel des achats sur la boutique externe

import { useState, useEffect, useCallback } from 'react'

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

const STATUT_COLORS: Record<string, string> = {
  Commandé: '#C9A84C', Payé: '#7C9A7E', Livré: '#888'
}
const CATEGORIES = ['Coordination', 'Décoration', 'Traiteur', 'Photo & Vidéo', 'Beauté', 'Cadeaux', 'Musique', 'Autre']

interface Achat {
  id: string; nom: string; montant: number; categorie: string; date_achat: string; statut: string
}

interface Props { uid: string }

export default function SaisieBoutique({ uid }: Props) {
  const [achats, setAchats] = useState<Achat[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nom: '', montant: '', categorie: 'Autre', date_achat: new Date().toISOString().slice(0, 10), statut: 'Commandé' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const loadAchats = useCallback(() => {
    fetch(`/api/portail/achats-boutique?uid=${uid}`).then(r => r.json()).then(d => setAchats(d.achats ?? [])).catch(() => {})
  }, [uid])

  useEffect(() => { loadAchats() }, [loadAchats])

  const handleSave = async () => {
    if (!form.nom || !form.montant) return
    setSaving(true)
    try {
      const res = await fetch('/api/portail/achats-boutique', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, ...form, montant: Number(form.montant) }),
      })
      const d = await res.json()
      showToast(`✓ Achat enregistré${d.rev ? ` · +${d.rev} REV gagnés !` : ''}`)
      setModal(false)
      setForm({ nom: '', montant: '', categorie: 'Autre', date_achat: new Date().toISOString().slice(0, 10), statut: 'Commandé' })
      loadAchats()
    } catch { showToast('Erreur lors de l\'enregistrement') }
    setSaving(false)
  }

  const totalBoutique = achats.reduce((s, a) => s + a.montant, 0)

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white text-xs px-4 py-2 rounded-xl shadow-lg">{toast}</div>}

      <div className="flex justify-between items-center mb-3">
        <p className="text-xs font-semibold text-[#888] uppercase tracking-wide">🛍️ Mes achats Boutique</p>
        <button onClick={() => setModal(true)} className="px-3 py-1 rounded-xl text-xs font-semibold text-white" style={{ background: '#1A1A1A' }}>+ Ajouter</button>
      </div>

      {achats.length === 0 ? (
        <p className="text-sm text-[#AAA] text-center py-2">Aucun achat enregistré</p>
      ) : (
        <div className="space-y-2 mb-3">
          {achats.slice(0, 3).map(a => (
            <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-[#F5F0E8] last:border-0">
              <div className="flex-1 min-w-0 mr-2">
                <p className="text-sm truncate">{a.nom}</p>
                <p className="text-[10px] text-[#888]">{a.date_achat}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm font-semibold">{formatFCFA(a.montant)}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: (STATUT_COLORS[a.statut] ?? '#888') + '22', color: STATUT_COLORS[a.statut] ?? '#888' }}>{a.statut}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {achats.length > 0 && (
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-[#888]">Total boutique : <strong className="text-[#1A1A1A]">{formatFCFA(totalBoutique)}</strong></span>
          <a href="/portail/mes-achats" className="text-xs text-[#C9A84C]">Voir tout →</a>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setModal(false)}>
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <p className="text-base font-semibold mb-4">Ajouter un achat boutique</p>
            <div className="space-y-3">
              <input className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm" placeholder="Référence / Nom du produit *" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
              <input type="number" className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm" placeholder="Montant payé (FCFA) *" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} />
              <select className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm bg-white" value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <input type="date" className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm" value={form.date_achat} onChange={e => setForm(f => ({ ...f, date_achat: e.target.value }))} />
              <select className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm bg-white" value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}>
                {['Commandé', 'Payé', 'Livré'].map(s => <option key={s}>{s}</option>)}
              </select>
              <button onClick={handleSave} disabled={saving || !form.nom || !form.montant} className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#C9A84C' }}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
