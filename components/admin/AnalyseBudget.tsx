'use client'
// components/admin/AnalyseBudget.tsx — #122 Analyse prédictive budget

interface VersementLibre {
  montant: number
  statut: string
  date?: string
}

interface Props {
  marie_uid: string
  noms_maries: string
  budget_total: number
  versements: VersementLibre[]
  date_mariage: string
}

// Données historiques L&Lui (anonymisées)
const HISTORIQUE_LLUI = {
  traiteur_pct: 0.35,         // 35% du budget total
  decoration_pct: 0.20,       // 20%
  hebergement_pct: 0.18,      // 18%
  beaute_pct: 0.08,           // 8%
  photographie_pct: 0.10,     // 10%
  divers_pct: 0.09,           // 9%
  versement_j90_pct: 0.30,    // 30% versé à J-90 en moyenne
  versement_j60_pct: 0.50,    // 50% versé à J-60
  versement_j30_pct: 0.80,    // 80% versé à J-30
  versement_j7_pct: 1.00,     // 100% versé à J-7
  depassement_moyen_pct: 0.12, // dépassement moyen de 12%
}

function fmt(n: number) { return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA' }

function joursAvant(dateMariage: string): number {
  if (!dateMariage) return 999
  const dm = new Date(dateMariage)
  dm.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((dm.getTime() - today.getTime()) / 86400000)
}

export default function AnalyseBudget({ noms_maries, budget_total, versements, date_mariage }: Props) {
  if (budget_total <= 0) return null

  const jours = joursAvant(date_mariage)
  const totalVerse = versements.filter(v => v.statut === 'confirme').reduce((acc, v) => acc + v.montant, 0)
  const pctVerse = totalVerse / budget_total

  // Seuil attendu selon le milestone actuel
  let seuilAttendu = 0
  let milestoneLabel = ''
  if (jours > 90) { seuilAttendu = 0; milestoneLabel = 'avant J-90' }
  else if (jours > 60) { seuilAttendu = HISTORIQUE_LLUI.versement_j90_pct; milestoneLabel = 'J-90' }
  else if (jours > 30) { seuilAttendu = HISTORIQUE_LLUI.versement_j60_pct; milestoneLabel = 'J-60' }
  else if (jours > 7) { seuilAttendu = HISTORIQUE_LLUI.versement_j30_pct; milestoneLabel = 'J-30' }
  else { seuilAttendu = HISTORIQUE_LLUI.versement_j7_pct; milestoneLabel = 'J-7' }

  const retard = pctVerse < seuilAttendu - 0.1
  const avance = pctVerse >= seuilAttendu
  const ecart = totalVerse - budget_total * seuilAttendu
  const budgetRisque = budget_total * (1 + HISTORIQUE_LLUI.depassement_moyen_pct)
  const depassementPrevu = budgetRisque - budget_total

  // Répartition recommandée
  const repartition = [
    { label: 'Traiteur', pct: HISTORIQUE_LLUI.traiteur_pct, emoji: '🍛' },
    { label: 'Décoration', pct: HISTORIQUE_LLUI.decoration_pct, emoji: '🌸' },
    { label: 'Hébergement', pct: HISTORIQUE_LLUI.hebergement_pct, emoji: '🏨' },
    { label: 'Photographie', pct: HISTORIQUE_LLUI.photographie_pct, emoji: '📸' },
    { label: 'Beauté', pct: HISTORIQUE_LLUI.beaute_pct, emoji: '💄' },
    { label: 'Divers', pct: HISTORIQUE_LLUI.divers_pct, emoji: '📦' },
  ]

  const alertColor = retard ? '#C0392B' : avance ? '#7C9A7E' : '#C9A84C'

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `2px solid ${alertColor}30` }}>
      {/* Header */}
      <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #1A1A1A, #2D2D2D)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#C9A84C] mb-0.5">ANALYSE PRÉDICTIVE</p>
            <h3 className="text-sm font-bold text-white">{noms_maries}</h3>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[#888]">Budget total</p>
            <p className="text-sm font-bold text-[#C9A84C]">{fmt(budget_total)}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4" style={{ background: '#FDFAF4' }}>
        {/* Alerte milestone */}
        <div className="rounded-xl px-4 py-3" style={{ background: alertColor + '12', border: `1px solid ${alertColor}30` }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">{retard ? '⚠️' : avance ? '✅' : '📊'}</span>
            <p className="text-xs font-bold" style={{ color: alertColor }}>
              {retard ? 'Retard de versement — action requise' : avance ? 'Versements dans les temps' : 'Progression normale'}
            </p>
          </div>
          <p className="text-[11px] text-[#666]">
            Milestone actuel : <strong>{milestoneLabel}</strong> —
            attendu {Math.round(seuilAttendu * 100)}% versé, actuel {Math.round(pctVerse * 100)}%
            {ecart !== 0 && <span style={{ color: ecart < 0 ? '#C0392B' : '#7C9A7E' }}> ({ecart < 0 ? '−' : '+'}{fmt(Math.abs(ecart))})</span>}
          </p>
        </div>

        {/* Barre progression vs attendu */}
        <div>
          <div className="flex justify-between text-[10px] text-[#888] mb-1">
            <span>Versé : {fmt(totalVerse)} ({Math.round(pctVerse * 100)}%)</span>
            <span>Attendu : {Math.round(seuilAttendu * 100)}%</span>
          </div>
          <div className="relative bg-[#F5F0E8] rounded-full h-3">
            {/* Barre versé */}
            <div className="h-3 rounded-full transition-all" style={{ width: `${Math.min(pctVerse * 100, 100)}%`, background: alertColor }} />
            {/* Indicateur seuil attendu */}
            {seuilAttendu > 0 && (
              <div className="absolute top-0 h-3 w-0.5 bg-[#1A1A1A]" style={{ left: `${seuilAttendu * 100}%` }} />
            )}
          </div>
          <div className="flex justify-between text-[9px] text-[#AAA] mt-1">
            <span>0%</span>
            <span>Seuil J-actuel</span>
            <span>100%</span>
          </div>
        </div>

        {/* Risque dépassement */}
        <div className="rounded-xl p-3" style={{ background: '#C9A84C08', border: '1px solid #C9A84C20' }}>
          <p className="text-[10px] font-bold text-[#C9A84C] mb-2">📈 Comparaison historique L&Lui</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center p-2 rounded-lg bg-white">
              <p className="text-[10px] text-[#888]">Budget actuel</p>
              <p className="text-sm font-bold text-[#1A1A1A]">{fmt(budget_total)}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-white">
              <p className="text-[10px] text-[#888]">Budget risque +12%</p>
              <p className="text-sm font-bold" style={{ color: '#C0392B' }}>{fmt(budgetRisque)}</p>
            </div>
          </div>
          <p className="text-[10px] text-[#888] mt-2">
            ⚠️ En moyenne, les mariages L&Lui dépassent le budget initial de 12% (+{fmt(depassementPrevu)}).
            Recommandation : prévoir une réserve de sécurité.
          </p>
        </div>

        {/* Répartition recommandée */}
        <div>
          <p className="text-[10px] font-bold text-[#888] uppercase tracking-wide mb-2">Répartition recommandée (données historiques)</p>
          <div className="space-y-1.5">
            {repartition.map(r => (
              <div key={r.label} className="flex items-center gap-2">
                <span className="text-sm flex-shrink-0 w-5">{r.emoji}</span>
                <p className="text-xs text-[#666] flex-shrink-0" style={{ minWidth: 90 }}>{r.label}</p>
                <div className="flex-1 bg-[#F5F0E8] rounded-full h-1.5">
                  <div className="h-1.5 rounded-full" style={{ width: `${r.pct * 100}%`, background: '#C9A84C' }} />
                </div>
                <p className="text-[10px] text-[#C9A84C] font-bold flex-shrink-0" style={{ minWidth: 48, textAlign: 'right' }}>
                  {fmt(budget_total * r.pct)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
