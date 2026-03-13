'use client'

import { PLANS, PLAN_ORDER } from '@/lib/plans'
import { Check } from 'lucide-react'

const WHATSAPP_ADMIN = '693407964'

const FEATURE_LABELS: Record<string, string> = {
  canViewReservations: 'Voir les réservations',
  canCreateReservations: 'Créer des réservations',
  canViewCalendar: 'Calendrier de disponibilité',
  canBlockDates: 'Bloquer des dates',
  canAccessQrChambre: 'QR Code chambre',
  canAccessQrReception: 'QR Code réception',
  canAccessMiniSite: 'Mini-site partenaire',
  canCustomizeMiniSite: 'Personnalisation mini-site',
  canAccessMessaging: 'Messagerie clients',
  canViewBasicStats: 'Statistiques de base',
  canViewAdvancedStats: 'Statistiques avancées',
  canAccessSeasonalPricing: 'Tarification saisonnière',
  weeklyWhatsAppReport: 'Rapport WhatsApp hebdo',
  canAccessPacks: 'Gestion des packs',
  priorityListing: 'Mise en avant prioritaire',
  badgeExcellence: 'Badge Excellence',
  canReceiveWhatsAppNotifications: 'Notifications WhatsApp',
}

const FEATURES_TO_SHOW = [
  'canViewReservations',
  'canCreateReservations',
  'canBlockDates',
  'canAccessQrChambre',
  'canAccessQrReception',
  'canAccessMiniSite',
  'canAccessMessaging',
  'canViewBasicStats',
  'canViewAdvancedStats',
  'canAccessSeasonalPricing',
  'weeklyWhatsAppReport',
  'priorityListing',
  'badgeExcellence',
]

export default function UpgradePage() {
  function handleChoose(planId: string, planName: string) {
    const today = new Date().toLocaleDateString('fr-FR')
    const partnerName = 'Partenaire' // will be replaced by partner session name if available
    const msg = encodeURIComponent(
      `Demande upgrade plan ${planName} — ${partnerName} — ${today}`
    )
    window.open(`https://wa.me/${WHATSAPP_ADMIN}?text=${msg}`, '_blank')
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: '#F5F0E8' }}>
      <header className="bg-white border-b border-[#C9A84C]/30 px-4 py-5">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-serif text-2xl font-semibold text-[#1A1A1A]">Mettre à niveau</h1>
          <p className="text-sm text-[#1A1A1A]/50 mt-1">Choisissez le plan adapté à votre activité</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId]
          const perms = plan.permissions

          return (
            <div
              key={planId}
              className="bg-white rounded-2xl border overflow-hidden shadow-sm"
              style={{ borderColor: `${plan.color}40` }}
            >
              {/* Header plan */}
              <div className="px-5 py-4 flex items-start justify-between gap-3" style={{ borderBottom: `1px solid ${plan.color}20` }}>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h2 className="font-serif text-lg font-semibold" style={{ color: plan.color }}>
                      {plan.name}
                    </h2>
                    {plan.badge && (
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                        style={{ background: plan.color }}
                      >
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#1A1A1A]/50">{plan.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {plan.price === 0 ? (
                    <p className="font-bold text-xl text-[#1A1A1A]">Gratuit</p>
                  ) : (
                    <>
                      <p className="font-bold text-xl text-[#1A1A1A]">
                        {plan.price.toLocaleString('fr-FR')}
                      </p>
                      <p className="text-xs text-[#1A1A1A]/40">FCFA / mois</p>
                    </>
                  )}
                  <p className="text-xs mt-0.5 text-[#1A1A1A]/40">
                    Conditions définies dans votre contrat
                  </p>
                </div>
              </div>

              {/* Features */}
              <div className="px-5 py-3">
                <div className="grid grid-cols-1 gap-1.5">
                  {FEATURES_TO_SHOW.map((feat) => {
                    const val = (perms as any)[feat]
                    const active = val === true || (typeof val === 'number' && val > 0)
                    return (
                      <div
                        key={feat}
                        className={`flex items-center gap-2 text-xs ${active ? 'text-[#1A1A1A]/70' : 'text-[#1A1A1A]/25'}`}
                      >
                        <Check
                          size={12}
                          className={active ? 'flex-shrink-0' : 'flex-shrink-0 opacity-20'}
                          style={{ color: active ? plan.color : undefined }}
                        />
                        {FEATURE_LABELS[feat] ?? feat}
                        {feat === 'maxAccommodations' && (
                          <span className="ml-auto">
                            {perms.maxAccommodations === -1 ? 'Illimité' : `${perms.maxAccommodations} max`}
                          </span>
                        )}
                      </div>
                    )
                  })}
                  {/* Logements max */}
                  <div className="flex items-center gap-2 text-xs text-[#1A1A1A]/70 mt-1 pt-1 border-t border-[#1A1A1A]/5">
                    <Check size={12} style={{ color: plan.color }} className="flex-shrink-0" />
                    <span>Logements</span>
                    <span className="ml-auto font-semibold" style={{ color: plan.color }}>
                      {perms.maxAccommodations === -1 ? 'Illimité' : `${perms.maxAccommodations} max`}
                    </span>
                  </div>
                </div>
              </div>

              {/* CTA */}
              {plan.price > 0 && (
                <div className="px-5 pb-4">
                  <button
                    onClick={() => handleChoose(plan.id, plan.name)}
                    className="w-full py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                    style={{ background: plan.color }}
                  >
                    💬 Choisir le plan {plan.name}
                  </button>
                </div>
              )}
            </div>
          )
        })}

        <p className="text-center text-xs text-[#1A1A1A]/30 pb-4">
          Le passage au plan supérieur se fait via WhatsApp avec l&apos;équipe L&amp;Lui Signature.
        </p>
      </main>
    </div>
  )
}
