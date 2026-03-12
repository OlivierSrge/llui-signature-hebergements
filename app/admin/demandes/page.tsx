export const dynamic = 'force-dynamic'

import { db } from '@/lib/firebase'
import Link from 'next/link'
import { Bell, Plus, ArrowRight, Phone, Mail, Calendar, Users, CheckCircle2, UserCheck } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import DemandeActions from '@/components/admin/DemandeActions'

async function getDemandes(status?: string, handledBy?: string) {
  const snap = await db.collection('demandes_disponibilite').get()
  let all = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a: any, b: any) => b.created_at?.localeCompare(a.created_at) || 0) as any[]

  if (status && ['en_attente', 'traitee', 'annulee'].includes(status)) {
    all = all.filter((r) => r.status === status)
  }

  // Filtre handled_by uniquement sur les demandes traitées
  if (handledBy === 'admin') {
    all = all.filter((r) => r.handled_by === 'admin')
  } else if (handledBy === 'partner') {
    all = all.filter((r) => r.handled_by === 'partner')
  } else if (handledBy === 'none') {
    // Non encore prises en charge
    all = all.filter((r) => !r.handled_by && r.status === 'en_attente')
  }

  return all
}

// Récupérer le nom du partenaire pour affichage
async function getPartnerNames(partnerIds: string[]): Promise<Record<string, string>> {
  if (partnerIds.length === 0) return {}
  const seen = new Set<string>()
  const unique = partnerIds.filter((id) => { if (seen.has(id)) return false; seen.add(id); return true })
  const names: Record<string, string> = {}
  await Promise.all(
    unique.map(async (id) => {
      const doc = await db.collection('partenaires').doc(id).get()
      if (doc.exists) names[id] = doc.data()?.name || id
    })
  )
  return names
}

const STATUS_FILTERS = [
  { value: '', label: 'Toutes' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'traitee', label: 'Traitées' },
  { value: 'annulee', label: 'Annulées' },
]

const HANDLED_FILTERS = [
  { value: '', label: 'Tous' },
  { value: 'none', label: 'Non traitées' },
  { value: 'admin', label: 'Traitées admin' },
  { value: 'partner', label: 'Traitées partenaire' },
]

export const metadata = { title: 'Demandes de disponibilité' }

export default async function DemandesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; handled_by?: string }>
}) {
  const sp = await searchParams
  const demandes = await getDemandes(sp.status, sp.handled_by)
  const pending = demandes.filter((d) => d.status === 'en_attente' && !d.handled_by).length

  // Résoudre les noms des partenaires
  const partnerIds = demandes
    .filter((d) => d.handled_by === 'partner' && d.handled_by_id)
    .map((d) => d.handled_by_id as string)
  const partnerNames = await getPartnerNames(partnerIds)

  // Stats globales rapides
  const allSnap = await db.collection('demandes_disponibilite').get()
  const all = allSnap.docs.map((d) => d.data())
  const statsAdmin = all.filter((d) => d.handled_by === 'admin').length
  const statsPartner = all.filter((d) => d.handled_by === 'partner').length
  const statsNone = all.filter((d) => !d.handled_by && d.status === 'en_attente').length

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

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{statsNone}</p>
          <p className="text-xs text-red-500 mt-0.5">Non traitées</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{statsAdmin}</p>
          <p className="text-xs text-blue-500 mt-0.5">Traitées admin</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-purple-600">{statsPartner}</p>
          <p className="text-xs text-purple-500 mt-0.5">Traitées partenaire</p>
        </div>
      </div>

      {/* Filtres statut */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-xs text-dark/40 font-medium">Statut :</span>
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/admin/demandes?${f.value ? `status=${f.value}` : ''}${sp.handled_by ? `&handled_by=${sp.handled_by}` : ''}`}
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

      {/* Filtres handled_by */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="text-xs text-dark/40 font-medium">Prise en charge :</span>
        {HANDLED_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/admin/demandes?${sp.status ? `status=${sp.status}&` : ''}${f.value ? `handled_by=${f.value}` : ''}`}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              (sp.handled_by || '') === f.value
                ? 'bg-indigo-600 text-white'
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
            <div key={req.id} className={`bg-white rounded-2xl border p-5 ${
              req.status === 'en_attente' && !req.handled_by
                ? 'border-amber-200 bg-amber-50/30'
                : req.handled_by === 'partner'
                ? 'border-purple-100 bg-purple-50/20'
                : req.handled_by === 'admin'
                ? 'border-blue-100 bg-blue-50/10'
                : 'border-beige-200'
            }`}>
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

                    {/* Badge prise en charge */}
                    {req.handled_by === 'admin' && (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        <CheckCircle2 size={10} /> Admin
                      </span>
                    )}
                    {req.handled_by === 'partner' && (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                        <UserCheck size={10} /> {partnerNames[req.handled_by_id] || 'Partenaire'}
                      </span>
                    )}

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

                  {req.handled_at && (
                    <p className="text-xs text-dark/30 mt-2">
                      Traité le {formatDate(req.handled_at, 'dd/MM/yyyy à HH:mm')}
                    </p>
                  )}

                  {req.reservation_id && (
                    <div className="mt-2">
                      <Link href={`/admin/reservations/${req.reservation_id}`} className="text-xs text-gold-600 hover:underline flex items-center gap-1">
                        Voir la réservation associée <ArrowRight size={10} />
                      </Link>
                    </div>
                  )}
                </div>

                {req.status === 'en_attente' && !req.handled_by && (
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
