import { getClassementMensuel } from '@/actions/classement-prescripteurs'

const MEDAILLES = ['🥇', '🥈', '🥉']

export default async function ClassementMensuel() {
  const classement = await getClassementMensuel().catch(() => [])

  const now = new Date()
  const moisLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  return (
    <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-beige-200 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-dark">🏆 Classement du mois</h2>
          <p className="text-dark/40 text-xs mt-0.5 capitalize">{moisLabel} · Score = clients×0.7 + note×3</p>
        </div>
        {classement.length === 0 && (
          <span className="text-xs text-dark/30">Aucune donnée ce mois</span>
        )}
      </div>

      {classement.length === 0 ? (
        <p className="text-center py-10 text-dark/30 text-sm">Aucun prescripteur actif avec activité ce mois</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-beige-200 bg-beige-50">
                {['Rang', 'Prescripteur', 'Type', 'Clients / mois', 'Note', 'Commission', 'Score'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-dark/40 font-semibold uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {classement.map((p, idx) => (
                <tr key={p.uid} className={`border-b border-beige-100 ${idx < 3 ? 'bg-amber-50/40' : 'hover:bg-beige-50'}`}>
                  <td className="px-4 py-3 text-lg font-bold text-dark/70 w-14">
                    {idx < 3 ? MEDAILLES[idx] : `#${idx + 1}`}
                  </td>
                  <td className="px-4 py-3">
                    <a href={`/admin/prescripteurs/${p.uid}`} className="font-semibold text-dark hover:text-gold-600 transition-colors">
                      {p.nom_complet}
                    </a>
                    {p.badge_confiance && (
                      <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">🏆</span>
                    )}
                    <p className="text-dark/40 text-xs">{p.telephone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-dark/60 bg-dark/5 px-2 py-0.5 rounded-full">{p.type}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-dark">{p.clients_ce_mois}</td>
                  <td className="px-4 py-3">
                    {p.total_notes > 0 ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[#C9A84C]">★</span>
                        <span className="font-medium text-dark">{p.note_moyenne.toFixed(1)}</span>
                        <span className="text-dark/30 text-xs">({p.total_notes})</span>
                      </div>
                    ) : (
                      <span className="text-dark/20 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gold-600 font-semibold whitespace-nowrap">
                    {p.commission_ce_mois.toLocaleString('fr-FR')} F
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-xl text-sm font-bold ${
                      idx === 0 ? 'bg-amber-100 text-amber-700' :
                      idx === 1 ? 'bg-slate-100 text-slate-600' :
                      idx === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-dark/5 text-dark/60'
                    }`}>
                      {p.score}
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
