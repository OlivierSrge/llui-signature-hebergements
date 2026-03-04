export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { db } from '@/lib/firebase'
import { Plus, Users, Mail, Phone, MapPin } from 'lucide-react'
import type { Partner } from '@/lib/types'

async function getPartners(): Promise<Partner[]> {
  const snap = await db.collection('partenaires').get()
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Partner)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
}

export const metadata = { title: 'Partenaires – Admin' }

export default async function AdminPartenairesPage() {
  const partners = await getPartners()

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-dark">Partenaires</h1>
          <p className="text-dark/50 text-sm mt-1">{partners.length} partenaire{partners.length > 1 ? 's' : ''} au total</p>
        </div>
        <Link href="/admin/partenaires/nouveau" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nouveau partenaire
        </Link>
      </div>

      {partners.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-beige-200">
          <Users size={40} className="mx-auto mb-4 text-dark/20" />
          <h3 className="font-serif text-xl text-dark mb-2">Aucun partenaire</h3>
          <p className="text-dark/50 mb-6">Créez votre premier partenaire propriétaire.</p>
          <Link href="/admin/partenaires/nouveau" className="btn-primary">Créer un partenaire</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {partners.map((partner) => (
            <Link
              key={partner.id}
              href={`/admin/partenaires/${partner.id}`}
              className="group block bg-white rounded-2xl border border-beige-200 hover:shadow-card transition-shadow p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {partner.logo_url ? (
                    <img src={partner.logo_url} alt={partner.name} className="w-10 h-10 rounded-full object-cover border border-beige-200" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gold-100 flex items-center justify-center">
                      <span className="text-gold-600 font-semibold text-sm">{partner.name.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-dark group-hover:text-gold-600 transition-colors">{partner.name}</h3>
                  </div>
                </div>
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                  partner.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {partner.is_active ? 'Actif' : 'Inactif'}
                </span>
              </div>

              <div className="space-y-1.5 text-sm text-dark/60">
                {partner.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="text-dark/30 flex-shrink-0" />
                    <span className="truncate">{partner.email}</span>
                  </div>
                )}
                {partner.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-dark/30 flex-shrink-0" />
                    <span>{partner.phone}</span>
                  </div>
                )}
                {partner.address && (
                  <div className="flex items-center gap-2">
                    <MapPin size={13} className="text-dark/30 flex-shrink-0" />
                    <span className="truncate">{partner.address}</span>
                  </div>
                )}
              </div>

              {partner.description && (
                <p className="text-xs text-dark/40 mt-3 line-clamp-2">{partner.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
