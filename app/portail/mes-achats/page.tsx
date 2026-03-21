'use client'
// app/portail/mes-achats/page.tsx — Boutique + Hébergement + impact cagnotte

import { useState, useEffect, useCallback } from 'react'
import { useClientIdentity } from '@/hooks/useClientIdentity'
import { getCodePromoUrl } from '@/lib/generatePromoCode'

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}
function getUid() {
  if (typeof document === 'undefined') return ''
  return decodeURIComponent(document.cookie.match(/portail_uid=([^;]+)/)?.[1] ?? '')
}

interface Achat { id: string; nom: string; montant: number; categorie: string; date_achat: string; statut: string }
interface Hebergement { nom: string; date_arrivee: string; date_depart: string; montant: number; numero_reservation: string; statut: string }

const STATUT_COLORS: Record<string, string> = { Commandé: '#C9A84C', Payé: '#7C9A7E', Livré: '#888', 'En attente': '#C9A84C', Confirmé: '#7C9A7E' }
const CATEGORIES = ['Coordination', 'Décoration', 'Traiteur', 'Photo & Vidéo', 'Beauté', 'Cadeaux', 'Musique', 'Autre']

export default function MesAchatsPage() {
  const [uid] = useState(() => getUid())
  const identity = useClientIdentity()
  const [achats, setAchats] = useState<Achat[]>([])
  const [heberg, setHeberg] = useState<Hebergement | null>(null)
  const [modal, setModal] = useState<'boutique' | 'heberg' | null>(null)
  const [form, setForm] = useState({ nom: '', montant: '', categorie: 'Autre', date_achat: new Date().toISOString().slice(0, 10), statut: 'Commandé' })
  const [hebergForm, setHebergForm] = useState({ nom: '', date_arrivee: '', date_depart: '', montant: '', numero_reservation: '', statut: 'En attente' })
  const [toast, setToast] = useState('')
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const loadAchats = useCallback(() => {
    if (!uid) return
    fetch(`/api/portail/achats-boutique?uid=${uid}`).then(r => r.json()).then(d => setAchats(d.achats ?? [])).catch(() => {})
    fetch(`/api/portail/hebergement-choisi?uid=${uid}`).then(r => r.json()).then(d => { if (d.hebergement) setHeberg(d.hebergement) }).catch(() => {})
  }, [uid])

  useEffect(() => { loadAchats() }, [loadAchats])

  const saveBoutique = async () => {
    if (!form.nom || !form.montant) return
    await fetch('/api/portail/achats-boutique', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid, ...form, montant: Number(form.montant) }) })
    showToast('✓ Achat enregistré'); setModal(null)
    setForm({ nom: '', montant: '', categorie: 'Autre', date_achat: new Date().toISOString().slice(0, 10), statut: 'Commandé' })
    loadAchats()
  }

  const saveHeberg = async () => {
    if (!hebergForm.nom) return
    await fetch('/api/portail/hebergement-choisi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid, ...hebergForm, montant: hebergForm.montant ? Number(hebergForm.montant) : 0 }) })
    showToast('✓ Hébergement enregistré'); setModal(null); loadAchats()
  }

  const totalBoutique = achats.reduce((s, a) => s + a.montant, 0)
  const totalHeberg = heberg?.montant ?? 0
  const totalGlobal = totalBoutique + totalHeberg
  const rev = Math.floor(totalGlobal / 10000)

  const boutiqueUrl = identity.code_promo ? getCodePromoUrl(identity.code_promo, uid, 'boutique') : 'https://letlui-signature.netlify.app'
  const hebergUrl = identity.code_promo ? getCodePromoUrl(identity.code_promo, uid, 'hebergement') : 'https://llui-signature-hebergements.vercel.app/hebergements'

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white text-xs px-4 py-2 rounded-xl shadow-lg">{toast}</div>}
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif italic text-2xl text-[#1A1A1A]">Mes Achats</h1>
          {identity.noms_maries && identity.noms_maries !== 'Mon mariage' && <p className="text-xs text-[#888]">Bonjour {identity.noms_maries}</p>}
        </div>
        <a href="/portail" className="text-xs text-[#C9A84C]">← Tableau de bord</a>
      </div>

      {/* Résumé 3 cards */}
      <div className="grid grid-cols-3 gap-3">
        {[{ label: 'Boutique', val: totalBoutique }, { label: 'Hébergement', val: totalHeberg }, { label: 'Total', val: totalGlobal }].map(c => (
          <div key={c.label} className="bg-white rounded-2xl p-3 shadow-sm border border-[#F5F0E8] text-center">
            <p className="font-bold text-sm" style={{ color: '#C9A84C' }}>{formatFCFA(c.val)}</p>
            <p className="text-[10px] text-[#888]">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Section boutique */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
        <div className="flex justify-between items-center mb-3">
          <p className="text-xs font-semibold text-[#888] uppercase tracking-wide">🛍️ Boutique L&Lui Signature</p>
          <div className="flex gap-2">
            <a href={boutiqueUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#C9A84C]">Ouvrir →</a>
            <button onClick={() => setModal('boutique')} className="text-xs text-white px-2 py-0.5 rounded-lg" style={{ background: '#1A1A1A' }}>+ Ajouter</button>
          </div>
        </div>
        {achats.length === 0 ? <p className="text-sm text-[#AAA] text-center py-2">Aucun achat enregistré</p> : (
          <div className="space-y-1.5">
            {achats.map(a => (
              <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-[#F5F0E8] last:border-0">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="text-sm truncate">{a.nom}</p>
                  <p className="text-[10px] text-[#888]">{a.categorie} · {a.date_achat}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-sm font-semibold">{formatFCFA(a.montant)}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: (STATUT_COLORS[a.statut] ?? '#888') + '22', color: STATUT_COLORS[a.statut] ?? '#888' }}>{a.statut}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section hébergement */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
        <div className="flex justify-between items-center mb-3">
          <p className="text-xs font-semibold text-[#888] uppercase tracking-wide">🏡 Sélection Hébergements</p>
          <div className="flex gap-2">
            <a href={hebergUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#C9A84C]">Voir →</a>
            <button onClick={() => { if (heberg) setHebergForm({ nom: heberg.nom, date_arrivee: heberg.date_arrivee, date_depart: heberg.date_depart, montant: String(heberg.montant ?? ''), numero_reservation: heberg.numero_reservation ?? '', statut: heberg.statut }); setModal('heberg') }} className="text-xs text-white px-2 py-0.5 rounded-lg" style={{ background: '#1A1A1A' }}>{heberg ? 'Modifier' : '+ Ajouter'}</button>
          </div>
        </div>
        {!heberg ? <p className="text-sm text-[#AAA] text-center py-2">Aucun hébergement renseigné</p> : (
          <div className="space-y-1">
            <p className="font-semibold text-sm">{heberg.nom}</p>
            {(heberg.date_arrivee || heberg.date_depart) && <p className="text-xs text-[#888]">{[heberg.date_arrivee, heberg.date_depart].filter(Boolean).join(' → ')}</p>}
            {heberg.montant > 0 && <p className="text-sm font-semibold" style={{ color: '#C9A84C' }}>{formatFCFA(heberg.montant)}</p>}
            {heberg.statut && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: (STATUT_COLORS[heberg.statut] ?? '#888') + '22', color: STATUT_COLORS[heberg.statut] ?? '#888' }}>{heberg.statut}</span>}
          </div>
        )}
      </div>

      {/* Impact cagnotte */}
      {totalGlobal > 0 && (
        <div className="rounded-2xl p-5 text-center" style={{ background: '#1A1A1A' }}>
          <p className="text-xs text-white/50 mb-1">Impact cagnotte mariage</p>
          <p className="text-2xl font-bold mb-0.5" style={{ color: '#C9A84C' }}>{rev} REV</p>
          <p className="text-sm text-white/70">soit {formatFCFA(rev * 1000)} de cagnotte estimée</p>
        </div>
      )}

      {/* Modal boutique */}
      {modal === 'boutique' && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setModal(null)}>
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <p className="text-base font-semibold mb-4">Ajouter un achat boutique</p>
            <div className="space-y-3">
              <input className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm" placeholder="Nom du produit *" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
              <input type="number" className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm" placeholder="Montant (FCFA) *" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} />
              <select className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm bg-white" value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
              <input type="date" className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm" value={form.date_achat} onChange={e => setForm(f => ({ ...f, date_achat: e.target.value }))} />
              <select className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm bg-white" value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}>{['Commandé', 'Payé', 'Livré'].map(s => <option key={s}>{s}</option>)}</select>
              <button onClick={saveBoutique} disabled={!form.nom || !form.montant} className="w-full py-3 rounded-xl text-sm font-semibold text-[#1A1A1A] disabled:opacity-50" style={{ background: '#C9A84C' }}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal hébergement */}
      {modal === 'heberg' && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setModal(null)}>
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <p className="text-base font-semibold mb-4">{heberg ? 'Modifier' : 'Enregistrer'} mon hébergement</p>
            <div className="space-y-3">
              <input className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm" placeholder="Nom de l'hébergement *" value={hebergForm.nom} onChange={e => setHebergForm(f => ({ ...f, nom: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <input type="date" className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm" value={hebergForm.date_arrivee} onChange={e => setHebergForm(f => ({ ...f, date_arrivee: e.target.value }))} />
                <input type="date" className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm" value={hebergForm.date_depart} onChange={e => setHebergForm(f => ({ ...f, date_depart: e.target.value }))} />
              </div>
              <input type="number" className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm" placeholder="Montant (FCFA)" value={hebergForm.montant} onChange={e => setHebergForm(f => ({ ...f, montant: e.target.value }))} />
              <input className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm" placeholder="N° réservation (optionnel)" value={hebergForm.numero_reservation} onChange={e => setHebergForm(f => ({ ...f, numero_reservation: e.target.value }))} />
              <select className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm bg-white" value={hebergForm.statut} onChange={e => setHebergForm(f => ({ ...f, statut: e.target.value }))}>{['En attente', 'Confirmé', 'Payé'].map(s => <option key={s}>{s}</option>)}</select>
              <button onClick={saveHeberg} disabled={!hebergForm.nom} className="w-full py-3 rounded-xl text-sm font-semibold text-[#1A1A1A] disabled:opacity-50" style={{ background: '#C9A84C' }}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
