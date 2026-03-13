export const dynamic = 'force-dynamic'

import { db } from '@/lib/firebase'
import Link from 'next/link'
import { Users, ArrowRight, Crown, Star, Search } from 'lucide-react'
import type { LoyaltyClient } from '@/lib/types'
import { NIVEAUX } from '@/lib/loyalty'
import AdminCreateClientForm from '@/components/admin/AdminCreateClientForm'
import AdminSyncClientsButton from '@/components/admin/AdminSyncClientsButton'

async function getAllClients(search?: string): Promise<LoyaltyClient[]> {
  const snap = await db.collection('clients').get()
  let clients = snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as LoyaltyClient))
    .sort((a, b) => b.totalSejours - a.totalSejours || a.firstName.localeCompare(b.firstName))

  if (search) {
    const q = search.toLowerCase()
    clients = clients.filter(
      (c) =>
        c.firstName?.toLowerCase().includes(q) ||
        c.lastName?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.memberCode?.toLowerCase().includes(q)
    )
  }
  return clients
}

export const metadata = { title: 'Clients fidèles' }

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const sp = await searchParams
  const search = sp.q?.trim()
  const clients = await getAllClients(search)

  const byNiveau = {
    excellence: clients.filter((c) => c.niveau === 'excellence').length,
    ambassadeur: clients.filter((c) => c.niveau === 'ambassadeur').length,
    explorateur: clients.filter((c) => c.niveau === 'explorateur').length,
    novice: clients.filter((c) => c.niveau === 'novice').length,
  }

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-dark">Clients fidèles</h1>
          <p className="text-dark/50 text-sm mt-1">Programme L&Lui Stars</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <AdminSyncClientsButton />
          <AdminCreateClientForm />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Excellence 👑', count: byNiveau.excellence, color: 'bg-amber-50 text-amber-700 border-amber-200' },
          { label: 'Ambassadeur ⭐⭐⭐', count: byNiveau.ambassadeur, color: 'bg-blue-50 text-blue-700 border-blue-200' },
          { label: 'Explorateur ⭐⭐', count: byNiveau.explorateur, color: 'bg-green-50 text-green-700 border-green-200' },
          { label: 'Novice ⭐', count: byNiveau.novice, color: 'bg-beige-50 text-dark/70 border-beige-200' },
        ].map((item) => (
          <div key={item.label} className={`rounded-xl border p-4 text-center ${item.color}`}>
            <p className="text-2xl font-bold">{item.count}</p>
            <p className="text-xs font-medium mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Recherche */}
      <form method="GET" className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark/30" />
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder="Rechercher par nom, email ou code membre…"
          className="input-field pl-10 w-full max-w-md"
        />
      </form>

      {/* Liste */}
      {clients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-beige-200 py-16 text-center">
          <Users size={40} className="text-dark/20 mx-auto mb-3" />
          <p className="text-dark/50">Aucun client trouvé</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
          <div className="divide-y divide-beige-100">
            {clients.map((client) => {
              const niveau = NIVEAUX[client.niveau || 'novice']
              return (
                <Link
                  key={client.id}
                  href={`/admin/clients/${client.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-beige-50 transition-colors"
                >
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: niveau.bgColor, color: niveau.color, border: `1.5px solid ${niveau.borderColor}` }}
                  >
                    {client.firstName?.[0]}{client.lastName?.[0]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-dark text-sm">{client.firstName} {client.lastName}</p>
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ background: niveau.bgColor, color: niveau.color }}
                      >
                        {niveau.emoji} {niveau.label}
                      </span>
                    </div>
                    <p className="text-xs text-dark/50 truncate">{client.email}</p>
                    <p className="text-xs text-dark/40">Code : {client.memberCode}</p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-dark">{client.totalSejours} séjour{(client.totalSejours ?? 0) > 1 ? 's' : ''}</p>
                    <p className="text-xs text-dark/40">{client.totalPoints || 0} pts</p>
                  </div>

                  <ArrowRight size={14} className="text-dark/30 flex-shrink-0" />
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
