export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { db } from '@/lib/firebase'
import { Plus, Users, Mail, Phone, MapPin, FileSignature, AlertTriangle } from 'lucide-react'
import type { Partner } from '@/lib/types'
import { initializeMissingContracts, getContractStats } from '@/actions/contract'

interface PartnerWithContract extends Partner {
  contractStatus?: string
  contractId?: string
  signedAt?: string
}

async function getPartners(): Promise<PartnerWithContract[]> {
  const snap = await db.collection('partenaires').get()
  return snap.docs
    .map((d) => {
      const data = d.data()
      return {
        id: d.id,
        ...data,
        contractStatus: data.contract?.status || 'not_sent',
        contractId: data.contract?.contractId || '',
        signedAt: data.contract?.signedAt || null,
      } as PartnerWithContract
    })
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
}

export const metadata = { title: 'Partenaires – Admin' }

const CONTRACT_BADGE: Record<string, { label: string; className: string }> = {
  not_sent: { label: 'Non envoyé', className: 'bg-gray-100 text-gray-500' },
  sent: { label: 'Envoyé', className: 'bg-blue-100 text-blue-700' },
  otp_pending: { label: 'OTP en cours', className: 'bg-amber-100 text-amber-700' },
  signed: { label: 'Signé ✓', className: 'bg-green-100 text-green-700' },
}

export default async function AdminPartenairesPage() {
  // Initialiser silencieusement les partenaires sans contrat
  await initializeMissingContracts()

  const [partners, contractStats] = await Promise.all([
    getPartners(),
    getContractStats(),
  ])

  const unsignedCount = contractStats.total - contractStats.signed

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-dark">Partenaires</h1>
          <p className="text-dark/50 text-sm mt-1">{partners.length} partenaire{partners.length > 1 ? 's' : ''} au total</p>
        </div>
        <Link href="/admin/partenaires/nouveau" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nouveau partenaire
        </Link>
      </div>

      {/* Alerte contrats non signés */}
      {unsignedCount > 0 && (
        <div className="flex items-center gap-3 mb-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              {unsignedCount} partenaire{unsignedCount > 1 ? 's' : ''} sans contrat signé
            </p>
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-amber-600">
              <span>{contractStats.not_sent} non envoyé{contractStats.not_sent > 1 ? 's' : ''}</span>
              {contractStats.sent > 0 && <span>{contractStats.sent} envoyé{contractStats.sent > 1 ? 's' : ''}</span>}
              {contractStats.otp_pending > 0 && <span>{contractStats.otp_pending} OTP en cours</span>}
              <span className="text-green-600">{contractStats.signed} signé{contractStats.signed > 1 ? 's' : ''}</span>
            </div>
          </div>
          <Link
            href="/admin/contrat"
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex-shrink-0"
          >
            <FileSignature size={12} /> Gérer les contrats
          </Link>
        </div>
      )}

      {partners.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-beige-200">
          <Users size={40} className="mx-auto mb-4 text-dark/20" />
          <h3 className="font-serif text-xl text-dark mb-2">Aucun partenaire</h3>
          <p className="text-dark/50 mb-6">Créez votre premier partenaire propriétaire.</p>
          <Link href="/admin/partenaires/nouveau" className="btn-primary">Créer un partenaire</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {partners.map((partner) => {
            const contractBadge = CONTRACT_BADGE[partner.contractStatus || 'not_sent'] || CONTRACT_BADGE.not_sent
            return (
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

                {/* Badge contrat */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-beige-100">
                  <div className="flex items-center gap-1.5">
                    <FileSignature size={12} className="text-dark/30" />
                    <span className="text-xs text-dark/40">Contrat</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${contractBadge.className}`}>
                    {contractBadge.label}
                  </span>
                </div>

                {partner.description && (
                  <p className="text-xs text-dark/40 mt-2 line-clamp-2">{partner.description}</p>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
