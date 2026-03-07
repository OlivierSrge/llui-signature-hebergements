'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import {
  Loader2, Trash2, Save, Copy, Check, Tag, KeyRound, Eye, EyeOff,
  MessageCircle, Percent, CreditCard, CalendarDays, Zap, Building2,
} from 'lucide-react'
import { createPartner, updatePartner, deletePartner } from '@/actions/partners'
import type { Partner } from '@/lib/types'
import { PLANS, PLAN_ORDER, type PlanId, type BillingCycle } from '@/lib/plans'

interface Props {
  partner?: Partner
}

function addMonths(dateStr: string, months: number) {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0]
}

function PlanCard({ planId, selected, onSelect }: { planId: PlanId; selected: boolean; onSelect: () => void }) {
  const plan = PLANS[planId]
  const borderColor = selected ? plan.color : '#E5DFD5'
  const bgColor = selected ? plan.color + '10' : 'white'
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left rounded-2xl border-2 p-4 transition-all"
      style={{ borderColor, backgroundColor: bgColor }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-dark text-sm">{plan.name}</span>
        {plan.badge && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: plan.color }}>
            {plan.badge}
          </span>
        )}
      </div>
      <p className="text-xl font-bold" style={{ color: plan.color }}>
        {plan.price === 0 ? 'Gratuit' : `${plan.price.toLocaleString('fr-FR')} FCFA`}
        {plan.price > 0 && <span className="text-xs font-normal text-dark/40">/mois</span>}
      </p>
      <p className="text-xs text-dark/50 mt-1">{plan.description}</p>
      <div className="mt-1.5 text-xs text-dark/40">
        Commission {plan.commissionRate}% —{' '}
        {plan.permissions.maxAccommodations === -1 ? 'Illimité' : `${plan.permissions.maxAccommodations} logements`}
      </div>
      <div className="mt-2 text-xs space-y-0.5">
        {([
          [plan.permissions.canCreateReservations, 'Créer réservations'],
          [plan.permissions.canAccessQrChambre, 'QR Code chambre'],
          [plan.permissions.canAccessMiniSite, 'Mini-site'],
          [plan.permissions.canAccessSeasonalPricing, 'Tarifs saisonniers'],
          [plan.permissions.canAccessPacks, 'Packs multi-logements'],
        ] as [boolean, string][]).map(([ok, label]) => (
          <div key={label} className="flex items-center gap-1">
            <span className={ok ? 'text-green-500' : 'text-dark/20'}>{ok ? '✓' : '✗'}</span>
            <span className={ok ? 'text-dark/70' : 'text-dark/30'}>{label}</span>
          </div>
        ))}
      </div>
    </button>
  )
}

