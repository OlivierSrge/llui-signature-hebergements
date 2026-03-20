// app/portail/avantages/page.tsx
// Wallets, REV, Fast Start — Server Component

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getDb } from '@/lib/firebase'
import { PORTAIL_GRADES, GRADE_COLORS, GRADE_THRESHOLDS } from '@/lib/portailGrades'
import type { PortailGrade } from '@/lib/portailGrades'
import FastStartSection from '@/components/portail/FastStartSection'
import type { PalierState } from '@/components/portail/FastStartSection'
import NotifWhatsAppSection from '@/components/portail/NotifWhatsAppSection'
import WalletSection from '@/components/portail/WalletSection'

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n)) + ' FCFA'
}

function getNextGradeInfo(grade: PortailGrade, rev: number) {
  const idx = PORTAIL_GRADES.indexOf(grade)
  if (idx === PORTAIL_GRADES.length - 1) return { next: null, pct: 100, revManquants: 0 }
  const next = PORTAIL_GRADES[idx + 1]
  const current = GRADE_THRESHOLDS[grade]
  const target = GRADE_THRESHOLDS[next]
  const pct = Math.max(0, Math.min(100, Math.round(((rev - current) / (target - current)) * 100)))
  return { next, pct, revManquants: Math.max(0, target - rev) }
}

async function getAvantagesData() {
  try {
    const cookieStore = cookies()
    const uid = cookieStore.get('portail_uid')?.value
    if (!uid) redirect('/portail/login')
    const db = getDb()
    const snap = await db.collection('portail_users').doc(uid).get()
    if (!snap.exists) redirect('/portail/login')
    const d = snap.data()!
    const enrolledTs = d.fast_start?.enrolled_at
    const enrolledAt: string | null = enrolledTs?.toDate ? enrolledTs.toDate().toISOString() : null
    const now = Date.now()
    const joursRestants = (deadlineField: string): number | null => {
      const ts = d.fast_start?.[deadlineField]
      if (!ts?.toDate) return null
      const diff = ts.toDate().getTime() - now
      return diff > 0 ? Math.ceil(diff / 86_400_000) : 0
    }
    const isoOrNull = (field: string): string | null => {
      const ts = d.fast_start?.[field]
      return ts?.toDate ? ts.toDate().toISOString() : null
    }

    const paliers: PalierState[] = [
      { palier: 30, rev_requis: 80,  montant_prime: 30_000,
        unlocked: d.fast_start?.palier_30_unlocked ?? false,
        claimed:  d.fast_start?.palier_30_claimed  ?? false,
        expire:   d.fast_start?.palier_30_expire   ?? false,
        paye:     d.fast_start?.palier_30_paye     ?? false,
        jours_restants: joursRestants('deadline_30j'),
        paye_at: isoOrNull('paye_30_at'), reference_om: d.fast_start?.reference_om_30 ?? null,
        telephone_claimed: d.fast_start?.telephone_om_30 ?? null },
      { palier: 60, rev_requis: 200, montant_prime: 80_000,
        unlocked: d.fast_start?.palier_60_unlocked ?? false,
        claimed:  d.fast_start?.palier_60_claimed  ?? false,
        expire:   d.fast_start?.palier_60_expire   ?? false,
        paye:     d.fast_start?.palier_60_paye     ?? false,
        jours_restants: joursRestants('deadline_60j'),
        paye_at: isoOrNull('paye_60_at'), reference_om: d.fast_start?.reference_om_60 ?? null,
        telephone_claimed: d.fast_start?.telephone_om_60 ?? null },
      { palier: 90, rev_requis: 450, montant_prime: 200_000,
        unlocked: d.fast_start?.palier_90_unlocked ?? false,
        claimed:  d.fast_start?.palier_90_claimed  ?? false,
        expire:   d.fast_start?.palier_90_expire   ?? false,
        paye:     d.fast_start?.palier_90_paye     ?? false,
        jours_restants: joursRestants('deadline_90j'),
        paye_at: isoOrNull('paye_90_at'), reference_om: d.fast_start?.reference_om_90 ?? null,
        telephone_claimed: d.fast_start?.telephone_om_90 ?? null },
    ]

    const tsISO = (o: Record<string, unknown>, f: string) => (o[f] as { toDate?: () => Date })?.toDate?.().toISOString() ?? new Date().toISOString()
    const opsSnap = await db.collection('portail_users').doc(uid).collection('wallet_operations').orderBy('created_at', 'desc').limit(20).get()
    const history = opsSnap.docs.map(doc => { const o = doc.data(); return { id: doc.id, type: o.type ?? '', source: o.source ?? '', created_at: tsISO(o, 'created_at'), amount_cash: o.amount_cash ?? 0, amount_credits: o.amount_credits ?? 0, rev_attribues: o.rev_attribues ?? 0 } })
    const retraitsSnap = await db.collection('retraits_demandes').where('uid', '==', uid).orderBy('created_at', 'desc').limit(5).get()
    const retraits = retraitsSnap.docs.map(doc => { const r = doc.data(); return { id: doc.id, montant: r.montant ?? 0, wallet_type: r.wallet_type ?? 'cash', statut: r.statut ?? 'EN_ATTENTE', created_at: tsISO(r, 'created_at') } })

    return {
      uid,
      displayName: d.displayName ?? 'Partenaire',
      grade: (d.grade ?? 'START') as PortailGrade,
      rev_lifetime: d.rev_lifetime ?? 0,
      walletCash: d.wallets?.cash ?? 0,
      walletCredits: d.wallets?.credits_services ?? 0,
      enrolledAt, paliers, history, retraits,
    }
  } catch {
    redirect('/portail/login')
  }
}

