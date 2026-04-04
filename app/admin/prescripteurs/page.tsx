export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Plus, Bike, Users, TrendingUp, Wallet } from 'lucide-react'
import { getPrescripteurs, getPrescripteurTypes, seedPrescripteurTypes } from '@/actions/prescripteurs'
import PrescripteurListClient from './PrescripteurListClient'
import AnalyticsDashboard from './AnalyticsDashboard'

export const metadata = { title: 'Prescripteurs – Admin' }

export default async function AdminPrescripeursPage() {
  // Seed auto des types si la collection est vide
  try {
    const types = await getPrescripteurTypes()
    if (types.length === 0) await seedPrescripteurTypes()
  } catch {}

  const [prescripteurs, types] = await Promise.all([
    getPrescripteurs(),
    getPrescripteurTypes(),
  ])

  const actifs    = prescripteurs.filter((p) => p.statut === 'actif').length
  const suspendus = prescripteurs.filter((p) => p.statut === 'suspendu').length
  const totalClients = prescripteurs.reduce((s, p) => s + (p.total_clients_amenes ?? 0), 0)
  const totalSolde   = prescripteurs.reduce((s, p) => s + (p.solde_fcfa ?? 0), 0)

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-dark">Prescripteurs</h1>
          <p className="text-dark/50 text-sm mt-1">
            {prescripteurs.length} prescripteur{prescripteurs.length !== 1 ? 's' : ''} —&nbsp;
            {actifs} actif{actifs !== 1 ? 's' : ''}
            {suspendus > 0 && `, ${suspendus} suspendu${suspendus !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link
          href="/admin/prescripteurs/nouveau"
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Nouveau prescripteur
        </Link>
      </div>

      {/* KPIs statiques */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={<Users size={20} />} label="Total" value={prescripteurs.length} />
        <KpiCard icon={<Bike size={20} />}       label="Actifs"           value={actifs} color="green" />
        <KpiCard icon={<TrendingUp size={20} />}  label="Clients amenés"  value={totalClients} />
        <KpiCard icon={<Wallet size={20} />}      label="Soldes dus (FCFA)" value={totalSolde.toLocaleString('fr-FR')} color="gold" />
      </div>

      {/* Analytics dynamiques (Client Component avec période filtrée) */}
      <AnalyticsDashboard />

      {/* Table interactive (client component) */}
      <PrescripteurListClient
        prescripteurs={prescripteurs}
        types={types}
      />
    </div>
  )
}

function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color?: 'green' | 'gold' }) {
  const colorClass =
    color === 'green' ? 'text-green-600 bg-green-50' :
    color === 'gold'  ? 'text-amber-600 bg-amber-50' :
    'text-dark bg-cream'
  return (
    <div className={`rounded-xl p-4 flex items-center gap-3 ${colorClass}`}>
      <div className="opacity-70">{icon}</div>
      <div>
        <p className="text-xs opacity-60 font-medium">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  )
}
