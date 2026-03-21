'use client'
// app/portail/configurateur/page.tsx — Boutique externe + saisie manuelle achats

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

const CATEGORIES = ['Packs Mariage', 'Photo & Vidéo', 'Décoration', 'Beauté', 'Son & Lumière', 'Traiteur', 'Autre']
const STATUTS = ['Commandé', 'Devis reçu', 'Payé', 'Livré']
const STATUT_COLORS: Record<string, string> = { Commandé: '#C9A84C', 'Devis reçu': '#888', Payé: '#7C9A7E', Livré: '#3B82F6' }

interface Achat { id: string; nom: string; montant: number; categorie: string; date_achat: string; statut: string }

export default function ConfigurateurPage() {
  const [uid] = useState(() => getUid())
  const identity = useClientIdentity()
  const [achats, setAchats] = useState<Achat[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nom: '', montant: '', categorie: 'Packs Mariage', date_achat: new Date().toISOString().slice(0, 10), statut: 'Commandé' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const loadAchats = useCallback(() => {
    if (!uid) return
    fetch(`/api/portail/achats-boutique?uid=${uid}`).then(r => r.json()).then(d => setAchats(d.achats ?? [])).catch(() => {})
  }, [uid])

  useEffect(() => { loadAchats() }, [loadAchats])

  const boutiqueUrl = identity.uid && identity.code_promo
    ? getCodePromoUrl(identity.code_promo, identity.uid, 'boutique')
    : `https://letlui-signature.netlify.app?ref=${uid}`

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
      setForm({ nom: '', montant: '', categorie: 'Packs Mariage', date_achat: new Date().toISOString().slice(0, 10), statut: 'Commandé' })
      loadAchats()
    } catch { showToast('Erreur lors de l\'enregistrement') }
    setSaving(false)
  }

  const totalBoutique = achats.reduce((s, a) => s + a.montant, 0)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white text-xs px-4 py-2.5 rounded-xl shadow-lg text-center max-w-xs">{toast}</div>}

      {/* En-tête */}
      <div>
        <a href="/portail" className="text-xs text-[#C9A84C]">← Mon tableau de bord</a>
        <h1 className="font-serif italic text-2xl text-[#1A1A1A] mt-1">Boutique L&Lui Signature</h1>
        <p className="text-sm text-[#888]">Découvrez toutes nos prestations</p>
      </div>

      {/* Carte principale — lien externe */}
      <div className="rounded-2xl p-6 text-center space-y-4" style={{ background: '#1A1A1A' }}>
        <div className="text-5xl">🛍️</div>
        <div>
          <p className="font-serif italic text-lg font-bold mb-2" style={{ color: '#C9A84C' }}>Boutique L&Lui Signature</p>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Accédez à notre boutique en ligne pour choisir vos prestations mariage :
            Photo &amp; Vidéo, Décoration, Beauté, Traiteur, Son &amp; Lumière et plus encore.
          </p>
        </div>
        <a href={boutiqueUrl} target="_blank" rel="noopener noreferrer"
          className="block w-full py-4 rounded-2xl text-base font-bold"
          style={{ background: '#C9A84C', color: '#1A1A1A' }}>
          Ouvrir la boutique →
        </a>
        {identity.code_promo && (
          <p className="text-xs" style={{ color: 'rgba(201,168,76,0.7)' }}>Code : {identity.code_promo} · appliqué automatiquement</p>
        )}
      </div>

      {/* Séparateur saisie */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[#E8E0D0]" />
        <p className="text-xs text-[#888] text-center whitespace-nowrap">Vous êtes revenu(e) ? Enregistrez vos achats</p>
        <div className="flex-1 h-px bg-[#E8E0D0]" />
      </div>

      {/* Section saisie */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-semibold text-[#1A1A1A]">Mes achats enregistrés</p>
          <button onClick={() => setModal(true)} className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white" style={{ background: '#C9A84C' }}>
            + Enregistrer un achat
          </button>
        </div>

        {achats.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-[#AAA] mb-1">Aucun achat enregistré pour le moment</p>
            <p className="text-xs text-[#C9A84C]">Visitez la boutique, puis revenez ici !</p>
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-3">
              {achats.map(a => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-[#F5F0E8] last:border-0">
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
            <p className="text-xs text-right font-semibold text-[#1A1A1A]">
              Total boutique : <span style={{ color: '#C9A84C' }}>{formatFCFA(totalBoutique)}</span>
            </p>
          </>
        )}
      </div>

      {/* Modal ajout achat */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setModal(false)}>
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <p className="text-base font-semibold mb-4">Enregistrer un achat boutique</p>
            <div className="space-y-3">
              <input className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm" placeholder="Nom du produit / service *" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
              <input type="number" className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm" placeholder="Montant payé (FCFA) *" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} />
              <select className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm bg-white" value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <input type="date" className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm" value={form.date_achat} onChange={e => setForm(f => ({ ...f, date_achat: e.target.value }))} />
              <select className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm bg-white" value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}>
                {STATUTS.map(s => <option key={s}>{s}</option>)}
              </select>
              <button onClick={handleSave} disabled={saving || !form.nom || !form.montant} className="w-full py-3 rounded-xl text-sm font-semibold text-[#1A1A1A] disabled:opacity-50" style={{ background: '#C9A84C' }}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
