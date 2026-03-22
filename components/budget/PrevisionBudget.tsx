'use client'
// components/budget/PrevisionBudget.tsx — P8-D Prévision budget finale
// Réutilisable : portail marié (lecture seule) + admin (onglet versements)

interface VersementItem {
  montant: number
  date?: string
  statut: string  // 'confirme' | 'declare'
}

interface PrevisionBudgetProps {
  budget_total: number
  versements: VersementItem[]
  date_mariage: string   // ISO YYYY-MM-DD ou vide
  /** Titre affiché en haut du bloc (optionnel) */
  titre?: string
  /** Lecture seule — pas de différence visuelle actuellement, prévu pour extensions futures */
  readOnly?: boolean
}

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return iso }
}

/** Nombre de jours entre maintenant et une date ISO */
function joursRestants(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

/**
 * Projette la date à laquelle le solde sera soldé, sur la base
 * des versements confirmés passés (fréquence + montant moyen).
 * Retourne null si projection impossible (pas de versement, solde nul…).
 */
function projeterDateSolde(versements: VersementItem[], budget_total: number): string | null {
  const confirmes = versements
    .filter(v => v.statut === 'confirme' && v.date)
    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())

  const totalVerse = confirmes.reduce((s, v) => s + v.montant, 0)
  const reste = budget_total - totalVerse

  if (reste <= 0 || confirmes.length === 0 || budget_total <= 0) return null

  // Montant moyen par versement confirmé
  const montantMoyen = totalVerse / confirmes.length
  if (montantMoyen <= 0) return null

  // Fréquence : delta moyen entre versements (en jours), ou 30 j par défaut
  let deltaJours = 30
  if (confirmes.length >= 2) {
    let totalDelta = 0
    for (let i = 1; i < confirmes.length; i++) {
      totalDelta +=
        (new Date(confirmes[i].date!).getTime() - new Date(confirmes[i - 1].date!).getTime()) /
        86_400_000
    }
    deltaJours = Math.max(7, totalDelta / (confirmes.length - 1)) // plancher 7 j
  }

  // Nb versements supplémentaires nécessaires
  const nbRestants = Math.ceil(reste / montantMoyen)

  // Date de solde = dernier versement + nbRestants × deltaJours
  const dernierDate = new Date(confirmes[confirmes.length - 1].date!)
  const dateSolde = new Date(dernierDate.getTime() + nbRestants * deltaJours * 86_400_000)

  return dateSolde.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function PrevisionBudget({
  budget_total,
  versements,
  date_mariage,
  titre = 'Prévision budget finale',
  readOnly: _readOnly,
}: PrevisionBudgetProps) {
  if (budget_total <= 0) return null   // Pas de budget défini → ne pas afficher

  const confirmes = versements.filter(v => v.statut === 'confirme')
  const totalVerse  = confirmes.reduce((s, v) => s + v.montant, 0)
  const resteAPayer = Math.max(0, budget_total - totalVerse)
  const pct         = Math.min(100, budget_total > 0 ? (totalVerse / budget_total) * 100 : 0)
  const pctRounded  = Math.round(pct)

  // Couleur barre : vert >= 80 %, orange >= 50 %, rouge sinon
  const barColor = pct >= 80 ? '#7C9A7E' : pct >= 50 ? '#C9A84C' : '#C0392B'

  // Projection
  const dateSolde = projeterDateSolde(versements, budget_total)

  // Alerte : mariage dans < 30 jours et solde non nul
  const joursAvantMariage = date_mariage ? joursRestants(date_mariage) : null
  const alerteUrgence =
    joursAvantMariage !== null &&
    joursAvantMariage > 0 &&
    joursAvantMariage < 30 &&
    resteAPayer > 0

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
      {/* En-tête */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">💰</span>
        <p className="text-xs font-semibold text-[#888] uppercase tracking-wide">{titre}</p>
      </div>

      {/* Alerte urgence */}
      {alerteUrgence && (
        <div
          className="mb-3 rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-2"
          style={{ background: '#C0392B15', color: '#C0392B', border: '1px solid #C0392B30' }}
        >
          <span>⚠️</span>
          <span>
            Mariage dans {joursAvantMariage} jour{joursAvantMariage > 1 ? 's' : ''} —
            solde restant : {formatFCFA(resteAPayer)}
          </span>
        </div>
      )}

      {/* Grille 2 × 2 KPIs */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-xl p-3" style={{ background: '#F5F0E8' }}>
          <p className="text-[10px] text-[#888] mb-0.5 uppercase tracking-wide">Pack signé</p>
          <p className="text-sm font-bold text-[#1A1A1A]">{formatFCFA(budget_total)}</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: '#7C9A7E15' }}>
          <p className="text-[10px] text-[#888] mb-0.5 uppercase tracking-wide">Versé (confirmé)</p>
          <p className="text-sm font-bold" style={{ color: totalVerse > 0 ? '#7C9A7E' : '#AAA' }}>
            {formatFCFA(totalVerse)}
          </p>
        </div>
        <div className="rounded-xl p-3" style={{ background: resteAPayer === 0 ? '#7C9A7E15' : '#C9A84C15' }}>
          <p className="text-[10px] text-[#888] mb-0.5 uppercase tracking-wide">Reste à payer</p>
          <p
            className="text-sm font-bold"
            style={{ color: resteAPayer === 0 ? '#7C9A7E' : alerteUrgence ? '#C0392B' : '#C9A84C' }}
          >
            {resteAPayer === 0 ? '✅ Soldé' : formatFCFA(resteAPayer)}
          </p>
        </div>
        <div className="rounded-xl p-3" style={{ background: '#F5F0E8' }}>
          <p className="text-[10px] text-[#888] mb-0.5 uppercase tracking-wide">Règlement</p>
          <p className="text-sm font-bold" style={{ color: barColor }}>{pctRounded} %</p>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="mb-4">
        <div className="flex justify-between text-[10px] text-[#888] mb-1">
          <span>0 %</span>
          <span className="font-semibold" style={{ color: barColor }}>{pctRounded} %</span>
          <span>100 %</span>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: '#F5F0E8' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: barColor }}
          />
        </div>
      </div>

      {/* Projection */}
      {dateSolde ? (
        <div
          className="rounded-xl px-3 py-2.5 text-xs flex items-start gap-2"
          style={{ background: '#C9A84C12', border: '1px solid #C9A84C30' }}
        >
          <span className="mt-0.5 shrink-0">📅</span>
          <div>
            <p className="font-semibold text-[#1A1A1A]">Projection solde</p>
            <p className="text-[#888] mt-0.5">
              À ce rythme, le solde sera soldé le{' '}
              <strong className="text-[#C9A84C]">{dateSolde}</strong>
              {date_mariage && (
                <>
                  {' '}
                  <span className="text-[#AAA]">
                    (mariage le {formatDate(date_mariage)})
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      ) : resteAPayer === 0 ? (
        <div
          className="rounded-xl px-3 py-2.5 text-xs flex items-center gap-2"
          style={{ background: '#7C9A7E15', border: '1px solid #7C9A7E30' }}
        >
          <span>🎉</span>
          <p className="font-semibold text-[#7C9A7E]">Budget intégralement soldé — félicitations !</p>
        </div>
      ) : (
        <div
          className="rounded-xl px-3 py-2.5 text-xs flex items-center gap-2"
          style={{ background: '#F5F0E8', border: '1px solid #E8E0D0' }}
        >
          <span>ℹ️</span>
          <p className="text-[#888]">Déclarez vos premiers versements pour obtenir une projection.</p>
        </div>
      )}
    </div>
  )
}
