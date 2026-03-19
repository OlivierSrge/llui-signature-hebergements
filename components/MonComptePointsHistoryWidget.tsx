import Link from 'next/link'
import { TrendingUp } from 'lucide-react'

interface PointsEntry {
  id: string
  action: string
  description: string
  points: number
  created_at: string
}

interface Props {
  history: PointsEntry[]
  totalPoints: number
}

const ACTION_LABELS: Record<string, string> = {
  sejour: 'Séjour confirmé',
  parrainage: 'Parrainage validé',
  boutique: 'Achat boutique',
  bonus: 'Bonus',
  anniversaire: 'Anniversaire',
  anniversaire_sejour: 'Anniversaire de séjour',
  premiere_reservation: 'Première réservation',
  paiement_anticipe: 'Paiement anticipé',
  avis: 'Avis déposé',
  manuel: 'Ajustement manuel',
  admin: 'Ajustement admin',
}

function formatAction(action: string): string {
  return ACTION_LABELS[action] || action
}

export default function MonComptePointsHistoryWidget({ history, totalPoints }: Props) {
  const last10 = history.slice(0, 10)

  return (
    <div className="bg-white rounded-2xl border border-beige-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-dark flex items-center gap-2">
          <TrendingUp size={16} className="text-gold-500" />
          Mes points récents
        </h3>
        <span className="text-lg font-bold text-dark">{totalPoints} pts</span>
      </div>

      {last10.length === 0 ? (
        <p className="text-sm text-dark/40 text-center py-4">
          Aucune transaction de points pour le moment.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-beige-100">
                  <th className="text-left text-xs text-dark/40 font-medium pb-2 px-1">Date</th>
                  <th className="text-left text-xs text-dark/40 font-medium pb-2 px-1">Action</th>
                  <th className="text-right text-xs text-dark/40 font-medium pb-2 px-1">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-beige-50">
                {last10.map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-2.5 px-1 text-xs text-dark/50 whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: '2-digit', year: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-1 text-dark/70">
                      <p className="font-medium">{formatAction(entry.action)}</p>
                      {entry.description && (
                        <p className="text-xs text-dark/40 mt-0.5">{entry.description}</p>
                      )}
                    </td>
                    <td className="py-2.5 px-1 text-right">
                      <span className={`font-bold text-sm ${entry.points >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {entry.points >= 0 ? '+' : ''}{entry.points} pts
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 pt-3 border-t border-beige-100 text-center">
            <Link
              href="/mon-compte/points"
              className="text-sm font-semibold text-gold-600 hover:text-gold-700"
            >
              Voir tout l'historique →
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
