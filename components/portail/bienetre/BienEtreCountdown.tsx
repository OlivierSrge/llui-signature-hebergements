'use client'
// components/portail/bienetre/BienEtreCountdown.tsx — #184 Countdown bien-être mariée

import { useState, useEffect } from 'react'

interface Props {
  marie_uid: string
  date_mariage: string
  noms_maries?: string
}

interface ChecklistItem {
  id: string
  label: string
  detail?: string
  done: boolean
}

interface Milestone {
  jours: number
  label: string
  emoji: string
  color: string
  items: Omit<ChecklistItem, 'done'>[]
}

const MILESTONES: Milestone[] = [
  {
    jours: 90, label: 'J-90', emoji: '🌿', color: '#7C9A7E',
    items: [
      { id: 'j90_robe', label: 'Premier essayage robe de mariée', detail: 'Réserver chez la couturière/boutique' },
      { id: 'j90_coiff', label: 'Choisir sa coiffeuse', detail: 'Prendre rendez-vous test coiffure' },
      { id: 'j90_maquil', label: 'Choisir sa maquilleuse', detail: 'Test maquillage à planifier J-30' },
      { id: 'j90_beaute', label: 'Démarrer routine soin visage', detail: 'Nettoyant + hydratant + SPF quotidien' },
    ],
  },
  {
    jours: 60, label: 'J-60', emoji: '💅', color: '#C9A84C',
    items: [
      { id: 'j60_robe2', label: 'Deuxième essayage robe', detail: 'Ajustements finaux' },
      { id: 'j60_soin', label: 'Soin professionnel visage', detail: 'Institut beauté ou spa' },
      { id: 'j60_ongles', label: 'Nail art de mariage choisi', detail: 'Montrer référence à la manucure' },
      { id: 'j60_parfum', label: 'Parfum du jour J sélectionné', detail: 'Tester 3 semaines avant pour valider' },
    ],
  },
  {
    jours: 30, label: 'J-30', emoji: '✨', color: '#C9A84C',
    items: [
      { id: 'j30_test_maquil', label: 'Test maquillage définitif', detail: 'Avec la maquilleuse choisie' },
      { id: 'j30_test_coiff', label: 'Test coiffure définitif', detail: 'Photo de la coiffure retenue' },
      { id: 'j30_robe3', label: 'Essayage final robe', detail: 'Avec les accessoires complets' },
      { id: 'j30_soin_corps', label: 'Soin corps / gommage', detail: 'Peeling doux 1×/semaine' },
      { id: 'j30_epil', label: 'Planning épilation établi', detail: 'J-7 epilations + J-2 retouches' },
    ],
  },
  {
    jours: 15, label: 'J-15', emoji: '💇', color: '#9B7ED4',
    items: [
      { id: 'j15_masque', label: 'Masque cheveux nourrissant', detail: '2× par semaine jusqu\'au jour J' },
      { id: 'j15_hydrat', label: 'Hydratation intense corps', detail: 'Beurre de karité matin + soir' },
      { id: 'j15_diete', label: 'Alimentation légère et hydratée', detail: 'Éviter sel en excès (gonflement)' },
      { id: 'j15_confir', label: 'Confirmer tous les RDV beauté J-7', detail: 'Coiff / maquil / manucure' },
    ],
  },
  {
    jours: 7, label: 'J-7', emoji: '💆', color: '#5B8FBF',
    items: [
      { id: 'j7_epilations', label: 'Épilations corps', detail: 'Jambes, aisselles, sourcils' },
      { id: 'j7_manucure', label: 'Manucure & pédicure', detail: 'French blanc ou couleur choisie' },
      { id: 'j7_masque_vis', label: 'Masque hydratant visage', detail: 'Éviter exfoliant agressif' },
      { id: 'j7_sommeil', label: 'Commencer à dormir 8h/nuit', detail: 'Coucher tôt pour teint lumineux' },
    ],
  },
  {
    jours: 3, label: 'J-3', emoji: '🛁', color: '#C9A84C',
    items: [
      { id: 'j3_detox', label: 'Détox légère (pas de nouveauté)', detail: 'Aucun nouveau aliment — risque allergie' },
      { id: 'j3_bain_lait', label: 'Bain de lait ou soin corps doux', detail: 'Peau satinée pour le jour J' },
      { id: 'j3_accessoires', label: 'Essayage accessoires complets', detail: 'Bijoux + chaussures + voile' },
      { id: 'j3_sac_mariee', label: 'Préparer le sac de la mariée', detail: 'Retouches maquillage, épingles, spray tenue' },
    ],
  },
  {
    jours: 1, label: 'J-1', emoji: '👑', color: '#7C9A7E',
    items: [
      { id: 'j1_repos', label: 'Journée repos absolu', detail: 'Pas de stress, activités douces uniquement' },
      { id: 'j1_masque_nuit', label: 'Masque nuit réparateur', detail: 'Laisser poser toute la nuit' },
      { id: 'j1_lay_out', label: 'Tenue complète posée et prête', detail: 'Robe + lingerie + chaussures + bijoux' },
      { id: 'j1_dodo', label: 'Au lit avant 22h', detail: 'Teint reposé pour le jour J 💛' },
    ],
  },
]

