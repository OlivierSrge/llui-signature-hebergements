'use client'

import { useState } from 'react'
import { PACKS, CATALOGUE, DEVIS_FORM_DEFAULT, calculerTotaux, formatFCFA } from '@/lib/devisDefaults'
import type { DevisFormData, PackKey } from '@/lib/devisDefaults'
import { saveDevis } from '@/actions/devis'
import DevisVariantes from '@/components/admin/DevisVariantes'
import { generateDevisPDF } from '@/lib/generateDevisPDF'

const STEPS = ['Informations clients', 'Sélection du pack', 'Personnalisation', 'Récapitulatif']

interface Props {
  onSaved?: (id: string) => void
}

export default function DevisWizard({ onSaved }: Props) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<DevisFormData>(DEVIS_FORM_DEFAULT)
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [savedRef, setSavedRef] = useState<string | null>(null)
  const [showVariantes, setShowVariantes] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totaux = calculerTotaux(form)

  const update = (fields: Partial<DevisFormData>) => setForm((prev) => ({ ...prev, ...fields }))

  const toggleOption = (nom: string) => {
    setForm((prev) => ({
      ...prev,
      optionsSelectionnees: prev.optionsSelectionnees.includes(nom)
        ? prev.optionsSelectionnees.filter((o) => o !== nom)
        : [...prev.optionsSelectionnees, nom],
    }))
  }

  const toggleBoutique = (nom: string) => {
    setForm((prev) => ({
      ...prev,
      optionsBoutiqueSelectionnees: prev.optionsBoutiqueSelectionnees.includes(nom)
        ? prev.optionsBoutiqueSelectionnees.filter((o) => o !== nom)
        : [...prev.optionsBoutiqueSelectionnees, nom],
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    const res = await saveDevis(form, totaux.totalTTC, totaux.totalBoutique, savedId || undefined)
    setSaving(false)
    if (res.success && res.id) {
      setSavedId(res.id)
      setSavedRef(res.ref || null)
      onSaved?.(res.id)
    } else {
      setError(res.error || 'Erreur lors de la sauvegarde')
    }
    return res
  }

  const handleGeneratePDF = async () => {
    const res = await handleSave()
    if (!res.success) return
    try {
      await generateDevisPDF(form, totaux, res.ref || savedRef || 'LLUI-DEV-DRAFT')
    } catch (e: any) {
      setError('Erreur PDF : ' + e.message)
    }
  }

  const canNext = () => {
    if (step === 0) return form.prenomMarie && form.nomMarie && form.prenomMariee && form.nomMariee && form.telephone && form.dateEvenement
    if (step === 1) return !!form.pack
    return true
  }

  return (
    <div className="space-y-6">
      {/* Barre de progression */}
      <div className="flex items-center gap-0">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center flex-1">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex flex-col items-center gap-1 flex-shrink-0 ${i < step ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                i === step ? 'bg-gold-500 border-gold-500 text-white' :
                i < step ? 'bg-dark border-dark text-white' :
                'bg-white border-beige-200 text-dark/30'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-[10px] font-medium hidden sm:block ${i === step ? 'text-gold-600' : i < step ? 'text-dark' : 'text-dark/30'}`}>
                {label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 transition-all ${i < step ? 'bg-dark' : 'bg-beige-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* ÉTAPE 1 — Informations clients */}
      {step === 0 && (
        <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-4">
          <h3 className="font-semibold text-dark text-lg">👰 Informations des mariés</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-dark/60 mb-1">Prénom du Marié *</label>
              <input value={form.prenomMarie} onChange={(e) => update({ prenomMarie: e.target.value })}
                className="input-field w-full" placeholder="ex : Olivier" />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark/60 mb-1">Nom du Marié *</label>
              <input value={form.nomMarie} onChange={(e) => update({ nomMarie: e.target.value })}
                className="input-field w-full" placeholder="ex : SERGE" />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark/60 mb-1">Prénom de la Mariée *</label>
              <input value={form.prenomMariee} onChange={(e) => update({ prenomMariee: e.target.value })}
                className="input-field w-full" placeholder="ex : Marie" />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark/60 mb-1">Nom de la Mariée *</label>
              <input value={form.nomMariee} onChange={(e) => update({ nomMariee: e.target.value })}
                className="input-field w-full" placeholder="ex : DUPONT" />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark/60 mb-1">Téléphone WhatsApp *</label>
              <input value={form.telephone} onChange={(e) => update({ telephone: e.target.value })}
                className="input-field w-full" placeholder="+237 6XX XXX XXX" type="tel" />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark/60 mb-1">Email (optionnel)</label>
              <input value={form.email} onChange={(e) => update({ email: e.target.value })}
                className="input-field w-full" placeholder="client@email.com" type="email" />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark/60 mb-1">Date du mariage *</label>
              <input value={form.dateEvenement} onChange={(e) => update({ dateEvenement: e.target.value })}
                className="input-field w-full" type="date" />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark/60 mb-1">Ville et lieu</label>
              <input value={form.ville} onChange={(e) => update({ ville: e.target.value })}
                className="input-field w-full" placeholder="ex : Kribi, Salle Eden" />
            </div>
          </div>
          {/* Slider invités */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-dark/60">Nombre d'invités</label>
              <span className="text-lg font-bold text-gold-600">{form.nombreInvites} invités</span>
            </div>
            <input type="range" min={50} max={500} step={10}
              value={form.nombreInvites}
              onChange={(e) => update({ nombreInvites: Number(e.target.value) })}
              className="w-full accent-gold-500" />
            <div className="flex justify-between text-[10px] text-dark/30 mt-0.5"><span>50</span><span>500</span></div>
          </div>
        </div>
      )}

      {/* ÉTAPE 2 — Sélection du pack */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-dark text-lg">💫 Choisissez votre pack</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(Object.entries(PACKS) as [PackKey, typeof PACKS[PackKey]][]).map(([key, pack]) => {
              const selected = form.pack === key
              return (
                <button
                  key={key}
                  onClick={() => update({ pack: key })}
                  className={`text-left rounded-2xl border-2 p-5 transition-all ${
                    selected ? 'border-gold-500 shadow-lg' : 'border-beige-200 hover:border-beige-300'
                  }`}
                  style={{ background: selected ? `${pack.couleur}60` : pack.couleur + '30' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-2xl">{pack.emoji}</span>
                      <h4 className="font-bold text-dark text-lg mt-1">Pack {pack.nom}</h4>
                    </div>
                    {selected && <span className="text-green-500 text-xl">✅</span>}
                  </div>
                  <p className="text-xs text-dark/60 mb-3">{pack.description}</p>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-dark/40">{pack.invites} invités inclus</span>
                    <span className="font-bold text-dark">{formatFCFA(pack.prixBase)}</span>
                  </div>
                  <ul className="space-y-1">
                    {pack.services.slice(0, 4).map((s) => (
                      <li key={s} className="text-xs text-dark/60 flex items-center gap-1.5">
                        <span className="text-gold-500">✓</span> {s}
                      </li>
                    ))}
                    {pack.services.length > 4 && (
                      <li className="text-xs text-dark/40">+ {pack.services.length - 4} autres...</li>
                    )}
                  </ul>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ÉTAPE 3 — Personnalisation */}
      {step === 2 && (
        <div className="space-y-5">
          {/* Section A — Lieux */}
          <div className="bg-white rounded-2xl border border-beige-200 p-6">
            <h3 className="font-semibold text-dark mb-4">📍 Lieux de l'événement</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-dark/60 mb-1">Lieu de cérémonie</label>
                <input value={form.lieuCeremonie} onChange={(e) => update({ lieuCeremonie: e.target.value })}
                  className="input-field w-full" placeholder="ex : Église Saint-Pierre" />
              </div>
              <div>
                <label className="block text-xs font-medium text-dark/60 mb-1">Prix lieu cérémonie (FCFA)</label>
                <input type="number" value={form.prixLieuCeremonie || ''} onChange={(e) => update({ prixLieuCeremonie: Number(e.target.value) })}
                  className="input-field w-full" placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-dark/60 mb-1">Lieu de réception</label>
                <input value={form.lieuReception} onChange={(e) => update({ lieuReception: e.target.value })}
                  className="input-field w-full" placeholder="ex : Salle Eden - Kribi" />
              </div>
              <div>
                <label className="block text-xs font-medium text-dark/60 mb-1">Prix lieu réception (FCFA)</label>
                <input type="number" value={form.prixLieuReception || ''} onChange={(e) => update({ prixLieuReception: Number(e.target.value) })}
                  className="input-field w-full" placeholder="0" />
              </div>
            </div>
          </div>

          {/* Section B — Options à la carte */}
          <div className="bg-white rounded-2xl border border-beige-200 p-6">
            <h3 className="font-semibold text-dark mb-1">✨ Options à la carte</h3>
            <p className="text-xs text-dark/40 mb-4">Ces options s'ajoutent au prix du pack</p>
            <div className="space-y-2">
              {CATALOGUE.optionsALaCarte.map((opt) => {
                const checked = form.optionsSelectionnees.includes(opt.nom)
                return (
                  <label key={opt.nom} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${checked ? 'bg-gold-50 border-gold-200' : 'border-beige-100 hover:bg-beige-50'}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleOption(opt.nom)} className="accent-gold-500" />
                    <span className="flex-1 text-sm text-dark">{opt.nom}</span>
                    <span className="text-sm font-semibold text-dark">{formatFCFA(opt.prix)}</span>
                    <span className="text-xs text-dark/40">{opt.unite}</span>
                  </label>
                )
              })}
            </div>
            {form.optionsSelectionnees.length > 0 && (
              <p className="text-right text-sm font-bold text-gold-600 mt-3">
                Sous-total options : {formatFCFA(totaux.totalOptions)}
              </p>
            )}
          </div>

          {/* Section C — Options Boutique */}
          <div className="bg-white rounded-2xl border border-beige-200 p-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="h-px flex-1 bg-beige-200" />
              <h3 className="font-semibold text-dark text-sm whitespace-nowrap">🛍️ Options Boutique</h3>
              <div className="h-px flex-1 bg-beige-200" />
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2.5 mb-4">
              ⚠️ Ces éléments sont présentés séparément dans la proposition — ils ne sont pas inclus dans le total TTC
            </p>
            <div className="space-y-2">
              {CATALOGUE.optionsBoutique.map((opt) => {
                const checked = form.optionsBoutiqueSelectionnees.includes(opt.nom)
                return (
                  <label key={opt.nom} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${checked ? 'bg-green-50 border-green-200' : 'border-beige-100 hover:bg-beige-50'}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleBoutique(opt.nom)} className="accent-green-600" />
                    <span className="flex-1 text-sm text-dark">{opt.nom}</span>
                    <span className="text-sm font-semibold text-dark">{formatFCFA(opt.prix)}</span>
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ÉTAPE 4 — Récapitulatif */}
      {step === 3 && (
        <div className="space-y-5">
          {/* Récap client */}
          <div className="bg-white rounded-2xl border border-beige-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-dark text-lg">
                  {form.prenomMarie} {form.nomMarie} & {form.prenomMariee} {form.nomMariee}
                </p>
                <p className="text-sm text-dark/50">{form.ville} · {form.dateEvenement ? new Date(form.dateEvenement).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : ''} · {form.nombreInvites} invités</p>
              </div>
              {form.pack && (
                <div className="text-right">
                  <span className="text-2xl">{PACKS[form.pack].emoji}</span>
                  <p className="text-xs font-bold text-dark">Pack {PACKS[form.pack].nom}</p>
                </div>
              )}
            </div>
          </div>

          {/* Détail financier */}
          <div className="bg-white rounded-2xl border border-beige-200 p-5 space-y-3">
            <h3 className="font-semibold text-dark">💰 Récapitulatif budgétaire</h3>

            {/* Sous-catégories estimées */}
            {[
              { label: 'Restauration & Traiteur', value: form.pack ? Math.round(PACKS[form.pack].prixBase * 0.40) : 0 },
              { label: 'Décoration & Scénographie', value: form.pack ? Math.round(PACKS[form.pack].prixBase * 0.30) : 0 },
              { label: 'Image & Beauté', value: form.pack ? Math.round(PACKS[form.pack].prixBase * 0.15) : 0 },
              { label: 'Logistique & Lieux', value: (form.pack ? Math.round(PACKS[form.pack].prixBase * 0.15) : 0) + totaux.totalLieux },
            ].map((cat) => (
              <div key={cat.label} className="flex justify-between text-sm">
                <span className="text-dark/60">{cat.label}</span>
                <span className="font-medium text-dark">{formatFCFA(cat.value)}</span>
              </div>
            ))}

            {form.optionsSelectionnees.length > 0 && (
              <div className="flex justify-between text-sm border-t border-beige-100 pt-2">
                <span className="text-dark/60">Options à la carte</span>
                <span className="font-medium text-dark">+ {formatFCFA(totaux.totalOptions)}</span>
              </div>
            )}

            <div className="border-t border-beige-200 pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-dark/60">Sous-total prestations</span>
                <span className="font-semibold text-dark">{formatFCFA(totaux.sousTotalPrestations)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-dark/60">Honoraires L&Lui (10%)</span>
                <span className="font-semibold text-dark">{formatFCFA(totaux.honoraires)}</span>
              </div>
              <div className="flex justify-between items-center border-t-2 border-dark pt-2">
                <span className="font-bold text-dark text-base">TOTAL TTC</span>
                <span className="font-bold text-dark text-xl">{formatFCFA(totaux.totalTTC)}</span>
              </div>
            </div>

            {/* Options boutique séparées */}
            {totaux.totalBoutique > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-800 mb-2">🛍️ OPTIONS BOUTIQUE (hors total)</p>
                {form.optionsBoutiqueSelectionnees.map((nom) => {
                  const opt = CATALOGUE.optionsBoutique.find((o) => o.nom === nom)
                  return opt ? (
                    <div key={nom} className="flex justify-between text-xs text-amber-700">
                      <span>{nom}</span><span>{formatFCFA(opt.prix)}</span>
                    </div>
                  ) : null
                })}
                <div className="flex justify-between text-sm font-bold text-amber-800 mt-1 pt-1 border-t border-amber-200">
                  <span>Total boutique</span><span>{formatFCFA(totaux.totalBoutique)}</span>
                </div>
              </div>
            )}

            {/* Échéancier */}
            <div className="bg-beige-50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-dark/70">📅 Échéancier de paiement</p>
              {totaux.echeancier.map((e) => (
                <div key={e.label} className="flex justify-between text-sm">
                  <span className="text-dark/60">{e.pourcentage}% — {e.label}</span>
                  <span className="font-semibold text-dark">{formatFCFA(e.montant)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes personnalisées */}
          <div className="bg-white rounded-2xl border border-beige-200 p-5">
            <label className="block text-sm font-medium text-dark mb-2">Notes personnalisées (optionnel)</label>
            <textarea
              value={form.notes}
              onChange={(e) => update({ notes: e.target.value })}
              rows={3}
              placeholder="Demandes spéciales, préférences couleur, informations complémentaires..."
              className="w-full px-3 py-2.5 text-sm border border-beige-200 rounded-xl focus:outline-none focus:border-gold-400 resize-none"
            />
          </div>

          {/* Variantes */}
          {showVariantes && (
            <DevisVariantes
              form={form}
              totaux={totaux}
              onSelectVariante={(variantesIncluses) => update({ variantesIncluses })}
            />
          )}

          {/* Feedback */}
          {savedRef && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
              ✅ Devis sauvegardé — Réf : <span className="font-mono font-bold">{savedRef}</span>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">❌ {error}</div>
          )}

          {/* Actions finales */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowVariantes(!showVariantes)}
              className="px-4 py-2.5 border border-beige-200 rounded-xl text-sm font-medium text-dark/70 hover:bg-beige-50"
            >
              🎲 {showVariantes ? 'Masquer les variantes' : 'Générer 3 variantes'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2.5 border border-dark rounded-xl text-sm font-medium text-dark hover:bg-dark hover:text-white disabled:opacity-50"
            >
              {saving ? 'Sauvegarde...' : '💾 Sauvegarder le brouillon'}
            </button>
            <button
              onClick={handleGeneratePDF}
              disabled={saving || !form.pack}
              className="px-6 py-2.5 bg-gold-500 text-white rounded-xl text-sm font-bold hover:bg-gold-600 disabled:opacity-50 shadow-gold"
            >
              {saving ? 'Génération...' : '📄 Générer la proposition PDF'}
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="px-5 py-2.5 border border-beige-200 rounded-xl text-sm text-dark/60 hover:bg-beige-50 disabled:opacity-30"
        >
          ← Précédent
        </button>
        {step < 3 && (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext()}
            className="px-6 py-2.5 bg-dark text-white rounded-xl text-sm font-semibold hover:bg-dark/90 disabled:opacity-40"
          >
            Suivant →
          </button>
        )}
      </div>
    </div>
  )
}