export default async function AvantagesPage() {
  const data = await getAvantagesData()
  const { uid, displayName, grade, rev_lifetime, walletCash, walletCredits, enrolledAt, paliers, history, retraits } = data
  const color = GRADE_COLORS[grade]
  const { next, pct, revManquants } = getNextGradeInfo(grade, rev_lifetime)

  const enrolledDate = enrolledAt ? new Date(enrolledAt) : null
  const joursEcoules = enrolledDate
    ? Math.floor((Date.now() - enrolledDate.getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h1 className="font-serif italic text-2xl text-[#1A1A1A]">Mes Avantages</h1>

      {/* Grade + REV */}
      <div className="bg-[#1A1A1A] rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="px-3 py-1 rounded-full text-xs font-bold"
            style={{ background: color + '33', color, border: `1px solid ${color}60` }}
          >
            {grade}
          </div>
          <span className="text-white/60 text-sm">{rev_lifetime.toLocaleString('fr-FR')} REV</span>
        </div>
        <div className="text-xs text-white/40 mb-1 flex justify-between">
          <span>{grade}</span>
          {next && <span>{next} — encore {revManquants.toLocaleString('fr-FR')} REV</span>}
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
        </div>
        {!next && <p className="text-xs text-[#C9A84C] mt-2 font-semibold">Niveau maximum atteint — Félicitations !</p>}
      </div>

      {/* Wallets */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
          <p className="text-[10px] text-[#888] mb-1">Cash retirable</p>
          <p className="font-bold text-[#C9A84C] text-lg">{formatFCFA(walletCash)}</p>
          <p className="text-[10px] text-[#888] mt-1">70% des commissions</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
          <p className="text-[10px] text-[#888] mb-1">Crédits services</p>
          <p className="font-bold text-[#0F52BA] text-lg">{formatFCFA(walletCredits)}</p>
          <p className="text-[10px] text-[#888] mt-1">30% — utilisable L&Lui</p>
        </div>
      </div>

      {/* Fast Start — section interactive client */}
      <FastStartSection
        uid={uid}
        displayName={displayName}
        joursEcoules={joursEcoules}
        paliers={paliers}
        revLifetime={rev_lifetime}
      />

      {/* Historique wallet + demande retrait */}
      <WalletSection
        walletCash={walletCash}
        walletCredits={walletCredits}
        history={history}
        retraits={retraits}
      />

      {/* Notifications WhatsApp CallMeBot */}
      <NotifWhatsAppSection uid={uid} />

      {/* Grades roadmap */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F5F0E8]">
        <p className="text-sm font-semibold text-[#1A1A1A] mb-3">Progression des grades</p>
        <div className="space-y-2">
          {PORTAIL_GRADES.map(g => {
            const isActive = g === grade
            const isPassed = PORTAIL_GRADES.indexOf(g) < PORTAIL_GRADES.indexOf(grade)
            const gColor = GRADE_COLORS[g]
            return (
              <div key={g} className="flex items-center gap-3">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: isPassed || isActive ? gColor : '#E8E0D0' }}
                />
                <span className="text-xs flex-1" style={{ color: isActive ? gColor : isPassed ? '#888' : '#CCC', fontWeight: isActive ? 700 : 400 }}>
                  {g}
                </span>
                <span className="text-[10px] text-[#888]">
                  {GRADE_THRESHOLDS[g].toLocaleString('fr-FR')} REV
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
