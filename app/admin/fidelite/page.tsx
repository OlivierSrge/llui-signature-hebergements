export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Settings, Users, TrendingUp, Tag, ShoppingBag, Award } from 'lucide-react'
import { getLoyaltyConfig, getDashboardStats, getDashboardChartData, getLevelDistributionStats, getActionsRequired, getPendingNotifications } from '@/actions/fidelite'
import { formatPrice } from '@/lib/utils'
import FideliteToggleProgram from '@/components/admin/FideliteToggleProgram'
import FideliteDashboardCharts from '@/components/admin/FideliteDashboardCharts'
import FideliteActionsPanel from '@/components/admin/FideliteActionsPanel'

export const metadata = { title: 'Fidélité L&Lui Stars' }

export default async function FidelitePage() {
  const [config, stats, chartData, levelStats, actions, pendingNotifications] = await Promise.all([
    getLoyaltyConfig(),
    getDashboardStats(),
    getDashboardChartData(),
    getLevelDistributionStats(),
    getActionsRequired(),
    getPendingNotifications(30),
  ])

  const programActive = config.programActive ?? true
  const currentYear = new Date().getFullYear()

  const totalPromo = stats.promoActive + stats.promoExpired + stats.promoNone
  const promoBarWidth = totalPromo === 0 ? 0 : Math.round((stats.promoActive / totalPromo) * 100)

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0 space-y-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-dark">Programme de Fidélité L&Lui Stars</h1>
          <p className="text-dark/50 text-sm mt-1">Administration du programme de fidélité client</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <FideliteToggleProgram initialActive={programActive} />
          <Link href="/admin/fidelite/parametres"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-beige-200 text-sm text-dark/70 hover:bg-beige-50 transition-colors">
            <Settings size={15} /> Paramètres
          </Link>
        </div>
      </div>

      {/* Alerte programme suspendu */}
      {!programActive && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-800">
          ⚠️ <strong>Programme suspendu</strong> — Les clients ne cumulent plus de points et ne peuvent pas utiliser leurs avantages.
        </div>
      )}

      {/* KPI Cards — Ligne 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total clients */}
        <div className="bg-white rounded-2xl border border-beige-200 p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-dark/40 font-medium">Total clients inscrits</p>
            <Users size={15} className="text-gold-500" />
          </div>
          <p className="text-3xl font-bold text-dark">{stats.totalClients}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`text-xs font-medium ${stats.evolutionClients >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {stats.evolutionClients >= 0 ? '+' : ''}{stats.evolutionClients}%
            </span>
            <span className="text-xs text-dark/40">vs mois précédent</span>
          </div>
          <p className="text-xs text-dark/40 mt-0.5">{stats.newClientsThisMonth} nouveaux ce mois</p>
        </div>

        {/* Points distribués */}
        <div className="bg-white rounded-2xl border border-beige-200 p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-dark/40 font-medium">Points distribués ce mois</p>
            <TrendingUp size={15} className="text-gold-500" />
          </div>
          <p className="text-3xl font-bold text-dark">{stats.totalPointsThisMonth.toLocaleString('fr-FR')}</p>
          <p className="text-xs text-dark/40 mt-1">Données disponibles à partir de l'activation</p>
        </div>

        {/* Réductions accordées */}
        <div className="bg-white rounded-2xl border border-beige-200 p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-dark/40 font-medium">Réductions accordées ce mois</p>
            <Tag size={15} className="text-gold-500" />
          </div>
          <p className="text-2xl font-bold text-dark">{formatPrice(stats.totalReductions)}</p>
          <p className="text-xs text-dark/40 mt-1">Sur réservations confirmées</p>
        </div>
      </div>

      {/* KPI Cards — Ligne 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Répartition niveaux (mini) */}
        <div className="bg-white rounded-2xl border border-beige-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-dark/40 font-medium">Répartition niveaux</p>
            <Award size={15} className="text-gold-500" />
          </div>
          <div className="space-y-1.5">
            {[
              { label: '👑 Excellence', count: stats.levelDistribution.excellence, color: 'bg-dark' },
              { label: '⭐⭐⭐ Ambassadeur', count: stats.levelDistribution.ambassadeur, color: 'bg-gold-500' },
              { label: '⭐⭐ Explorateur', count: stats.levelDistribution.explorateur, color: 'bg-blue-400' },
              { label: '⭐ Novice', count: stats.levelDistribution.novice, color: 'bg-gray-300' },
            ].map((l) => (
              <div key={l.label} className="flex items-center justify-between text-xs">
                <span className="text-dark/70">{l.label}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-beige-100 rounded-full overflow-hidden">
                    <div className={`h-full ${l.color} rounded-full`}
                      style={{ width: `${stats.totalClients === 0 ? 0 : Math.round((l.count / stats.totalClients) * 100)}%` }} />
                  </div>
                  <span className="font-semibold text-dark w-4 text-right">{l.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Codes promo */}
        <div className="bg-white rounded-2xl border border-beige-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-dark/40 font-medium">Codes promo boutique</p>
            <Tag size={15} className="text-gold-500" />
          </div>
          <div className="flex items-end gap-1 mb-2">
            <span className="text-2xl font-bold text-dark">{stats.promoActive}</span>
            <span className="text-sm text-dark/40 mb-0.5">actifs</span>
            <span className="text-sm text-dark/40 mb-0.5 ml-1">/ {stats.promoExpired} expirés</span>
          </div>
          <div className="w-full h-2 bg-beige-100 rounded-full overflow-hidden">
            <div className="h-full bg-gold-400 rounded-full" style={{ width: `${promoBarWidth}%` }} />
          </div>
          <p className="text-xs text-dark/40 mt-1.5">{stats.promoNone} clients sans code</p>
        </div>

        {/* Taux utilisation boutique */}
        <div className="bg-white rounded-2xl border border-beige-200 p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-dark/40 font-medium">Utilisation boutique ce mois</p>
            <ShoppingBag size={15} className="text-gold-500" />
          </div>
          <p className="text-3xl font-bold text-dark">{stats.promoUsageRate}%</p>
          <p className="text-xs text-dark/40 mt-1">
            {stats.clientsWithBoutiqueThisMonth} client(s) avec achat boutique
          </p>
        </div>
      </div>

      {/* Graphiques + tableau niveaux */}
      <FideliteDashboardCharts
        chartData={chartData}
        levelStats={levelStats}
        levelDistribution={stats.levelDistribution}
        currentYear={currentYear}
      />

      {/* Actions requises + Notifications */}
      <FideliteActionsPanel
        levelUpWithoutPromo={actions.levelUpWithoutPromo}
        expiredCodes={actions.expiredCodes}
        birthdayClients={actions.birthdayClients}
        pendingNotifications={pendingNotifications as any}
      />

      {/* Lien liste clients */}
      <div className="flex justify-end">
        <Link href="/admin/fidelite/clients"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark text-white text-sm font-medium hover:bg-dark/90 transition-colors">
          <Users size={15} /> Gérer les clients
        </Link>
      </div>
    </div>
  )
}
