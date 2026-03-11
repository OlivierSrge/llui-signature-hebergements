'use client'

import { useState, useRef } from 'react'
import { toast } from 'react-hot-toast'
import { Save, Eye, RotateCcw, FileText, Tag, Settings, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import {
  saveContractClauses,
  saveCommissionPlan,
  saveContractMeta,
} from '@/actions/contract'
import { DEFAULT_CONTRACT_TEXT, DEFAULT_COMMISSION_CLAUSES } from '@/lib/contractDefaults'

// ─── Variables disponibles ────────────────────────────────────────────────────
const VARIABLES = [
  '{{NOM_PARTENAIRE}}', '{{PLAN_ABONNEMENT}}', '{{PRIX_ABONNEMENT}}',
  '{{TAUX_COMMISSION}}', '{{NOMBRE_LOGEMENTS}}', '{{DATE_SIGNATURE}}',
  '{{DATE_DEBUT}}', '{{DELAI_VERSEMENT}}', '{{VILLE}}', '{{ANNEE}}',
  '{{QUALITE_SIGNATAIRE}}', '{{NUMERO_CONTRAT}}',
]

// ─── Données fictives pour l'aperçu ─────────────────────────────────────────
const PREVIEW_VARS: Record<string, string> = {
  '{{NOM_PARTENAIRE}}': 'Jean-Paul Mbarga',
  '{{PLAN_ABONNEMENT}}': 'Pro',
  '{{PRIX_ABONNEMENT}}': '35 000 FCFA/mois',
  '{{TAUX_COMMISSION}}': '10',
  '{{NOMBRE_LOGEMENTS}}': '30',
  '{{DATE_SIGNATURE}}': new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
  '{{DATE_DEBUT}}': new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
  '{{DELAI_VERSEMENT}}': '5',
  '{{VILLE}}': 'Kribi',
  '{{ANNEE}}': new Date().getFullYear().toString(),
  '{{QUALITE_SIGNATAIRE}}': 'Gérant',
  '{{NUMERO_CONTRAT}}': 'LLUI-CTR-AB12C',
  '{{CLAUSE_COMMISSION}}': DEFAULT_COMMISSION_CLAUSES.pro.clause,
}

function replaceVars(text: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((acc, [key, val]) => acc.replaceAll(key, val), text)
}

// ═══════════════════════════════════════════
// ONGLET 1 — Clauses générales
// ═══════════════════════════════════════════

function Tab1Clauses({ initialClauses }: { initialClauses: string }) {
  const [clauses, setClauses] = useState(initialClauses)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const insertVariable = (v: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const newText = clauses.slice(0, start) + v + clauses.slice(end)
    setClauses(newText)
    setTimeout(() => {
      ta.selectionStart = ta.selectionEnd = start + v.length
      ta.focus()
    }, 0)
  }

  const handleSave = async () => {
    setSaving(true)
    const res = await saveContractClauses(clauses)
    setSaving(false)
    if (res.success) toast.success('Clauses sauvegardées')
    else toast.error(res.error || 'Erreur lors de la sauvegarde')
  }

  const handleReset = () => {
    setClauses(DEFAULT_CONTRACT_TEXT)
    setShowReset(false)
    toast.success('Modèle par défaut rechargé')
  }

  return (
    <div className="space-y-4">
      {/* Boutons variables */}
      <div>
        <p className="text-xs text-dark/50 mb-2">Variables — cliquer pour insérer à la position du curseur :</p>
        <div className="flex flex-wrap gap-1.5">
          {VARIABLES.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => insertVariable(v)}
              className="text-xs px-2.5 py-1 bg-gold-50 text-gold-700 border border-gold-200 rounded-lg hover:bg-gold-100 transition-colors font-mono"
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Aperçu / édition toggle */}
      {preview ? (
        <div className="border border-beige-200 rounded-xl p-6 bg-white max-h-[600px] overflow-y-auto">
          <h3 className="text-xs font-semibold text-dark/40 uppercase tracking-wide mb-4">Aperçu avec données fictives</h3>
          <pre className="whitespace-pre-wrap font-sans text-sm text-dark/80 leading-relaxed">
            {replaceVars(clauses, PREVIEW_VARS)}
          </pre>
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={clauses}
          onChange={(e) => setClauses(e.target.value)}
          rows={30}
          className="w-full font-mono text-sm text-dark bg-white border border-beige-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-gold-300 resize-y"
          placeholder="Texte du contrat..."
        />
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-dark text-white rounded-xl text-sm font-medium hover:bg-dark/80 disabled:opacity-50 transition-colors"
        >
          <Save size={15} /> {saving ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>

        <button
          onClick={() => setPreview(!preview)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gold-100 text-gold-800 border border-gold-200 rounded-xl text-sm font-medium hover:bg-gold-200 transition-colors"
        >
          <Eye size={15} /> {preview ? 'Éditer' : 'Aperçu'}
        </button>

        <button
          onClick={() => setShowReset(true)}
          className="flex items-center gap-2 px-4 py-2.5 border border-beige-300 text-dark/50 rounded-xl text-sm hover:bg-beige-50 transition-colors"
        >
          <RotateCcw size={14} /> Réinitialiser au modèle
        </button>
      </div>

      {/* Modal confirmation reset */}
      {showReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={20} className="text-amber-500" />
              <h3 className="font-semibold text-dark">Réinitialiser le contrat ?</h3>
            </div>
            <p className="text-sm text-dark/60 mb-6">
              Le texte actuel sera remplacé par le modèle par défaut. Cette action est irréversible si vous sauvegardez ensuite.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors"
              >
                Réinitialiser
              </button>
              <button
                onClick={() => setShowReset(false)}
                className="flex-1 px-4 py-2.5 border border-beige-200 text-dark/60 rounded-xl text-sm hover:bg-beige-50 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════
// ONGLET 2 — Clauses commissions
// ═══════════════════════════════════════════

const PLAN_LABELS: Record<string, string> = {
  essentiel: 'Essentiel — Gratuit',
  starter: 'Starter — 15 000 FCFA/mois',
  pro: 'Pro — 35 000 FCFA/mois',
  premium: 'Premium — 60 000 FCFA/mois',
}

function Tab2Commissions({ initialCommissions }: { initialCommissions: typeof DEFAULT_COMMISSION_CLAUSES }) {
  const [commissions, setCommissions] = useState(initialCommissions)
  const [savingPlan, setSavingPlan] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const update = (plan: string, field: string, value: any) => {
    setCommissions((prev) => ({
      ...prev,
      [plan]: { ...prev[plan], [field]: value },
    }))
  }

  const handleSavePlan = async (plan: string) => {
    setSavingPlan(plan)
    const res = await saveCommissionPlan(plan, commissions[plan])
    setSavingPlan(null)
    if (res.success) toast.success(`Plan ${plan} sauvegardé`)
    else toast.error(res.error || 'Erreur')
  }

  return (
    <div className="space-y-4">
      {Object.keys(DEFAULT_COMMISSION_CLAUSES).map((plan) => {
        const c = commissions[plan]
        const isCollapsed = collapsed[plan]
        return (
          <div key={plan} className="border border-beige-200 rounded-xl overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setCollapsed((p) => ({ ...p, [plan]: !p[plan] }))}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-beige-50 transition-colors"
            >
              <span className="font-semibold text-dark">{PLAN_LABELS[plan]}</span>
              {isCollapsed ? <ChevronDown size={16} className="text-dark/40" /> : <ChevronUp size={16} className="text-dark/40" />}
            </button>

            {!isCollapsed && (
              <div className="px-5 pb-5 space-y-4 border-t border-beige-100">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
                  <div>
                    <label className="label text-xs">Taux commission (%)</label>
                    <input
                      type="number"
                      value={c.rate}
                      onChange={(e) => update(plan, 'rate', Number(e.target.value))}
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Prix abonnement FCFA</label>
                    <input
                      type="number"
                      value={c.fee}
                      onChange={(e) => update(plan, 'fee', Number(e.target.value))}
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Logements max</label>
                    <input
                      type="text"
                      value={c.maxAccommodations}
                      onChange={(e) => {
                        const v = e.target.value
                        update(plan, 'maxAccommodations', v === 'illimité' || isNaN(Number(v)) ? v : Number(v))
                      }}
                      className="input-field text-sm"
                      placeholder="Ex : 10 ou illimité"
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Délai reversement (j)</label>
                    <input
                      type="number"
                      value={c.paymentDelay}
                      onChange={(e) => update(plan, 'paymentDelay', Number(e.target.value))}
                      className="input-field text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="label text-xs">Conditions spéciales</label>
                  <textarea
                    rows={2}
                    value={c.specialConditions}
                    onChange={(e) => update(plan, 'specialConditions', e.target.value)}
                    className="input-field resize-none text-sm"
                  />
                </div>

                <div>
                  <label className="label text-xs">Texte de la clause commission</label>
                  <textarea
                    rows={4}
                    value={c.clause}
                    onChange={(e) => update(plan, 'clause', e.target.value)}
                    className="input-field resize-none text-sm"
                  />
                </div>

                <button
                  onClick={() => handleSavePlan(plan)}
                  disabled={savingPlan === plan}
                  className="flex items-center gap-2 px-4 py-2.5 bg-dark text-white rounded-xl text-sm font-medium hover:bg-dark/80 disabled:opacity-50 transition-colors"
                >
                  <Save size={14} /> {savingPlan === plan ? 'Sauvegarde…' : 'Sauvegarder ce plan'}
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════
// ONGLET 3 — Paramètres et versions
// ═══════════════════════════════════════════

function Tab3Settings({
  initialMeta,
}: {
  initialMeta: { version: string; effectiveDate: string; publishedAt?: string }
}) {
  const [version, setVersion] = useState(initialMeta.version)
  const [effectiveDate, setEffectiveDate] = useState(initialMeta.effectiveDate)
  const [forceResign, setForceResign] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showForceConfirm, setShowForceConfirm] = useState(false)

  const handlePublish = async () => {
    if (forceResign && !showForceConfirm) {
      setShowForceConfirm(true)
      return
    }
    setSaving(true)
    const res = await saveContractMeta({ version, effectiveDate, forceResign })
    setSaving(false)
    setShowForceConfirm(false)
    if (res.success) {
      toast.success('Paramètres publiés' + (forceResign ? ' — Re-signature forcée' : ''))
      setForceResign(false)
    } else {
      toast.error(res.error || 'Erreur')
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-beige-200 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-dark">Version active du contrat</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Version</label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="input-field"
              placeholder="v1.0-2026"
            />
          </div>
          <div>
            <label className="label">Date d&apos;entrée en vigueur</label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="input-field"
            />
          </div>
        </div>

        {initialMeta.publishedAt && (
          <p className="text-xs text-dark/40">
            Dernière publication : {new Date(initialMeta.publishedAt).toLocaleDateString('fr-FR', {
              day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </p>
        )}

        {/* Toggle forcer re-signature */}
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <input
            type="checkbox"
            id="forceResign"
            checked={forceResign}
            onChange={(e) => setForceResign(e.target.checked)}
            className="w-4 h-4 rounded border-amber-300 text-amber-500 focus:ring-amber-400"
          />
          <label htmlFor="forceResign" className="text-sm text-amber-800">
            <span className="font-semibold">Forcer la re-signature</span> — Les partenaires déjà signés devront signer à nouveau le nouveau contrat
          </label>
        </div>
      </div>

      {showForceConfirm && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle size={18} className="text-red-500" />
            <p className="font-semibold text-red-700">Confirmer la re-signature forcée ?</p>
          </div>
          <p className="text-sm text-red-600 mb-4">
            Tous les partenaires ayant signé seront informés qu&apos;une nouvelle signature est requise. Leur statut de contrat passera à &quot;Envoyé&quot;.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handlePublish}
              disabled={saving}
              className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Publication…' : 'Confirmer et publier'}
            </button>
            <button
              onClick={() => setShowForceConfirm(false)}
              className="px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm hover:bg-red-100 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {!showForceConfirm && (
        <button
          onClick={handlePublish}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-dark text-white rounded-xl text-sm font-medium hover:bg-dark/80 disabled:opacity-50 transition-colors"
        >
          <Save size={15} /> {saving ? 'Publication…' : 'Publier cette version'}
        </button>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════
// COMPOSANT PRINCIPAL — Tabs
// ═══════════════════════════════════════════

interface Props {
  initialClauses: string
  initialCommissions: typeof DEFAULT_COMMISSION_CLAUSES
  initialMeta: { version: string; effectiveDate: string; publishedAt?: string }
}

const TABS = [
  { id: 'clauses', label: 'Clauses générales', icon: FileText },
  { id: 'commissions', label: 'Clauses commissions', icon: Tag },
  { id: 'settings', label: 'Paramètres & versions', icon: Settings },
]

export default function ContractAdminTabs({ initialClauses, initialCommissions, initialMeta }: Props) {
  const [activeTab, setActiveTab] = useState('clauses')

  return (
    <div>
      {/* Tabs navigation */}
      <div className="flex gap-1 bg-beige-100 p-1 rounded-xl mb-6 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center ${
              activeTab === id
                ? 'bg-white text-dark shadow-sm'
                : 'text-dark/50 hover:text-dark hover:bg-white/50'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'clauses' && <Tab1Clauses initialClauses={initialClauses} />}
      {activeTab === 'commissions' && <Tab2Commissions initialCommissions={initialCommissions} />}
      {activeTab === 'settings' && <Tab3Settings initialMeta={initialMeta} />}
    </div>
  )
}
