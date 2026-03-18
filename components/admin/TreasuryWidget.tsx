// TreasuryWidget — Widget trésorerie et sources — Server Component
import { Banknote, Clock, TrendingUp } from 'lucide-react'

interface TreasuryStats {
  encaisseDirectCeMois: number
  accomptesEnAttente: number
  accomptesEnAttenteCount: number
  ratioLlui: number
  bySource: Array<{
    label: string
    icon: string
    count: number
    totalMontant: number
    encaisseLlui: number
    pctLlui: number
  }>
}

function formatFCFA(n: number) {
  return n.toLocaleString('fr-FR') + ' FCFA'
}

export default function TreasuryWidget({ stats }: { stats: TreasuryStats }) {
  return (
    <div className="bg-white rounded-2xl border border-beige-200 p-5 space-y-5">
      <h2 className="font-semibold text-dark flex items-center gap-2">
        <Banknote size={16} className="text-gold-500" /> Trésorerie et Sources
      </h2>

      {/* 3 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <TrendingUp size={16} className="text-green-600 mx-auto mb-1" />
          <p className="text-lg font-bold text-green-700">{formatFCFA(stats.encaisseDirectCeMois)}</p>
          <p className="text-xs text-green-600 mt-0.5">💰 Encaissé directement ce mois</p>
          <p className="text-[10px] text-green-500 mt-0.5">Site L&Lui + acomptes QR Code</p>
        </div>
        <div className={`${stats.accomptesEnAttenteCount > 0 ? 'bg-orange-50 border-orange-200' : 'bg-beige-50 border-beige-100'} border rounded-xl p-3 text-center`}>
          <Clock size={16} className={`${stats.accomptesEnAttenteCount > 0 ? 'text-orange-500' : 'text-dark/30'} mx-auto mb-1`} />
          <p className={`text-lg font-bold ${stats.accomptesEnAttenteCount > 0 ? 'text-orange-700' : 'text-dark/50'}`}>
            {stats.accomptesEnAttenteCount > 0 ? formatFCFA(stats.accomptesEnAttente) : '—'}
          </p>
          <p className={`text-xs mt-0.5 ${stats.accomptesEnAttenteCount > 0 ? 'text-orange-600' : 'text-dark/40'}`}>⏳ Acomptes en attente</p>
          {stats.accomptesEnAttenteCount > 0 && <p className="text-[10px] text-orange-500 mt-0.5">{stats.accomptesEnAttenteCount} réservation(s)</p>}
        </div>
        <div className="bg-gold-50 border border-gold-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-gold-700">{stats.ratioLlui}%</p>
          <p className="text-xs text-gold-600 mt-0.5">📊 Part encaissée L&Lui</p>
          <p className="text-[10px] text-gold-500 mt-0.5">vs partenaires ce mois</p>
        </div>
      </div>

      {/* Tableau par source */}
      {stats.bySource.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-beige-200">
                <th className="text-left py-2 text-dark/50 font-semibold">Source</th>
                <th className="text-right py-2 text-dark/50 font-semibold">Nb</th>
                <th className="text-right py-2 text-dark/50 font-semibold">Total</th>
                <th className="text-right py-2 text-dark/50 font-semibold">Encaissé L&Lui</th>
                <th className="text-right py-2 text-dark/50 font-semibold">%</th>
              </tr>
            </thead>
            <tbody>
              {stats.bySource.map((row) => (
                <tr key={row.label} className="border-b border-beige-50">
                  <td className="py-2 font-medium text-dark">{row.icon} {row.label}</td>
                  <td className="py-2 text-right text-dark/60">{row.count}</td>
                  <td className="py-2 text-right text-dark/60">{row.totalMontant.toLocaleString('fr-FR')}</td>
                  <td className="py-2 text-right font-semibold text-gold-700">{row.encaisseLlui.toLocaleString('fr-FR')}</td>
                  <td className="py-2 text-right">
                    <span className={`px-1.5 py-0.5 rounded-full font-bold ${row.pctLlui === 100 ? 'bg-green-100 text-green-700' : row.pctLlui > 0 ? 'bg-gold-100 text-gold-700' : 'bg-gray-100 text-gray-500'}`}>
                      {row.pctLlui}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
