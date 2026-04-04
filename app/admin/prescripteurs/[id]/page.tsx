export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Pencil, QrCode, ArrowLeft } from 'lucide-react'
import { getPrescripteur, getReservationsPrescripteur, getRetraitsPrescripteur } from '@/actions/prescripteurs'
import { formatDate, formatPrice } from '@/lib/utils'
import RetraitsList from './RetraitsList'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const presc = await getPrescripteur(params.id)
  return { title: presc ? `${presc.nom_complet} – Admin` : 'Prescripteur introuvable' }
}

export default async function PrescripteurDetailPage({ params }: { params: { id: string } }) {
  const [prescripteur, reservations, retraits] = await Promise.all([
    getPrescripteur(params.id),
    getReservationsPrescripteur(params.id),
    getRetraitsPrescripteur(params.id),
  ])

  if (!prescripteur) notFound()

  const totalCommissions = reservations.reduce((sum: number, r: any) => sum + (r.commission_prescripteur_fcfa ?? 0), 0)
  const retraitsDemandes = retraits.filter((r) => r.statut === 'demande')

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0 space-y-8">
      {/* Back */}
      <Link href="/admin/prescripteurs" className="inline-flex items-center gap-2 text-sm text-dark/50 hover:text-dark transition-colors">
        <ArrowLeft size={14} /> Retour à la liste
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-dark">{prescripteur.nom_complet}</h1>
          <p className="text-dark/50 text-sm mt-1">{prescripteur.telephone} · {prescripteur.code_promo}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href={`/admin/prescripteurs/${params.id}/modifier`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dark/20 text-sm font-medium text-dark/70 hover:bg-dark/5 transition-colors"
          >
            <Pencil size={14} /> Modifier
          </Link>
          {prescripteur.hebergements_assignes?.map((hId) => (
            <Link
              key={hId}
              href={`/admin/prescripteurs/qr-residence/${hId}`}
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gold-300 text-sm font-medium text-gold-700 hover:bg-gold-50 transition-colors"
            >
              <QrCode size={14} /> QR {hId.slice(-4).toUpperCase()}
            </Link>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Statut', value: prescripteur.statut === 'actif' ? 'Actif' : 'Suspendu', color: prescripteur.statut === 'actif' ? 'text-green-600' : 'text-red-500' },
          { label: 'Clients amenés', value: prescripteur.total_clients_amenes ?? 0, color: 'text-dark' },
          { label: 'Commission totale', value: `${totalCommissions.toLocaleString('fr-FR')} F`, color: 'text-gold-600' },
          { label: 'Solde dû', value: `${(prescripteur.solde_fcfa ?? 0).toLocaleString('fr-FR')} F`, color: (prescripteur.solde_fcfa ?? 0) > 0 ? 'text-amber-600' : 'text-dark/40' },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-beige-200 p-5">
            <p className="text-xs text-dark/40 mb-1">{k.label}</p>
            <p className={`text-xl font-semibold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Info + QR perso */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-beige-200 p-6 space-y-3">
          <h2 className="font-semibold text-dark mb-4">Informations</h2>
          {[
            { label: 'Type', value: prescripteur.type },
            { label: 'Commission', value: `${prescripteur.commission_fcfa} FCFA / client` },
            { label: 'Code promo', value: prescripteur.code_promo },
            { label: 'Créé le', value: formatDate(prescripteur.created_at, 'dd/MM/yyyy') },
            { label: 'Résidences', value: prescripteur.hebergements_assignes?.length ? `${prescripteur.hebergements_assignes.length} résidence(s)` : 'Aucune' },
          ].map((item) => (
            <div key={item.label} className="flex justify-between text-sm">
              <span className="text-dark/50">{item.label}</span>
              <span className="font-medium text-dark">{item.value}</span>
            </div>
          ))}
        </div>

        {prescripteur.qr_code_url && (
          <div className="bg-white rounded-2xl border border-beige-200 p-6 flex flex-col items-center gap-3">
            <h2 className="font-semibold text-dark self-start">QR Code personnel</h2>
            <img
              src={prescripteur.qr_code_url}
              alt="QR Code prescripteur"
              className="w-40 h-40 rounded-xl"
            />
            <p className="text-xs text-dark/40 text-center">À imprimer et accrocher sur la moto/véhicule</p>
          </div>
        )}
      </div>

      {/* Retraits en attente */}
      {retraitsDemandes.length > 0 && (
        <RetraitsList retraits={retraitsDemandes} prescripteurId={params.id} titre="Retraits en attente de validation" />
      )}

      {/* Historique réservations */}
      <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-beige-200">
          <h2 className="font-semibold text-dark">Clients amenés ({reservations.length})</h2>
        </div>
        {reservations.length === 0 ? (
          <p className="text-center py-10 text-dark/40 text-sm">Aucune réservation</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-beige-200 bg-beige-50">
                  {['Réf.', 'Client', 'Hébergement', 'Dates', 'Commission', 'Statut'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-dark/50 font-semibold uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(reservations as any[]).map((r) => (
                  <tr key={r.id} className="border-b border-beige-100 hover:bg-beige-50">
                    <td className="px-4 py-3 font-mono text-xs text-gold-600">#{r.id.slice(-8).toUpperCase()}</td>
                    <td className="px-4 py-3 font-medium">{r.guest_first_name} {r.guest_last_name}</td>
                    <td className="px-4 py-3 text-dark/60 max-w-[160px] truncate">{r.accommodation?.name ?? r.pack_name ?? '—'}</td>
                    <td className="px-4 py-3 text-dark/60 whitespace-nowrap">
                      {r.check_in ? formatDate(r.check_in, 'dd/MM/yy') : '—'} → {r.check_out ? formatDate(r.check_out, 'dd/MM/yy') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gold-600">{r.commission_prescripteur_fcfa?.toLocaleString('fr-FR')} F</span>
                      <br />
                      <span className={`text-xs ${r.commission_statut === 'creditee' ? 'text-green-600' : r.commission_statut === 'annulee' ? 'text-red-500' : 'text-amber-600'}`}>
                        {r.commission_statut === 'creditee' ? 'Créditée ✓' : r.commission_statut === 'annulee' ? 'Annulée' : 'En attente'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${r.reservation_status === 'confirmee' ? 'bg-green-100 text-green-700' : r.reservation_status === 'annulee' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                        {r.reservation_status === 'confirmee' ? 'Confirmée' : r.reservation_status === 'annulee' ? 'Annulée' : 'En attente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historique retraits */}
      {retraits.length > 0 && (
        <RetraitsList retraits={retraits} prescripteurId={params.id} titre="Historique des retraits" showAll />
      )}
    </div>
  )
}
