'use client'
// app/portail/escales/page.tsx — Hébergements externes + saisie manuelle réservation

import { useState, useEffect, useCallback } from 'react'
import { useClientIdentity } from '@/hooks/useClientIdentity'
import { getCodePromoUrl } from '@/lib/generatePromoCode'

function getUid() {
  if (typeof document === 'undefined') return ''
  return decodeURIComponent(document.cookie.match(/portail_uid=([^;]+)/)?.[1] ?? '')
}
function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}
function diffNuits(d1: string, d2: string): number {
  if (!d1 || !d2) return 0
  const diff = new Date(d2).getTime() - new Date(d1).getTime()
  return Math.max(0, Math.round(diff / 86400000))
}

const STATUTS = ['En attente', 'Confirmé', 'Acompte versé', 'Soldé']
const STATUT_COLORS: Record<string, string> = { 'En attente': '#C9A84C', Confirmé: '#7C9A7E', 'Acompte versé': '#3B82F6', Soldé: '#888' }

interface Hebergement {
  nom: string; date_arrivee: string; date_depart: string
  montant: number; numero_reservation: string; statut: string
}

export default function EscalesPage() {
  const [uid] = useState(() => getUid())
  const identity = useClientIdentity()
  const [heberg, setHeberg] = useState<Hebergement | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ nom: '', date_arrivee: '', date_depart: '', montant: '', numero_reservation: '', statut: 'En attente' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const loadHeberg = useCallback(() => {
    if (!uid) return
    fetch(`/api/portail/hebergement-choisi?uid=${uid}`).then(r => r.json())
      .then(d => { if (d.hebergement) setHeberg(d.hebergement) }).catch(() => {})
  }, [uid])

  useEffect(() => { loadHeberg() }, [loadHeberg])

  const hebergUrl = identity.uid && identity.code_promo
    ? getCodePromoUrl(identity.code_promo, identity.uid, 'hebergement')
    : `https://llui-signature-hebergements.vercel.app/hebergements?ref=${uid}`

  const openEdit = () => {
    if (heberg) setForm({ nom: heberg.nom, date_arrivee: heberg.date_arrivee, date_depart: heberg.date_depart, montant: String(heberg.montant || ''), numero_reservation: heberg.numero_reservation ?? '', statut: heberg.statut })
    setEditing(true)
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
      setEditing(false)
      loadHeberg()
    } catch { showToast('Erreur lors de l\'enregistrement') }
    setSaving(false)
  }

  const nuits = heberg ? diffNuits(heberg.date_arrivee, heberg.date_depart) : 0
  const formNuits = diffNuits(form.date_arrivee, form.date_depart)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white text-xs px-4 py-2.5 rounded-xl shadow-lg text-center max-w-xs">{toast}</div>}

      {/* En-tête */}
      <div>
        <a href="/portail" className="text-xs text-[#C9A84C]">← Mon tableau de bord</a>
        <h1 className="font-serif italic text-2xl text-[#1A1A1A] mt-1">Sélection Hébergements</h1>
        <p className="text-sm text-[#888]">Villas, suites et lodges à Kribi</p>
      </div>

      {/* Carte principale — lien externe */}
      <div className="rounded-2xl p-6 text-center space-y-4" style={{ background: '#C9A84C' }}>
        <div className="text-5xl">🏡</div>
        <div>
          <p className="font-serif italic text-lg font-bold text-[#1A1A1A] mb-2">Sélection Hébergements Kribi</p>
          <p className="text-sm text-[#1A1A1A]/70 leading-relaxed">
            Accédez à notre plateforme pour choisir et réserver votre hébergement idéal :
            villas, suites, lodges et appartements de prestige à Kribi et ses environs.
          </p>
        </div>
        <a href={hebergUrl} target="_blank" rel="noopener noreferrer"
          className="block w-full py-4 rounded-2xl text-base font-bold"
          style={{ background: '#1A1A1A', color: '#C9A84C' }}>
          Voir les hébergements →
        </a>
        {identity.code_promo && (
          <p className="text-xs text-[#1A1A1A]/60">Code : {identity.code_promo} · appliqué automatiquement</p>
        )}
      </div>

      {/* Séparateur */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[#E8E0D0]" />
        <p className="text-xs text-[#888] text-center whitespace-nowrap">Vous avez trouvé votre hébergement ? Enregistrez votre réservation</p>
        <div className="flex-1 h-px bg-[#E8E0D0]" />
      </div>

      {/* Fiche hébergement enregistré */}
      {heberg && !editing ? (
        <div className="rounded-2xl p-5" style={{ background: '#1A1A1A' }}>
          <div className="flex justify-between items-start mb-3">
            <p className="font-semibold text-white">{heberg.nom}</p>
            <span className="text-[10px] px-2 py-1 rounded-full flex-shrink-0 ml-2" style={{ background: (STATUT_COLORS[heberg.statut] ?? '#888') + '33', color: STATUT_COLORS[heberg.statut] ?? '#888' }}>{heberg.statut}</span>
          </div>
          <div className="space-y-1 mb-3">
            {(heberg.date_arrivee || heberg.date_depart) && (
              <p className="text-xs text-white/60">{[heberg.date_arrivee, heberg.date_depart].filter(Boolean).join(' → ')}{nuits > 0 ? ` · ${nuits} nuit${nuits > 1 ? 's' : ''}` : ''}</p>
            )}
            {heberg.montant > 0 && <p className="text-base font-bold" style={{ color: '#C9A84C' }}>{formatFCFA(heberg.montant)}</p>}
            {heberg.numero_reservation && <p className="text-[10px] text-white/40">Réf : {heberg.numero_reservation}</p>}
          </div>
          <button onClick={openEdit} className="text-xs px-3 py-1.5 rounded-xl border border-white/20 text-white/60">Modifier</button>
        </div>
      ) : (
        /* Formulaire (nouveau ou modification) */
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F5F0E8]">
          <p className="text-sm font-semibold text-[#1A1A1A] mb-4">{heberg ? 'Modifier l\'hébergement' : 'Enregistrer ma réservation'}</p>
          <div className="space-y-3">
            <input className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm" placeholder="Hébergement choisi *" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[#888] mb-1 block">Date d&apos;arrivée</label>
                <input type="date" className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm" value={form.date_arrivee} onChange={e => setForm(f => ({ ...f, date_arrivee: e.target.value }))} />
              </div>
              <div>
                <label className="text-[10px] text-[#888] mb-1 block">Date de départ</label>
                <input type="date" className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm" value={form.date_depart} onChange={e => setForm(f => ({ ...f, date_depart: e.target.value }))} />
              </div>
            </div>
            {formNuits > 0 && <p className="text-xs text-[#C9A84C] font-semibold">→ {formNuits} nuit{formNuits > 1 ? 's' : ''}</p>}
            <input type="number" className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm" placeholder="Montant de la réservation (FCFA)" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} />
            <input className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm" placeholder="Numéro de réservation (optionnel)" value={form.numero_reservation} onChange={e => setForm(f => ({ ...f, numero_reservation: e.target.value }))} />
            <select className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm bg-white" value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}>
              {STATUTS.map(s => <option key={s}>{s}</option>)}
            </select>
            <div className="flex gap-2">
              {editing && heberg && <button onClick={() => setEditing(false)} className="flex-1 py-3 rounded-xl text-sm border border-[#E8E0D0] text-[#888]">Annuler</button>}
              <button onClick={handleSave} disabled={saving || !form.nom} className="flex-1 py-3 rounded-xl text-sm font-semibold text-[#1A1A1A] disabled:opacity-50" style={{ background: '#C9A84C' }}>
                {saving ? 'Enregistrement…' : 'Enregistrer ma réservation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
