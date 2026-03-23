// app/admin/fonds-solidarite/page.tsx — #162 Fonds solidarité (admin)
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Fonds Solidarité — Admin L&Lui' }

interface MarieContrib {
  uid: string
  noms_maries: string
  date_mariage: string
  montant_total_mariage: number
  contribution_solidarite: number
  badge_solidaire: boolean
}

async function getData() {
  try {
    const db = getDb()
    const snap = await db.collection('portail_users')
      .where('statut', 'in', ['actif', 'termine'])
      .limit(100).get()

    let totalFonds = 0
    let totalMariages = 0
    const contributions: MarieContrib[] = []

    snap.docs.forEach(doc => {
      const d = doc.data()
      const montant = (d.montant_total_devis as number) || (d.budget_total as number) || 0
      if (montant > 0) {
        const contrib = Math.round(montant * 0.01)
        totalFonds += contrib
        totalMariages++
        const dateRaw = d.date_mariage ?? d.projet?.date_evenement
        const dateISO: string = dateRaw?.toDate
          ? dateRaw.toDate().toISOString().slice(0, 10)
          : typeof dateRaw === 'string' ? dateRaw : ''
        contributions.push({
          uid: doc.id,
          noms_maries: (d.noms_maries as string) || 'Couple',
          date_mariage: dateISO,
          montant_total_mariage: montant,
          contribution_solidarite: contrib,
          badge_solidaire: (d.badge_solidaire as boolean) || false,
        })
      }
    })
    contributions.sort((a, b) => b.contribution_solidarite - a.contribution_solidarite)
    return { totalFonds, totalMariages, contributions }
  } catch {
    return { totalFonds: 0, totalMariages: 0, contributions: [] }
  }
}

const PROJETS_SOLIDARITE = [
  { titre: 'Bourses jeunes photographes Kribi', description: 'Formation 6 mois pour 3 photographes locaux', budget: 450000, statut: 'en_cours' },
  { titre: 'Aide repas mariage familles modestes', description: 'Subvention partielle traiteur pour couples boursiers', budget: 300000, statut: 'actif' },
  { titre: 'Reforestation côte de Kribi', description: 'Plantation 500 arbres en nom des couples', budget: 150000, statut: 'planifie' },
]

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

function formatDate(iso: string) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return iso }
}

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  en_cours: { label: 'En cours', color: '#5B8FBF', bg: '#5B8FBF15' },
  actif: { label: 'Actif', color: '#7C9A7E', bg: '#7C9A7E15' },
  planifie: { label: 'Planifié', color: '#C9A84C', bg: '#C9A84C15' },
}

export default async function FondsSolidaritePage() {
  const { totalFonds, totalMariages, contributions } = await getData()
  const totalProjetsBudget = PROJETS_SOLIDARITE.reduce((s, p) => s + p.budget, 0)
  const pctEngage = totalFonds > 0 ? Math.min(100, Math.round((totalProjetsBudget / totalFonds) * 100)) : 0

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fonds Solidarité L&Lui 💚</h1>
        <p className="text-sm text-gray-500 mt-1">1% de chaque mariage reversé automatiquement — Rapport de gestion</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total fonds collecté', value: formatFCFA(totalFonds), color: '#7C9A7E', icon: '💰' },
          { label: 'Mariages contributeurs', value: `${totalMariages}`, color: '#5B8FBF', icon: '💍' },
          { label: 'Budget engagé projets', value: formatFCFA(totalProjetsBudget), color: '#C9A84C', icon: '🌱' },
          { label: 'Taux engagement', value: `${pctEngage}%`, color: '#9B7ED4', icon: '📊' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: '1px solid #F5F0E8' }}>
            <p className="text-2xl mb-1">{k.icon}</p>
            <p className="text-xl font-bold" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs text-gray-500 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Barre progression */}
      <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid #F5F0E8' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-gray-700">Fonds collecté vs. projets engagés</p>
          <span className="text-sm font-bold" style={{ color: '#7C9A7E' }}>{pctEngage}%</span>
        </div>
        <div className="bg-gray-100 rounded-full h-3">
          <div className="h-3 rounded-full transition-all" style={{ width: `${pctEngage}%`, background: 'linear-gradient(90deg, #7C9A7E, #5B8FBF)' }} />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0 FCFA</span>
          <span>{formatFCFA(totalFonds)}</span>
        </div>
      </div>

      {/* Projets solidaires */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">🌱 Projets soutenus</h2>
        <div className="space-y-3">
          {PROJETS_SOLIDARITE.map(p => {
            const cfg = STATUT_CONFIG[p.statut] || STATUT_CONFIG.planifie
            const pctProjet = totalFonds > 0 ? Math.min(100, Math.round((p.budget / totalFonds) * 100)) : 0
            return (
              <div key={p.titre} className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: '1px solid #F5F0E8' }}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{p.titre}</p>
                    <p className="text-xs text-gray-500">{p.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold" style={{ color: '#C9A84C' }}>{formatFCFA(p.budget)}</p>
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                  </div>
                </div>
                <div className="bg-gray-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full" style={{ width: `${pctProjet}%`, background: cfg.color }} />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">{pctProjet}% du fonds total alloué</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tableau contributions couples */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">💍 Contributions par couple</h2>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid #F5F0E8' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: '#F5F0E8' }}>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Couple</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Date</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase">Mariage</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase">1% solidarité</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-gray-500 uppercase">Badge</th>
                </tr>
              </thead>
              <tbody>
                {contributions.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">Aucune contribution enregistrée</td></tr>
                )}
                {contributions.map((c, i) => (
                  <tr key={c.uid} className="border-b last:border-0" style={{ borderColor: '#F5F0E8', background: i % 2 === 0 ? 'white' : '#FAFAF8' }}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{c.noms_maries}</p>
                      <p className="text-[10px] text-gray-400">{c.uid.slice(0, 8)}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(c.date_mariage)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-700">{formatFCFA(c.montant_total_mariage)}</td>
                    <td className="px-4 py-3 text-right font-bold" style={{ color: '#7C9A7E' }}>{formatFCFA(c.contribution_solidarite)}</td>
                    <td className="px-4 py-3 text-center">
                      {c.badge_solidaire
                        ? <span className="text-[10px] px-2 py-1 rounded-full font-bold" style={{ background: '#7C9A7E15', color: '#7C9A7E' }}>💚 Solidaire</span>
                        : <span className="text-[10px] text-gray-300">—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
              {contributions.length > 0 && (
                <tfoot>
                  <tr style={{ background: '#F5F0E8' }}>
                    <td colSpan={3} className="px-4 py-3 text-sm font-bold text-gray-700">TOTAL</td>
                    <td className="px-4 py-3 text-right text-sm font-bold" style={{ color: '#7C9A7E' }}>{formatFCFA(totalFonds)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
