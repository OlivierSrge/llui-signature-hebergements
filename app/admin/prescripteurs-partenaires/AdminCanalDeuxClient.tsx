'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { creerPrescripteurPartenaire, marquerCommissionVersee, type TypePartenaire, type RemiseType } from '@/actions/codes-sessions'
import type { PrescripteurPartenaire } from '@/actions/codes-sessions'
import { useRouter } from 'next/navigation'

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

function jours(d: string) {
  return Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000))
}

interface Stats {
  partenaires_actifs: number
  codes_actifs: number
  total_utilisations: number
  total_ca_fcfa: number
  commissions_dues_fcfa: number
  forfaits_percus_fcfa: number
  expirant_bientot: PrescripteurPartenaire[]
  top_partenaires: PrescripteurPartenaire[]
  commissions_par_partenaire: Record<string, number>
  tous_partenaires: PrescripteurPartenaire[]
}

const TYPES: TypePartenaire[] = ['hotel', 'restaurant', 'agence', 'bar', 'plage', 'autre']

export default function AdminCanalDeuxClient({ stats }: { stats: Stats }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [versementId, setVersementId] = useState<string | null>(null)

  const [form, setForm] = useState({
    nom_etablissement: '',
    type: 'hotel' as TypePartenaire,
    telephone: '',
    adresse: '',
    remise_type: 'reduction_pct' as RemiseType,
    remise_valeur_pct: 10,
    remise_description: '',
    forfait_type: 'mensuel' as 'mensuel' | 'annuel',
  })

  async function handleCreer() {
    if (!form.nom_etablissement || !form.telephone) {
      toast.error('Nom et téléphone requis')
      return
    }
    setSaving(true)
    const res = await creerPrescripteurPartenaire({
      ...form,
      remise_valeur_pct: form.remise_type === 'reduction_pct' ? form.remise_valeur_pct : null,
      remise_description: form.remise_type === 'non_financier' ? form.remise_description : null,
    })
    setSaving(false)
    if (res.success) {
      toast.success('Prescripteur partenaire créé ✅')
      setShowForm(false)
      router.refresh()
    } else {
      toast.error(res.error ?? 'Erreur')
    }
  }

  async function handleVerser(partenaireId: string) {
    setVersementId(partenaireId)
    const res = await marquerCommissionVersee(partenaireId)
    setVersementId(null)
    if (res.success) { toast.success('Commission marquée versée ✅'); router.refresh() }
    else toast.error('Erreur lors du versement')
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Entête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-[#1A1A1A]">🏨 Canal 2 — Prescripteurs Partenaires</h1>
          <p className="text-sm text-[#1A1A1A]/50 mt-1">Hôtels, restaurants, bars, agences, plages</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 bg-[#C9A84C] text-white text-sm font-semibold rounded-xl hover:bg-[#b8963e] transition-colors">
          + Nouveau partenaire
        </button>
      </div>

      {/* Formulaire création */}
      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#F5F0E8]">
          <h2 className="text-sm font-semibold mb-4 text-[#1A1A1A]">Nouveau prescripteur partenaire</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#1A1A1A]/60 mb-1 block">Nom de l&apos;établissement *</label>
              <input value={form.nom_etablissement} onChange={(e) => setForm((f) => ({ ...f, nom_etablissement: e.target.value }))}
                className="w-full border border-[#F5F0E8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]" placeholder="Hôtel Le Lagon" />
            </div>
            <div>
              <label className="text-xs text-[#1A1A1A]/60 mb-1 block">Type</label>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as TypePartenaire }))}
                className="w-full border border-[#F5F0E8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]">
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#1A1A1A]/60 mb-1 block">Téléphone *</label>
              <input value={form.telephone} onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))}
                className="w-full border border-[#F5F0E8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]" placeholder="237 6XX XXX XXX" />
            </div>
            <div>
              <label className="text-xs text-[#1A1A1A]/60 mb-1 block">Adresse</label>
              <input value={form.adresse} onChange={(e) => setForm((f) => ({ ...f, adresse: e.target.value }))}
                className="w-full border border-[#F5F0E8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]" placeholder="Kribi Centre" />
            </div>
            <div>
              <label className="text-xs text-[#1A1A1A]/60 mb-1 block">Type remise</label>
              <select value={form.remise_type} onChange={(e) => setForm((f) => ({ ...f, remise_type: e.target.value as RemiseType }))}
                className="w-full border border-[#F5F0E8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]">
                <option value="reduction_pct">Réduction % sur réservation</option>
                <option value="non_financier">Avantage non financier</option>
              </select>
            </div>
            {form.remise_type === 'reduction_pct' ? (
              <div>
                <label className="text-xs text-[#1A1A1A]/60 mb-1 block">Taux de réduction</label>
                <input type="number" min={1} max={50} value={form.remise_valeur_pct}
                  onChange={(e) => setForm((f) => ({ ...f, remise_valeur_pct: Number(e.target.value) }))}
                  className="w-full border border-[#F5F0E8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]" />
              </div>
            ) : (
              <div>
                <label className="text-xs text-[#1A1A1A]/60 mb-1 block">Description avantage</label>
                <input value={form.remise_description} onChange={(e) => setForm((f) => ({ ...f, remise_description: e.target.value }))}
                  className="w-full border border-[#F5F0E8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]" placeholder="Cocktail de bienvenue offert" />
              </div>
            )}
            <div>
              <label className="text-xs text-[#1A1A1A]/60 mb-1 block">Forfait</label>
              <select value={form.forfait_type} onChange={(e) => setForm((f) => ({ ...f, forfait_type: e.target.value as 'mensuel' | 'annuel' }))}
                className="w-full border border-[#F5F0E8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]">
                <option value="mensuel">Mensuel</option>
                <option value="annuel">Annuel</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleCreer} disabled={saving}
              className="px-6 py-2.5 bg-[#C9A84C] text-white text-sm font-semibold rounded-xl disabled:opacity-60 hover:bg-[#b8963e] transition-colors">
              {saving ? 'Création...' : '✅ Créer'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-6 py-2.5 bg-[#F5F0E8] text-[#1A1A1A] text-sm font-medium rounded-xl">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Partenaires actifs', val: stats.partenaires_actifs },
          { label: 'Codes actifs', val: stats.codes_actifs },
          { label: 'Utilisations ce mois', val: stats.total_utilisations },
        ].map(({ label, val }) => (
          <div key={label} className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <p className="text-3xl font-bold text-[#C9A84C]">{val}</p>
            <p className="text-xs text-[#1A1A1A]/60 mt-1">{label}</p>
          </div>
        ))}
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <p className="text-xl font-bold text-[#C9A84C]">{formatFCFA(stats.total_ca_fcfa)}</p>
          <p className="text-xs text-[#1A1A1A]/60 mt-1">CA total généré</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <p className="text-xl font-bold text-amber-600">{formatFCFA(stats.commissions_dues_fcfa)}</p>
          <p className="text-xs text-[#1A1A1A]/60 mt-1">Commissions dues</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <p className="text-xl font-bold text-green-600">{formatFCFA(stats.forfaits_percus_fcfa)}</p>
          <p className="text-xs text-[#1A1A1A]/60 mt-1">Forfaits perçus</p>
        </div>
      </div>

      {/* Top partenaires */}
      {stats.top_partenaires.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#1A1A1A] mb-3">🏆 Top partenaires</h2>
          <div className="space-y-2">
            {stats.top_partenaires.map((p, i) => {
              const ca = p.total_ca_hebergements_fcfa + p.total_ca_boutique_fcfa
              return (
                <div key={p.uid} className="flex items-center justify-between bg-[#F5F0E8]/40 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-[#C9A84C]">#{i + 1}</span>
                    <div>
                      <p className="text-sm font-semibold text-[#1A1A1A]">{p.nom_etablissement}</p>
                      <p className="text-xs text-[#1A1A1A]/50">{p.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#C9A84C]">{formatFCFA(ca)}</p>
                    <a href={`/partenaire-prescripteur/${p.uid}`} target="_blank" rel="noreferrer"
                      className="text-xs text-[#1A1A1A]/50 hover:text-[#C9A84C] underline">Dashboard →</a>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Forfaits expirant bientôt */}
      {stats.expirant_bientot.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-amber-800 mb-3">⚠️ Forfaits expirant dans 7 jours</h2>
          <div className="space-y-2">
            {stats.expirant_bientot.map((p) => (
              <div key={p.uid} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#1A1A1A]">{p.nom_etablissement}</p>
                  <p className="text-xs text-amber-600">dans {jours(p.forfait_expire_at)} jours</p>
                </div>
                <a href={`https://wa.me/${p.telephone.replace(/\D/g, '')}?text=${encodeURIComponent(`⚠️ Votre forfait L&Lui expire dans ${jours(p.forfait_expire_at)} jours.\nContactez-nous : +237 693 407 964`)}`}
                  target="_blank" rel="noreferrer"
                  className="text-xs px-3 py-1.5 bg-amber-500 text-white rounded-lg">
                  Contacter
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Commissions à verser */}
      {Object.keys(stats.commissions_par_partenaire).length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#1A1A1A] mb-3">💰 Commissions à verser</h2>
          <div className="space-y-2">
            {stats.tous_partenaires
              .filter((p) => (stats.commissions_par_partenaire[p.uid] ?? 0) > 0)
              .map((p) => (
                <div key={p.uid} className="flex items-center justify-between bg-[#F5F0E8]/40 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A]">{p.nom_etablissement}</p>
                    <p className="text-sm font-bold text-amber-600">{formatFCFA(stats.commissions_par_partenaire[p.uid] ?? 0)}</p>
                  </div>
                  <button onClick={() => handleVerser(p.uid)} disabled={versementId === p.uid}
                    className="text-xs px-3 py-1.5 bg-[#C9A84C] text-white rounded-lg disabled:opacity-60 hover:bg-[#b8963e] transition-colors">
                    {versementId === p.uid ? '...' : '✅ Marquer versé'}
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
