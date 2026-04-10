export const dynamic = 'force-dynamic'

import { getCommissionsCommerciaux } from '@/actions/commerciaux'
import { TrendingUp, Users, Banknote, CheckCircle2, Clock } from 'lucide-react'
import MarquerVerseeButton from './MarquerVerseeButton'

export const metadata = { title: 'Commissions Commerciaux — Admin' }

export default async function CommissionsCommerciauxPage() {
  const data = await getCommissionsCommerciaux()

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-dark">Commissions Commerciaux</h1>
        <p className="text-dark/50 text-sm mt-1">
          Suivi des commissions du réseau commercial partenaire — 50% L&Lui / 50% commercial
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-beige-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Banknote size={16} className="text-dark/40" />
            <p className="text-xs text-dark/50">Total commissions</p>
          </div>
          <p className="text-2xl font-bold text-dark">{data.total_fcfa.toLocaleString('fr-FR')}</p>
          <p className="text-xs text-dark/40">FCFA</p>
        </div>

        <div className="bg-white rounded-2xl border border-beige-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-gold-500" />
            <p className="text-xs text-dark/50">Part L&Lui</p>
          </div>
          <p className="text-2xl font-bold text-gold-600">{data.llui_part_fcfa.toLocaleString('fr-FR')}</p>
          <p className="text-xs text-dark/40">FCFA</p>
        </div>

        <div className="bg-white rounded-2xl border border-blue-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-blue-500" />
            <p className="text-xs text-dark/50">Part commerciaux</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">{data.commercial_part_fcfa.toLocaleString('fr-FR')}</p>
          <p className="text-xs text-dark/40">FCFA total</p>
        </div>

        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-amber-500" />
            <p className="text-xs text-amber-700">À verser</p>
          </div>
          <p className="text-2xl font-bold text-amber-700">{data.dues_fcfa.toLocaleString('fr-FR')}</p>
          <p className="text-xs text-amber-600">FCFA dues</p>
        </div>
      </div>

      {/* Table par commercial */}
      {data.par_commercial.length === 0 ? (
        <div className="bg-white rounded-2xl border border-beige-200 p-12 text-center">
          <Users size={40} className="text-dark/20 mx-auto mb-4" />
          <h3 className="font-serif text-xl text-dark mb-2">Aucune commission</h3>
          <p className="text-dark/50 text-sm">
            Les commissions apparaîtront ici dès qu'un commercial enregistrera un client.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-beige-100">
            <h2 className="font-semibold text-dark">Détail par commercial</h2>
          </div>
          <div className="divide-y divide-beige-100">
            {data.par_commercial.map((c) => (
              <div key={c.commercial_id} className="px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-semibold text-dark">{c.commercial_nom}</p>
                    <span className="text-xs text-dark/40 bg-beige-100 px-2 py-0.5 rounded-full">
                      {c.partenaire_nom}
                    </span>
                  </div>
                  {c.commercial_telephone && (
                    <p className="text-xs text-dark/40 mb-2">{c.commercial_telephone}</p>
                  )}
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                    <span className="text-dark/60">
                      <span className="font-semibold text-dark">{c.total_reservations}</span> réservation{c.total_reservations > 1 ? 's' : ''}
                    </span>
                    <span className="text-dark/60">
                      Total commission :{' '}
                      <span className="font-semibold text-dark">{c.part_commercial_fcfa.toLocaleString('fr-FR')} FCFA</span>
                    </span>
                    {c.versees_fcfa > 0 && (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        {c.versees_fcfa.toLocaleString('fr-FR')} FCFA versés
                      </span>
                    )}
                    {c.dues_fcfa > 0 && (
                      <span className="text-amber-600 flex items-center gap-1">
                        <Clock size={12} />
                        {c.dues_fcfa.toLocaleString('fr-FR')} FCFA à verser
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  {/* WhatsApp contact */}
                  {c.commercial_telephone && (
                    <a
                      href={`https://wa.me/${c.commercial_telephone.replace(/\D/g, '')}?text=${encodeURIComponent(`Bonjour ${c.commercial_nom} ! Concernant vos commissions L&Lui Signature...`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 rounded-lg font-medium text-white flex items-center gap-1.5"
                      style={{ background: '#25D366' }}
                    >
                      📲 WhatsApp
                    </a>
                  )}
                  {/* Marquer versée */}
                  <MarquerVerseeButton
                    commercialId={c.commercial_id}
                    commercialNom={c.commercial_nom}
                    duesFcfa={c.dues_fcfa}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Footer totaux */}
          <div className="px-6 py-4 bg-beige-50 border-t border-beige-200 flex justify-between items-center text-sm">
            <span className="text-dark/50">Total versé</span>
            <span className="font-bold text-green-600">{data.versees_fcfa.toLocaleString('fr-FR')} FCFA</span>
          </div>
        </div>
      )}
    </div>
  )
}
