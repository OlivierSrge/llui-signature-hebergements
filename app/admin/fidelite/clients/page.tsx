export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getFideliteClients } from '@/actions/fidelite'
import FideliteClientsTable from '@/components/admin/FideliteClientsTable'

export const metadata = { title: 'Clients — Fidélité L&Lui Stars' }

export default async function FideliteClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; niveau?: string; promo?: string; page?: string }>
}) {
  const sp = await searchParams
  const page = Number(sp.page || 1)

  const result = await getFideliteClients({
    search: sp.q,
    niveau: sp.niveau,
    promoStatus: sp.promo as any,
    page,
  })

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/fidelite"
          className="p-2 rounded-xl border border-beige-200 hover:bg-beige-50 text-dark/50 hover:text-dark">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="font-serif text-3xl font-semibold text-dark">Clients Fidélité</h1>
          <p className="text-dark/50 text-sm mt-1">Programme L&Lui Stars — {result.total} client(s)</p>
        </div>
      </div>

      <FideliteClientsTable
        clients={result.clients}
        total={result.total}
        totalPages={result.totalPages}
        currentPage={result.page}
      />
    </div>
  )
}
