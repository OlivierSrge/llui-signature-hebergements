export const dynamic = 'force-dynamic'

import { db } from '@/lib/firebase'
import Link from 'next/link'
import { Bell, Plus, Check, X, ArrowRight, Phone, Mail, Calendar, Users } from 'lucide-react'
import { formatDate, formatPrice } from '@/lib/utils'
import DemandeActions from '@/components/admin/DemandeActions'

async function getDemandes(status?: string) {
  const snap = await db.collection('demandes_disponibilite').get()
  let all = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a: any, b: any) => b.created_at?.localeCompare(a.created_at) || 0) as any[]

  if (status && ['en_attente', 'traitee', 'annulee'].includes(status)) {
    all = all.filter((r) => r.status === status)
  }
  return all
}

const STATUS_FILTERS = [
  { value: '', label: 'Toutes' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'traitee', label: 'Traitées' },
  { value: 'annulee', label: 'Annulées' },
]

export const metadata = { title: 'Demandes de disponibilité' }

export default async function DemandesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const sp = await searchParams
  const demandes = await getDemandes(sp.status)
  const pending = demandes.filter((d) => d.status === 'en_attente').length

  return (
    <div className="p-6 sm:p-8 mt-14 lg:mt-0">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-dark flex items-center gap-3">
            Demandes clients
            {pending > 0 && (
              <span className="bg-red-500 text-white text-base font-bold w-8 h-8 rounded-full flex items-center justify-center">
                {pending}
              </span>
            )}
          </h1>
          <p className="text-dark/50 text-sm mt-1">{demandes.length} demande{demandes.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/admin/demandes?status=${f.value}` : '/admin/demandes'}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              (sp.status || '') === f.value
                ? 'bg-dark text-white'
                : 'bg-white text-dark/60 border border-beige-200 hover:border-dark/30'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {demandes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-beige-200 py-16 text-center text-dark/40">
          <Bell size={32} className="mx-auto mb-3 opacity-30" />
          <p>Aucune demande trouvée</p>
        </div>
      ) : (
        <div className="space-y-3">
          {demandes.map((req) => (
            <div key={req.id} className={`bg-white rounded-2xl border p-5 ${req.status === 'en_attente' ? 'border-amber-200 bg-amber-50/30' : 'border-beige-200'}`}>
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="font-semibold text-dark">{req.guest_first_name} {req.guest_last_name}</h3>
                    <span className={`badge text-xs px-2.5 py-0.5 ${
                      req.status === 'en_attente' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                      req.status === 'traitee' ? 'bg-green-100 text-green-700 border-green-200' :
                      'bg-gray-100 text-gray-500 border-gray-200'
                    }`}>
                      {req.status === 'en_attente' ? 'En attente' : req.status === 'traitee' ? 'Traitée' : 'Annulée'}
                    </span>
                    <span className="text-xs text-dark/40">{formatDate(req.created_at, 'dd/MM/yyyy HH:mm')}</span>
                  </div>

                  <p className="text-sm font-medium text-gold-700 mb-2">📍 {req.product_name}</p>

                  <div className="flex flex-wrap gap-4 text-sm text-dark/60">
                    {req.guest_phone && (
                      <span className="flex items-center gap-1.5"><Phone size={12} className="text-gold-500" />{req.guest_phone}</span>
                    )}
                    {req.guest_email && (
                      <span className="flex items-center gap-1.5"><Mail size={12} className="text-gold-500" />{req.guest_email}</span>
                    )}
                    {req.check_in && req.check_out && (
                      <span className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-gold-500" />
                        {formatDate(req.check_in, 'dd/MM/yyyy')} → {formatDate(req.check_out, 'dd/MM/yyyy')}
                      </span>
                    )}
                    {req.guests && (
                      <span className="flex items-center gap-1.5"><Users size={12} className="text-gold-500" />{req.guests} personne{req.guests > 1 ? 's' : ''}</span>
                    )}
                  </div>

                  {req.message && (
                    <div className="mt-3 p-3 bg-beige-50 rounded-xl border border-beige-200">
                      <p className="text-xs text-dark/50 mb-1 font-medium">Message du client</p>
                      <p className="text-sm text-dark/70">{req.message}</p>
                    </div>
                  )}

                  {req.reservation_id && (
                    <div className="mt-2">
                      <Link href={`/admin/reservations/${req.reservation_id}`} className="text-xs text-gold-600 hover:underline flex items-center gap-1">
                        Voir la réservation associée <ArrowRight size={10} />
                      </Link>
                    </div>
                  )}
                </div>

                {req.status === 'en_attente' && (
                  <div className="flex sm:flex-col gap-2 flex-shrink-0">
                    <Link
                      href={`/admin/reservations/nouvelle?from_demand=${req.id}&product_id=${req.product_id}&check_in=${req.check_in || ''}&check_out=${req.check_out || ''}&guests=${req.guests || 2}&first_name=${encodeURIComponent(req.guest_first_name)}&last_name=${encodeURIComponent(req.guest_last_name)}&phone=${encodeURIComponent(req.guest_phone || '')}&email=${encodeURIComponent(req.guest_email || '')}`}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gold-500 text-white rounded-xl text-xs font-medium hover:bg-gold-600 whitespace-nowrap"
                    >
                      <Plus size={12} /> Créer réservation
                    </Link>
                    <DemandeActions demandeId={req.id} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
