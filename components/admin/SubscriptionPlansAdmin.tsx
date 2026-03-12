'use client'

import { useState, useTransition } from 'react'
import { toast } from 'react-hot-toast'
import { Loader2, Save, Plus, History, Settings2, LayoutGrid, Check } from 'lucide-react'
import type { PlanConfig } from '@/actions/admin-subscriptions'
import { savePlanConfig, savePlanFeatures, createPlan } from '@/actions/admin-subscriptions'

const PLAN_ORDER = ['essentiel', 'starter', 'pro', 'premium']

const ALL_FEATURES: Array<{ key: string; label: string }> = [
  { key: 'canViewReservations', label: 'Voir les réservations' },
  { key: 'canCreateReservations', label: 'Créer des réservations' },
  { key: 'canViewCalendar', label: 'Calendrier lecture seule' },
  { key: 'canBlockDates', label: 'Bloquer des dates' },
  { key: 'canReceiveWhatsAppNotifications', label: 'Notifications WhatsApp' },
  { key: 'canAccessQrChambre', label: 'QR Code chambre' },
  { key: 'canAccessQrReception', label: 'QR Code réception' },
  { key: 'canAccessMiniSite', label: 'Mini-site /p/[slug]' },
  { key: 'canAccessMessaging', label: 'Messagerie interne' },
  { key: 'canViewBasicStats', label: 'Stats basiques' },
  { key: 'canViewAdvancedStats', label: 'Stats avancées' },
  { key: 'weeklyWhatsAppReport', label: 'Rapport hebdo WhatsApp' },
  { key: 'canScanQr', label: 'Scanner QR arrivée' },
  { key: 'canAddAccommodations', label: 'Ajouter des logements' },
  { key: 'canViewClientHistory', label: 'Historique clients' },
  { key: 'canAccessLoyaltyClients', label: 'Clients fidèles' },
  { key: 'canAccessSeasonalPricing', label: 'Tarification saisonnière' },
  { key: 'canAccessPacks', label: 'Packs multi-logements' },
  { key: 'priorityListing', label: 'Priorité listing' },
  { key: 'badgeExcellence', label: 'Badge formule' },
  { key: 'canConfigurePaymentSettings', label: 'Paramètres paiement' },
  { key: 'canDownloadNotice', label: 'Téléchargement notice' },
  { key: 'canAccessHelpCenter', label: "Centre d'aide" },
  { key: 'canSignContract', label: 'Signature contrat' },
]

interface Props {
  plans: PlanConfig[]
  history: any[]
}