export default function PartnerForm({ partner }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const isEdit = !!partner

  const [selectedPlan, setSelectedPlan] = useState<PlanId>(
    (partner as any)?.subscriptionPlan ?? 'essentiel'
  )
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(
    (partner as any)?.billingCycle ?? 'monthly'
  )
  const [withTrial, setWithTrial] = useState(!isEdit)
  const today = new Date().toISOString().split('T')[0]
  const [startDate, setStartDate] = useState(
    (partner as any)?.subscriptionStartDate?.split('T')[0] ?? today
  )

  const cycleMonths = { monthly: 1, quarterly: 3, annual: 12 }[billingCycle]
  const endDate = addMonths(startDate, cycleMonths)
  const trialEnd = addMonths(today, 1)

  const [commissionOverride, setCommissionOverride] = useState<string>(
    (partner as any)?.commissionRate?.toString() ?? PLANS[selectedPlan].commissionRate.toString()
  )
  const [maxAccOverride, setMaxAccOverride] = useState<string>(
    (partner as any)?.maxAccommodations?.toString() ??
    PLANS[selectedPlan].permissions.maxAccommodations.toString()
  )

  const handlePlanChange = (plan: PlanId) => {
    setSelectedPlan(plan)
    setCommissionOverride(PLANS[plan].commissionRate.toString())
    const max = PLANS[plan].permissions.maxAccommodations
    setMaxAccOverride(max === -1 ? '-1' : max.toString())
  }

  const copyAccessCode = () => {
    if (!partner?.access_code) return
    navigator.clipboard.writeText(partner.access_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('subscriptionPlan', selectedPlan)
    formData.set('billingCycle', billingCycle)
    formData.set('subscriptionStartDate', startDate)
    formData.set('subscriptionEndDate', endDate)
    formData.set('commissionRate', commissionOverride)
    formData.set('maxAccommodations', maxAccOverride)
    if (withTrial && !isEdit) {
      formData.set('trialEndsAt', trialEnd)
      formData.set('subscriptionStatus', 'trial')
    } else if (!formData.get('subscriptionStatus')) {
      formData.set('subscriptionStatus', 'active')
    }

    startTransition(async () => {
      const result = isEdit
        ? await updatePartner(partner.id, formData)
        : await createPartner(formData)
      if (!result.success) { toast.error(result.error); return }
      toast.success(isEdit ? 'Partenaire mis à jour' : 'Partenaire créé')
      router.push('/admin/partenaires')
      router.refresh()
    })
  }

  const handleDelete = async () => {
    if (!partner) return
    if (!confirm('Désactiver ce partenaire ?')) return
    setDeleting(true)
    const result = await deletePartner(partner.id)
    if (!result.success) { toast.error(result.error) }
    else { toast.success('Partenaire désactivé'); router.push('/admin/partenaires') }
    setDeleting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">

      {/* ── 1. Informations de base ── */}
      <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-4">
        <h2 className="font-semibold text-dark border-b border-beige-200 pb-3 flex items-center gap-2">
          <Building2 size={16} className="text-gold-500" /> 1. Informations de base
        </h2>
        <div>
          <label className="label">Nom <span className="text-red-500">*</span></label>
          <input name="name" type="text" required defaultValue={partner?.name} placeholder="Nom de l'entreprise ou du propriétaire" className="input-field" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Téléphone</label>
            <input name="phone" type="tel" defaultValue={partner?.phone || ''} placeholder="+237 6XX XXX XXX" className="input-field" />
          </div>
          <div>
            <label className="label flex items-center gap-1"><MessageCircle size={13} className="text-green-500" /> WhatsApp</label>
            <input name="whatsapp_number" type="tel" defaultValue={partner?.whatsapp_number || ''} placeholder="237612345678" className="input-field" />
          </div>
        </div>
        <div>
          <label className="label">Email</label>
          <input name="email" type="email" defaultValue={partner?.email || ''} placeholder="contact@exemple.com" className="input-field" />
        </div>
        <div>
          <label className="label">Adresse</label>
          <input name="address" type="text" defaultValue={partner?.address || ''} placeholder="Ville, quartier..." className="input-field" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea name="description" rows={2} defaultValue={partner?.description || ''} placeholder="Notes..." className="input-field resize-none" />
        </div>
        <div>
          <label className="label">URL du logo</label>
          <input name="logo_url" type="url" defaultValue={partner?.logo_url || ''} placeholder="https://..." className="input-field" />
        </div>
        {isEdit && (
          <div>
            <label className="label">Statut</label>
            <select name="is_active" defaultValue={partner?.is_active ? 'true' : 'false'} className="input-field">
              <option value="true">Actif</option>
              <option value="false">Inactif</option>
            </select>
          </div>
        )}
      </div>

      {/* ── 2. Plan d'abonnement ── */}
      <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-4">
        <h2 className="font-semibold text-dark border-b border-beige-200 pb-3 flex items-center gap-2">
          <Zap size={16} className="text-gold-500" /> 2. Plan d&apos;abonnement
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {PLAN_ORDER.map((planId) => (
            <PlanCard key={planId} planId={planId} selected={selectedPlan === planId} onSelect={() => handlePlanChange(planId)} />
          ))}
        </div>
        {isEdit && (
          <div>
            <label className="label">Statut abonnement</label>
            <select name="subscriptionStatus" defaultValue={(partner as any)?.subscriptionStatus ?? 'active'} className="input-field">
              <option value="trial">Essai</option>
              <option value="active">Actif</option>
              <option value="suspended">Suspendu</option>
              <option value="expired">Expiré</option>
            </select>
          </div>
        )}
      </div>

      {/* ── 3. Commission & limites ── */}
      <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-4">
        <h2 className="font-semibold text-dark border-b border-beige-200 pb-3 flex items-center gap-2">
          <Percent size={16} className="text-gold-500" /> 3. Commission &amp; limites personnalisées
        </h2>
        <p className="text-xs text-dark/50">Pré-rempli selon le plan. Modifiable pour ce partenaire spécifiquement.</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Taux de commission (%)</label>
            <input type="number" min={0} max={100} step={0.5} value={commissionOverride} onChange={(e) => setCommissionOverride(e.target.value)} className="input-field" />
            <p className="text-xs text-dark/40 mt-1">Plan {PLANS[selectedPlan].name} : {PLANS[selectedPlan].commissionRate}% par défaut</p>
          </div>
          <div>
            <label className="label">Max logements</label>
            <input type="number" min={-1} value={maxAccOverride} onChange={(e) => setMaxAccOverride(e.target.value)} className="input-field" />
            <p className="text-xs text-dark/40 mt-1">-1 = illimité</p>
          </div>
        </div>
        <div className="pt-2 border-t border-beige-100">
          <p className="text-xs font-medium text-dark/60 mb-3">Commission à l&apos;usage (par réservation partenaire)</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Type</label>
              <select name="commission_usage_type" defaultValue={partner?.commission_usage_type || 'percent'} className="input-field">
                <option value="percent">Pourcentage (%)</option>
                <option value="fixed">Fixe (FCFA)</option>
              </select>
            </div>
            <div>
              <label className="label">Valeur</label>
              <input name="commission_usage_value" type="number" min={0} defaultValue={partner?.commission_usage_value ?? ''} placeholder="0" className="input-field" />
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Code promo + Portail ── */}
      <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-4">
        <h2 className="font-semibold text-dark border-b border-beige-200 pb-3 flex items-center gap-2">
          <Tag size={16} className="text-gold-500" /> 4. Code promo &amp; accès portail
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Code promo</label>
            <input name="promo_code" type="text" defaultValue={partner?.promo_code || ''} placeholder="KRIBI10" className="input-field uppercase font-mono tracking-widest" onChange={(e) => { e.currentTarget.value = e.currentTarget.value.toUpperCase() }} />
          </div>
          <div>
            <label className="label">Type réduction</label>
            <select name="promo_discount_type" defaultValue={partner?.promo_discount_type || 'percent'} className="input-field">
              <option value="percent">% Pourcentage</option>
              <option value="fixed">FCFA Fixe</option>
            </select>
          </div>
          <div>
            <label className="label">Valeur</label>
            <input name="promo_discount_value" type="number" min={0} defaultValue={partner?.promo_discount_value || ''} placeholder="10" className="input-field" />
          </div>
        </div>
        <div className="pt-2 border-t border-beige-100 space-y-3">
          {isEdit && partner?.access_code && (
            <div>
              <label className="label">Code d&apos;accès portail</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2.5 bg-beige-50 border border-beige-200 rounded-xl font-mono text-sm font-bold tracking-widest">{partner.access_code}</div>
                <button type="button" onClick={copyAccessCode} className="p-2.5 border border-beige-200 rounded-xl hover:bg-beige-50 text-dark/50">
                  {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          )}
          <div>
            <label className="label flex items-center gap-1"><KeyRound size={13} className="text-gold-500" /> PIN d&apos;accès (4–6 chiffres)</label>
            <div className="relative">
              <input name="access_pin" type={showPin ? 'text' : 'password'} defaultValue={partner?.access_pin || ''} placeholder="ex: 1234" pattern="[0-9]{4,6}" maxLength={6} className="input-field pr-10" />
              <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark/30">
                {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">IBAN / Coordonnées bancaires</label>
            <input name="iban" type="text" defaultValue={partner?.iban || ''} placeholder="FR76 XXXX…" className="input-field font-mono text-sm" />
          </div>
        </div>
      </div>

      {/* ── 5. Facturation ── */}
      <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-4">
        <h2 className="font-semibold text-dark border-b border-beige-200 pb-3 flex items-center gap-2">
          <CreditCard size={16} className="text-gold-500" /> 5. Facturation
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Cycle de facturation</label>
            <select value={billingCycle} onChange={(e) => setBillingCycle(e.target.value as BillingCycle)} className="input-field">
              <option value="monthly">Mensuel</option>
              <option value="quarterly">Trimestriel</option>
              <option value="annual">Annuel</option>
            </select>
          </div>
          <div>
            <label className="label flex items-center gap-1"><CalendarDays size={13} className="text-gold-500" /> Date début</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label">Date fin (calculée)</label>
            <div className="input-field bg-beige-50 text-dark/60 text-sm py-2.5">{endDate}</div>
          </div>
        </div>
        {!isEdit && (
          <label className="flex items-center gap-3 cursor-pointer p-3 bg-beige-50 rounded-xl border border-beige-200">
            <input type="checkbox" checked={withTrial} onChange={(e) => setWithTrial(e.target.checked)} className="w-4 h-4 accent-gold-500" />
            <span className="text-sm text-dark/70">
              Démarrer avec <strong>30 jours d&apos;essai gratuit</strong> — expire le <strong>{trialEnd}</strong>
            </span>
          </label>
        )}
        {selectedPlan !== 'essentiel' && (
          <div className="p-4 bg-gold-50 border border-gold-200 rounded-xl text-sm text-gold-800">
            <p className="font-semibold mb-1">💰 Montant à facturer</p>
            <p>
              {billingCycle === 'monthly' && `${PLANS[selectedPlan].price.toLocaleString('fr-FR')} FCFA/mois`}
              {billingCycle === 'quarterly' && `${(PLANS[selectedPlan].price * 3).toLocaleString('fr-FR')} FCFA/trimestre`}
              {billingCycle === 'annual' && `${(PLANS[selectedPlan].price * 12).toLocaleString('fr-FR')} FCFA/an`}
            </p>
            <p className="text-xs text-gold-600 mt-0.5">Paiement manuel — aucune facturation automatique.</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 pb-8">
        <div className="flex gap-3">
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending
              ? <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" />Enregistrement...</span>
              : <span className="flex items-center gap-2"><Save size={16} />{isEdit ? 'Enregistrer' : 'Créer le partenaire'}</span>
            }
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">Annuler</button>
        </div>
        {isEdit && (
          <button type="button" onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 px-4 py-3 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50">
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Désactiver
          </button>
        )}
      </div>
    </form>
  )
}