const PARTENAIRES_BEAUTE = [
  { nom: 'Salon Élégance Kribi', type: 'Coiffure & maquillage', tel: '+237 677 XXX XXX', quartier: 'Centre-ville' },
  { nom: 'Institut Prestige Beauté', type: 'Soins visage & corps', tel: '+237 699 XXX XXX', quartier: 'Plage de Grand Batanga' },
  { nom: 'Nails & Beauty Kribi', type: 'Manucure & pédicure nail art', tel: '+237 655 XXX XXX', quartier: 'Biyéné' },
  { nom: 'Spa Lobe Wellness', type: 'Massage & soins bien-être', tel: '+237 622 XXX XXX', quartier: 'Bord de mer' },
]

function joursAvantMariage(dateMariage: string): number {
  if (!dateMariage) return 999
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dm = new Date(dateMariage)
  dm.setHours(0, 0, 0, 0)
  return Math.ceil((dm.getTime() - today.getTime()) / 86400000)
}

export default function BienEtreCountdown({ marie_uid, date_mariage, noms_maries }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [showPartenaires, setShowPartenaires] = useState(false)
  const [sending, setSending] = useState(false)
  const [sentOk, setSentOk] = useState(false)

  const jours = joursAvantMariage(date_mariage)

  // Charger état depuis localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`bienetre_${marie_uid}`)
      if (saved) setChecked(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [marie_uid])

  function toggleItem(id: string) {
    setChecked(prev => {
      const next = { ...prev, [id]: !prev[id] }
      try { localStorage.setItem(`bienetre_${marie_uid}`, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

  // Milestones actifs = ceux dont le J- est >= jours restants ou déjà passés (J- <= 90)
  const activeMilestones = MILESTONES.filter(m => m.jours >= jours - 5 || Object.values(checked).some(Boolean))

  const totalItems = MILESTONES.reduce((acc, m) => acc + m.items.length, 0)
  const doneItems = Object.values(checked).filter(Boolean).length
  const pct = Math.round((doneItems / totalItems) * 100)

  async function sendRappelWhatsApp() {
    setSending(true)
    try {
      await fetch('/api/portail/rappel-bienetre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marie_uid, jours_restants: jours }),
      })
      setSentOk(true)
      setTimeout(() => setSentOk(false), 3000)
    } catch { /* ignore */ }
    setSending(false)
  }

  const prochaineMilestone = MILESTONES.find(m => m.jours >= jours && m.jours <= jours + 10)

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#FDFAF4', border: '1px solid #E8E0D0' }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-4" style={{ background: 'linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%)' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#C9A84C] mb-1">BIEN-ÊTRE MARIÉE</p>
            <h3 className="text-lg font-serif text-white">Countdown beauté 💫</h3>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-[#C9A84C]">{jours > 0 ? jours : '🎊'}</div>
            <div className="text-[10px] text-[#888]">{jours > 0 ? 'jours' : 'Félicitations !'}</div>
          </div>
        </div>
        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-[#333] rounded-full h-2">
            <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: '#C9A84C' }} />
          </div>
          <span className="text-xs text-[#C9A84C] font-bold min-w-[3rem] text-right">{doneItems}/{totalItems}</span>
        </div>
        {prochaineMilestone && (
          <p className="text-[10px] text-[#888] mt-2">
            Prochaine étape : <span className="text-[#C9A84C]">{prochaineMilestone.label}</span> — {prochaineMilestone.emoji} {prochaineMilestone.items[0]?.label}
          </p>
        )}
      </div>

      {/* Timeline checklist */}
      <div className="p-4 space-y-3">
        {MILESTONES.map(milestone => {
          const milestoneItems = milestone.items.map(item => ({ ...item, done: !!checked[item.id] }))
          const doneMilestone = milestoneItems.filter(i => i.done).length
          const isPast = jours < milestone.jours - 5
          const isCurrent = Math.abs(jours - milestone.jours) <= 10

          return (
            <details key={milestone.label} open={isCurrent} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${milestone.color}22` }}>
              <summary
                className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
                style={{ background: isCurrent ? milestone.color + '18' : '#FAFAFA' }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{milestone.emoji}</span>
                  <span className="text-sm font-bold" style={{ color: milestone.color }}>{milestone.label}</span>
                  {isPast && <span className="text-[10px] text-[#AAA]">(passé)</span>}
                  {isCurrent && <span className="text-[10px] font-semibold text-white px-1.5 py-0.5 rounded-full" style={{ background: milestone.color }}>maintenant</span>}
                </div>
                <span className="text-xs text-[#888]">{doneMilestone}/{milestoneItems.length} ✓</span>
              </summary>
              <div className="px-4 pb-3 pt-1 space-y-2" style={{ background: '#FAFAFA' }}>
                {milestoneItems.map(item => (
                  <label key={item.id} className="flex items-start gap-3 cursor-pointer group">
                    <div
                      className="mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        borderColor: item.done ? milestone.color : '#DDD',
                        background: item.done ? milestone.color : 'white',
                      }}
                      onClick={() => toggleItem(item.id)}
                    >
                      {item.done && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-[#1A1A1A] leading-tight" style={{ textDecoration: item.done ? 'line-through' : 'none', opacity: item.done ? 0.5 : 1 }}>
                        {item.label}
                      </p>
                      {item.detail && <p className="text-[10px] text-[#AAA] mt-0.5">{item.detail}</p>}
                    </div>
                  </label>
                ))}
              </div>
            </details>
          )
        })}
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex flex-col gap-2">
        <button
          onClick={() => setShowPartenaires(p => !p)}
          className="w-full py-2.5 rounded-xl text-xs font-semibold transition-all"
          style={{ background: '#C9A84C18', color: '#C9A84C', border: '1px solid #C9A84C30' }}
        >
          💅 {showPartenaires ? 'Masquer' : 'Voir'} les partenaires beauté Kribi
        </button>

        {showPartenaires && (
          <div className="rounded-xl p-3 space-y-2" style={{ background: '#F5F0E8', border: '1px solid #E8E0D0' }}>
            {PARTENAIRES_BEAUTE.map(p => (
              <div key={p.nom} className="bg-white rounded-lg p-3">
                <p className="text-sm font-semibold text-[#1A1A1A]">{p.nom}</p>
                <p className="text-[10px] text-[#C9A84C]">{p.type}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[10px] text-[#888]">📍 {p.quartier}</p>
                  <a href={`tel:${p.tel}`} className="text-[10px] text-[#C9A84C] font-medium">{p.tel}</a>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={sendRappelWhatsApp}
          disabled={sending || sentOk}
          className="w-full py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
          style={{ background: '#25D36615', color: '#25D366', border: '1px solid #25D36630' }}
        >
          {sentOk ? '✅ Rappel envoyé !' : sending ? 'Envoi…' : '📲 Recevoir rappel beauté WhatsApp'}
        </button>
      </div>
    </div>
  )
}