export default function SubscriptionPlansAdmin({ plans: initialPlans, history: initialHistory }: Props) {
  const [tab, setTab] = useState<'formules' | 'acces' | 'creer' | 'historique'>('formules')
  const [plans, setPlans] = useState(initialPlans)
  const [isPending, startTransition] = useTransition()
  const [savingId, setSavingId] = useState<string | null>(null)

  // ── Onglet 1 : Formules ────────────────────────────────────
  const updatePlan = (id: string, field: keyof PlanConfig, value: any) => {
    setPlans((prev) => prev.map((p) => p.id === id ? { ...p, [field]: value } : p))
  }

  const handleSavePlan = (planId: string) => {
    setSavingId(planId)
    const plan = plans.find((p) => p.id === planId)!
    startTransition(async () => {
      const res = await savePlanConfig(planId, {
        name: plan.name,
        description: plan.description,
        color: plan.color,
        badge: plan.badge,
        price_monthly: plan.price_monthly,
        price_quarterly: plan.price_quarterly,
        price_annual: plan.price_annual,
        commission_rate: plan.commission_rate,
        reversement_delay_days: plan.reversement_delay_days,
        max_accommodations: plan.max_accommodations,
        max_concurrent_reservations: plan.max_concurrent_reservations,
        is_active: plan.is_active,
        is_recommended: plan.is_recommended,
      })
      setSavingId(null)
      if (res.success) toast.success(`Plan ${plan.name} sauvegardé`)
      else toast.error(res.error || 'Erreur')
    })
  }

  // ── Onglet 2 : Composition accès ──────────────────────────
  const toggleFeature = (planId: string, featureKey: string) => {
    setPlans((prev) => prev.map((p) => {
      if (p.id !== planId) return p
      const current = !!(p.features as any)[featureKey]
      return { ...p, features: { ...(p.features as any), [featureKey]: !current } }
    }))
  }

  const handleSaveFeatures = (planId: string) => {
    setSavingId(`features-${planId}`)
    const plan = plans.find((p) => p.id === planId)!
    startTransition(async () => {
      const res = await savePlanFeatures(planId, plan.features as any)
      setSavingId(null)
      if (res.success) toast.success(`Accès du plan ${plan.name} sauvegardés`)
      else toast.error(res.error || 'Erreur')
    })
  }

  // ── Onglet 3 : Nouvelle formule ───────────────────────────
  const [newPlan, setNewPlan] = useState({
    id: '', name: '', description: '', color: '#6B7280', badge: '',
    price_monthly: 0, price_quarterly: 0, price_annual: 0,
    commission_rate: 10, reversement_delay_days: 5,
    max_accommodations: 10, max_concurrent_reservations: -1,
    is_active: true, is_recommended: false,
    features: {} as Record<string, boolean>,
  })

  const handleCreatePlan = () => {
    if (!newPlan.id || !newPlan.name) { toast.error('ID et nom requis'); return }
    startTransition(async () => {
      const res = await createPlan(newPlan)
      if (res.success) {
        toast.success('Formule créée')
        setNewPlan({ id: '', name: '', description: '', color: '#6B7280', badge: '', price_monthly: 0, price_quarterly: 0, price_annual: 0, commission_rate: 10, reversement_delay_days: 5, max_accommodations: 10, max_concurrent_reservations: -1, is_active: true, is_recommended: false, features: {} })
      } else {
        toast.error(res.error || 'Erreur')
      }
    })
  }

  const TABS = [
    { id: 'formules', label: 'Formules', icon: Settings2 },
    { id: 'acces', label: 'Composition accès', icon: LayoutGrid },
    { id: 'creer', label: 'Nouvelle formule', icon: Plus },
    { id: 'historique', label: 'Historique', icon: History },
  ] as const

  return (
    <div>
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-beige-200">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t.id ? 'border-dark text-dark' : 'border-transparent text-dark/50 hover:text-dark'
              }`}
            >
              <Icon size={14} /> {t.label}
            </button>
          )
        })}
      </div>

      {/* Onglet 1 — Gestion des formules */}
      {tab === 'formules' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {plans.sort((a, b) => PLAN_ORDER.indexOf(a.id) - PLAN_ORDER.indexOf(b.id)).map((plan) => (
            <div key={plan.id} className="bg-white rounded-2xl border border-beige-200 p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-dark flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full inline-block" style={{ background: plan.color }} />
                  Plan {plan.name}
                </h3>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-dark/60 cursor-pointer">
                    <input type="checkbox" checked={plan.is_active} onChange={(e) => updatePlan(plan.id, 'is_active', e.target.checked)} className="rounded" />
                    Actif
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-dark/60 cursor-pointer">
                    <input type="checkbox" checked={plan.is_recommended} onChange={(e) => updatePlan(plan.id, 'is_recommended', e.target.checked)} className="rounded" />
                    Recommandé
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <label className="label">Nom</label>
                  <input type="text" value={plan.name} onChange={(e) => updatePlan(plan.id, 'name', e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="label">Couleur</label>
                  <div className="flex gap-2">
                    <input type="color" value={plan.color} onChange={(e) => updatePlan(plan.id, 'color', e.target.value)} className="h-9 w-12 rounded-lg border border-beige-200 cursor-pointer" />
                    <input type="text" value={plan.color} onChange={(e) => updatePlan(plan.id, 'color', e.target.value)} className="input-field flex-1" />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="label">Description</label>
                  <input type="text" value={plan.description} onChange={(e) => updatePlan(plan.id, 'description', e.target.value)} className="input-field" />
                </div>

                {/* Paramètres financiers (admin only) */}
                <div className="col-span-2 pt-2 border-t border-beige-100">
                  <p className="text-xs font-semibold text-dark/40 uppercase tracking-widest mb-2">Paramètres financiers</p>
                </div>
                <div>
                  <label className="label">Prix mensuel (FCFA)</label>
                  <input type="number" value={plan.price_monthly} onChange={(e) => updatePlan(plan.id, 'price_monthly', Number(e.target.value))} className="input-field" />
                </div>
                <div>
                  <label className="label">Prix trimestriel (FCFA)</label>
                  <input type="number" value={plan.price_quarterly} onChange={(e) => updatePlan(plan.id, 'price_quarterly', Number(e.target.value))} className="input-field" />
                </div>
                <div>
                  <label className="label">Prix annuel (FCFA)</label>
                  <input type="number" value={plan.price_annual} onChange={(e) => updatePlan(plan.id, 'price_annual', Number(e.target.value))} className="input-field" />
                </div>
                <div>
                  <label className="label">Taux commission (%)</label>
                  <input type="number" value={plan.commission_rate} onChange={(e) => updatePlan(plan.id, 'commission_rate', Number(e.target.value))} className="input-field" />
                </div>
                <div>
                  <label className="label">Délai reversement (jours)</label>
                  <input type="number" value={plan.reversement_delay_days} onChange={(e) => updatePlan(plan.id, 'reversement_delay_days', Number(e.target.value))} className="input-field" />
                </div>

                {/* Capacité */}
                <div className="col-span-2 pt-2 border-t border-beige-100">
                  <p className="text-xs font-semibold text-dark/40 uppercase tracking-widest mb-2">Capacité</p>
                </div>
                <div>
                  <label className="label">Logements max (-1 = illimité)</label>
                  <input type="number" value={plan.max_accommodations} onChange={(e) => updatePlan(plan.id, 'max_accommodations', Number(e.target.value))} className="input-field" />
                </div>
                <div>
                  <label className="label">Réservations simultanées (-1 = illimité)</label>
                  <input type="number" value={plan.max_concurrent_reservations} onChange={(e) => updatePlan(plan.id, 'max_concurrent_reservations', Number(e.target.value))} className="input-field" />
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSavePlan(plan.id)}
                disabled={savingId === plan.id}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-dark text-white rounded-xl text-sm font-medium hover:bg-dark/80 transition-colors disabled:opacity-50"
              >
                {savingId === plan.id ? <><Loader2 size={14} className="animate-spin" /> Sauvegarde...</> : <><Save size={14} /> Sauvegarder</>}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Onglet 2 — Composition des accès */}
      {tab === 'acces' && (
        <div>
          <p className="text-sm text-dark/50 mb-4">Cochez les fonctionnalités disponibles pour chaque plan.</p>
          <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-beige-200 bg-beige-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-dark/50 uppercase tracking-wide w-1/3">Fonctionnalité</th>
                    {plans.sort((a, b) => PLAN_ORDER.indexOf(a.id) - PLAN_ORDER.indexOf(b.id)).map((p) => (
                      <th key={p.id} className="px-4 py-3 text-center text-xs font-semibold" style={{ color: p.color }}>
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ALL_FEATURES.map((feat) => (
                    <tr key={feat.key} className="border-b border-beige-100 hover:bg-beige-50/50">
                      <td className="px-5 py-3 text-dark/70">{feat.label}</td>
                      {plans.sort((a, b) => PLAN_ORDER.indexOf(a.id) - PLAN_ORDER.indexOf(b.id)).map((p) => {
                        const val = !!(p.features as any)[feat.key]
                        return (
                          <td key={p.id} className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleFeature(p.id, feat.key)}
                              className={`w-6 h-6 rounded-md border-2 flex items-center justify-center mx-auto transition-colors ${
                                val ? 'border-green-500 bg-green-500' : 'border-beige-300 bg-white'
                              }`}
                            >
                              {val && <Check size={12} className="text-white" />}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Boutons sauvegarder par plan */}
            <div className="px-5 py-4 border-t border-beige-100 flex flex-wrap gap-2">
              {plans.sort((a, b) => PLAN_ORDER.indexOf(a.id) - PLAN_ORDER.indexOf(b.id)).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSaveFeatures(p.id)}
                  disabled={savingId === `features-${p.id}`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white transition-colors disabled:opacity-50"
                  style={{ background: p.color }}
                >
                  {savingId === `features-${p.id}` ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                  Sauvegarder {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Onglet 3 — Créer une formule */}
      {tab === 'creer' && (
        <div className="bg-white rounded-2xl border border-beige-200 p-6 max-w-2xl space-y-4">
          <h3 className="font-semibold text-dark">Nouvelle formule d&apos;abonnement</h3>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="label">ID unique (ex: premium_plus)</label>
              <input type="text" value={newPlan.id} onChange={(e) => setNewPlan({ ...newPlan, id: e.target.value.toLowerCase().replace(/\s/g, '_') })} className="input-field" placeholder="premium_plus" />
            </div>
            <div>
              <label className="label">Nom affiché</label>
              <input type="text" value={newPlan.name} onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })} className="input-field" placeholder="Premium Plus" />
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <input type="text" value={newPlan.description} onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="label">Couleur</label>
              <div className="flex gap-2">
                <input type="color" value={newPlan.color} onChange={(e) => setNewPlan({ ...newPlan, color: e.target.value })} className="h-9 w-12 rounded-lg border border-beige-200 cursor-pointer" />
                <input type="text" value={newPlan.color} onChange={(e) => setNewPlan({ ...newPlan, color: e.target.value })} className="input-field flex-1" />
              </div>
            </div>
            <div>
              <label className="label">Badge (optionnel)</label>
              <input type="text" value={newPlan.badge} onChange={(e) => setNewPlan({ ...newPlan, badge: e.target.value })} className="input-field" placeholder="Nouveau" />
            </div>

            <div><label className="label">Prix mensuel (FCFA)</label><input type="number" value={newPlan.price_monthly} onChange={(e) => setNewPlan({ ...newPlan, price_monthly: Number(e.target.value) })} className="input-field" /></div>
            <div><label className="label">Prix trimestriel (FCFA)</label><input type="number" value={newPlan.price_quarterly} onChange={(e) => setNewPlan({ ...newPlan, price_quarterly: Number(e.target.value) })} className="input-field" /></div>
            <div><label className="label">Prix annuel (FCFA)</label><input type="number" value={newPlan.price_annual} onChange={(e) => setNewPlan({ ...newPlan, price_annual: Number(e.target.value) })} className="input-field" /></div>
            <div><label className="label">Taux commission (%)</label><input type="number" value={newPlan.commission_rate} onChange={(e) => setNewPlan({ ...newPlan, commission_rate: Number(e.target.value) })} className="input-field" /></div>
            <div><label className="label">Logements max</label><input type="number" value={newPlan.max_accommodations} onChange={(e) => setNewPlan({ ...newPlan, max_accommodations: Number(e.target.value) })} className="input-field" /></div>
            <div><label className="label">Délai reversement (j)</label><input type="number" value={newPlan.reversement_delay_days} onChange={(e) => setNewPlan({ ...newPlan, reversement_delay_days: Number(e.target.value) })} className="input-field" /></div>
          </div>

          <div>
            <p className="label mb-2">Accès inclus</p>
            <div className="grid grid-cols-2 gap-2">
              {ALL_FEATURES.map((feat) => (
                <label key={feat.key} className="flex items-center gap-2 text-sm text-dark/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!newPlan.features[feat.key]}
                    onChange={(e) => setNewPlan({ ...newPlan, features: { ...newPlan.features, [feat.key]: e.target.checked } })}
                    className="rounded"
                  />
                  {feat.label}
                </label>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreatePlan}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gold-500 text-white rounded-xl text-sm font-semibold hover:bg-gold-600 transition-colors disabled:opacity-50"
          >
            {isPending ? <><Loader2 size={15} className="animate-spin" /> Création...</> : <><Plus size={15} /> Créer la formule</>}
          </button>
        </div>
      )}

      {/* Onglet 4 — Historique */}
      {tab === 'historique' && (
        <div>
          <p className="text-sm text-dark/50 mb-4">50 dernières modifications des formules d&apos;abonnement.</p>
          {initialHistory.length === 0 ? (
            <div className="bg-white rounded-2xl border border-beige-200 py-12 text-center text-dark/40">
              <History size={28} className="mx-auto mb-2 opacity-30" />
              <p>Aucune modification enregistrée</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
              <div className="divide-y divide-beige-100">
                {initialHistory.map((entry: any) => (
                  <div key={entry.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-dark text-sm">Plan {entry.planId}</p>
                        <p className="text-xs text-dark/40 mt-0.5">{entry.changedBy || 'admin'} · {entry.changedAt ? new Date(entry.changedAt).toLocaleString('fr-FR') : '—'}</p>
                        <div className="mt-2 text-xs text-dark/60 space-y-0.5">
                          {Object.entries(entry.changes || {}).map(([key, val]) => (
                            key !== 'features' ? (
                              <p key={key}><span className="font-medium">{key}</span> : {String(val)}</p>
                            ) : (
                              <p key={key} className="text-dark/40">Mise à jour des accès</p>
                            )
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
