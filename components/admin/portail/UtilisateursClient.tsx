'use client'
// components/admin/portail/UtilisateursClient.tsx
// Tableau utilisateurs portail + filtres + modal profil + ajustement grade

import { useState } from 'react'
import type { PortailUserRow } from '@/app/admin/utilisateurs/page'
import { GRADE_COLORS } from '@/lib/portailGrades'
import type { PortailGrade } from '@/lib/portailGrades'

const GRADES: PortailGrade[] = ['START','BRONZE','ARGENT','OR','SAPHIR','DIAMANT']
const ROLES = ['Tous','MARIÉ','PARTENAIRE','INVITÉ','ADMIN']

function fmt(n: number) { return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA' }

export default function UtilisateursClient({ users }: { users: PortailUserRow[] }) {
  const [q, setQ] = useState('')
  const [roleF, setRoleF] = useState('Tous')
  const [gradeF, setGradeF] = useState('Tous')
  const [selected, setSelected] = useState<PortailUserRow | null>(null)
  const [gradeModal, setGradeModal] = useState(false)
  const [newGrade, setNewGrade] = useState<PortailGrade>('START')
  const [motif, setMotif] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const filtered = users.filter(u => {
    const matchQ = !q || u.displayName.toLowerCase().includes(q.toLowerCase()) || u.phone.includes(q) || u.email.toLowerCase().includes(q.toLowerCase())
    const matchR = roleF === 'Tous' || u.role === roleF
    const matchG = gradeF === 'Tous' || u.grade === gradeF
    return matchQ && matchR && matchG
  })

  async function ajusterGrade() {
    if (!selected || !motif.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/utilisateurs/ajuster-grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: selected.uid, grade: newGrade, motif }),
      })
      const data = await res.json()
      setMsg(data.success ? '✅ Grade mis à jour' : '❌ ' + (data.error ?? 'Erreur'))
    } catch { setMsg('❌ Erreur réseau') }
    setSaving(false)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Utilisateurs Portail</h1>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Nom, email, téléphone…"
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm flex-1 min-w-48" />
        <div className="flex gap-1.5 flex-wrap">
          {ROLES.map(r => <button key={r} onClick={() => setRoleF(r)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${roleF === r ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>{r}</button>)}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['Tous', ...GRADES].map(g => <button key={g} onClick={() => setGradeF(g)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${gradeF === g ? 'bg-[#C9A84C] text-white border-[#C9A84C]' : 'border-gray-200 text-gray-600'}`}>{g}</button>)}
        </div>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>{['Nom','Rôle','Grade','REV','Cash','Crédits','Inscrit','Actions'].map(h => <th key={h} className="text-left px-4 py-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.uid} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{u.displayName}</td>
                <td className="px-4 py-2 text-xs text-gray-500">{u.role}</td>
                <td className="px-4 py-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: GRADE_COLORS[u.grade] + '22', color: GRADE_COLORS[u.grade] }}>{u.grade}</span>
                </td>
                <td className="px-4 py-2 text-[#C9A84C] font-semibold">{u.rev_lifetime.toLocaleString('fr-FR')}</td>
                <td className="px-4 py-2 text-green-600 text-xs">{fmt(u.walletCash)}</td>
                <td className="px-4 py-2 text-purple-600 text-xs">{fmt(u.walletCredits)}</td>
                <td className="px-4 py-2 text-gray-400 text-xs">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('fr-FR') : '—'}</td>
                <td className="px-4 py-2 flex gap-1.5">
                  <button onClick={() => { setSelected(u); setGradeModal(false); setMsg('') }}
                    className="px-2 py-1 bg-gray-100 rounded-lg text-xs hover:bg-gray-200">Profil</button>
                  <button onClick={() => { setSelected(u); setNewGrade(u.grade); setGradeModal(true); setMotif(''); setMsg('') }}
                    className="px-2 py-1 bg-[#C9A84C]/10 text-[#C9A84C] rounded-lg text-xs hover:bg-[#C9A84C]/20">Grade</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">Aucun utilisateur trouvé</p>}
      </div>

      {/* Modal profil / grade */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#1A1A1A] flex items-center justify-center text-white font-bold text-lg">
                {selected.displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-lg">{selected.displayName}</p>
                <p className="text-xs text-gray-400">{selected.role} · {selected.phone}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center mb-4">
              <div className="bg-gray-50 rounded-xl p-2"><p className="text-xs text-gray-500">REV</p><p className="font-bold text-[#C9A84C]">{selected.rev_lifetime.toLocaleString('fr-FR')}</p></div>
              <div className="bg-gray-50 rounded-xl p-2"><p className="text-xs text-gray-500">Cash</p><p className="font-bold text-green-600 text-xs">{fmt(selected.walletCash)}</p></div>
              <div className="bg-gray-50 rounded-xl p-2"><p className="text-xs text-gray-500">Crédits</p><p className="font-bold text-purple-600 text-xs">{fmt(selected.walletCredits)}</p></div>
            </div>
            <p className="text-xs text-gray-400 mb-1">Fast Start : {selected.fsUnlocked}/3 palier(s) débloqué(s)</p>

            {gradeModal && (
              <div className="mt-4 border-t pt-4">
                <p className="font-semibold text-sm mb-2">Ajuster le grade</p>
                <select value={newGrade} onChange={e => setNewGrade(e.target.value as PortailGrade)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-2">
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <input value={motif} onChange={e => setMotif(e.target.value)} placeholder="Motif obligatoire…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-2" />
                {msg && <p className="text-xs mb-2 font-medium text-center">{msg}</p>}
                <button onClick={ajusterGrade} disabled={saving || !motif.trim()}
                  className="w-full py-2 rounded-xl bg-[#C9A84C] text-white text-sm font-semibold disabled:opacity-50">
                  {saving ? 'Enregistrement…' : 'Confirmer'}
                </button>
              </div>
            )}
            <button onClick={() => setSelected(null)} className="mt-3 w-full text-xs text-gray-400 hover:text-gray-600">Fermer</button>
          </div>
        </div>
      )}
    </div>
  )
}
