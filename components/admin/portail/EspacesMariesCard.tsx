'use client'
// components/admin/portail/EspacesMariesCard.tsx
// Card admin — Liste des espaces mariés + accès direct sans mot de passe

import { useState, useEffect } from 'react'

interface Marie {
  uid: string
  noms_maries: string
  code: string
  date_mariage: string
  lieu: string
  cagnotte_cash: number
  actif: boolean
}

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

function formatDate(iso: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return iso }
}

export default function EspacesMariesCard() {
  const [maries, setMaries] = useState<Marie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accessingUid, setAccessingUid] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/liste-maries')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setMaries(d.maries ?? [])
      })
      .catch(() => setError('Erreur réseau'))
      .finally(() => setLoading(false))
  }, [])

  async function accederEspace(uid: string) {
    setAccessingUid(uid)
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marie_uid: uid }),
      })
      const data = await res.json()
      if (data.error) { alert('Erreur : ' + data.error); return }
      // Ouvrir le portail dans un nouvel onglet via l'URL one-time
      window.open(data.url, '_blank', 'noopener,noreferrer')
    } catch {
      alert('Erreur réseau')
    } finally {
      setAccessingUid(null)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-6 border-2 border-[#C9A84C] shadow-sm col-span-1 sm:col-span-2">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center text-xl">💍</div>
        <div>
          <h2 className="font-bold text-[#1A1A1A] text-lg">Espaces Mariés Actifs</h2>
          <p className="text-xs text-[#1A1A1A]/50">Accès direct sans mot de passe · {maries.length} espace{maries.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {loading && <p className="text-sm text-[#888] text-center py-4">Chargement…</p>}
      {error && <p className="text-sm text-red-500 text-center py-4">❌ {error}</p>}

      {!loading && !error && maries.length === 0 && (
        <p className="text-sm text-[#AAA] text-center py-4">Aucun espace marié créé</p>
      )}

      {!loading && maries.length > 0 && (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-[#F5F0E8]">
                <th className="text-left text-[10px] text-[#888] uppercase tracking-wide px-2 py-2 font-semibold">Mariés</th>
                <th className="text-left text-[10px] text-[#888] uppercase tracking-wide px-2 py-2 font-semibold">Code</th>
                <th className="text-left text-[10px] text-[#888] uppercase tracking-wide px-2 py-2 font-semibold">Date</th>
                <th className="text-left text-[10px] text-[#888] uppercase tracking-wide px-2 py-2 font-semibold">Lieu</th>
                <th className="text-right text-[10px] text-[#888] uppercase tracking-wide px-2 py-2 font-semibold">Cagnotte</th>
                <th className="text-center text-[10px] text-[#888] uppercase tracking-wide px-2 py-2 font-semibold">Statut</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {maries.map(m => (
                <tr key={m.uid} className="border-b border-[#F5F0E8] last:border-0 hover:bg-[#FAFAF8] transition-colors">
                  <td className="px-2 py-3">
                    <p className="font-semibold text-[#1A1A1A] text-sm leading-tight">{m.noms_maries || '—'}</p>
                    <p className="text-[10px] text-[#AAA] truncate max-w-[140px]">{m.uid}</p>
                  </td>
                  <td className="px-2 py-3">
                    <code className="text-xs bg-[#F5F0E8] px-1.5 py-0.5 rounded font-mono">{m.code || '—'}</code>
                  </td>
                  <td className="px-2 py-3 text-xs text-[#555] whitespace-nowrap">{formatDate(m.date_mariage)}</td>
                  <td className="px-2 py-3 text-xs text-[#555] max-w-[100px] truncate">{m.lieu || '—'}</td>
                  <td className="px-2 py-3 text-right">
                    <span className="text-sm font-semibold" style={{ color: m.cagnotte_cash > 0 ? '#C9A84C' : '#AAA' }}>
                      {formatFCFA(m.cagnotte_cash)}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: m.actif ? '#7C9A7E22' : '#88888822', color: m.actif ? '#7C9A7E' : '#888' }}>
                      {m.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <button
                      onClick={() => accederEspace(m.uid)}
                      disabled={accessingUid === m.uid}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white whitespace-nowrap disabled:opacity-50 transition-colors hover:opacity-90"
                      style={{ background: '#C9A84C' }}
                    >
                      {accessingUid === m.uid ? '…' : 'Accéder →'}
                    </button>
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
