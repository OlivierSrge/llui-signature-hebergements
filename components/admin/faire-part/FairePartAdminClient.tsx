'use client'
// components/admin/faire-part/FairePartAdminClient.tsx
// UI admin — gestion et envoi des invitations numériques Diane & Charly

import { useState } from 'react'

interface Invite {
  id: string
  prenom: string
  nom: string
  email: string
}

interface SendResult {
  email: string
  status: 'sent' | 'skipped' | 'error'
  error?: string
}

interface SendResponse {
  success: boolean
  sent: number
  errors: number
  results: SendResult[]
}

interface RsvpReponse {
  id: string
  prenom: string
  nom: string
  presence: 'present' | 'absent'
  nb_accompagnants: number
  message: string
  created_at: string
}

interface Props {
  marie_uid: string
  noms_maries: string
  date_mariage: string
  lieu: string
  faire_part_url: string
  rsvp_list: RsvpReponse[]
  admin_api_key: string
}

let _nextId = 1
function newId() { return String(_nextId++) }

export default function FairePartAdminClient({
  marie_uid, noms_maries, date_mariage, lieu, faire_part_url, rsvp_list, admin_api_key,
}: Props) {
  const [invites, setInvites] = useState<Invite[]>([{ id: newId(), prenom: '', nom: '', email: '' }])
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<SendResponse | null>(null)
  const [activeTab, setActiveTab] = useState<'invites' | 'rsvp'>('invites')

  // CSV paste helper
  function handleCsvPaste(text: string) {
    const lines = text.trim().split('\n').filter(Boolean)
    const parsed = lines.flatMap(line => {
      const cols = line.split(/[,;\t]/).map(c => c.trim().replace(/^"|"$/g, ''))
      if (cols.length >= 3) return [{ id: newId(), prenom: cols[0], nom: cols[1], email: cols[2] }]
      if (cols.length === 2) return [{ id: newId(), prenom: cols[0], nom: '', email: cols[1] }]
      return []
    })
    if (parsed.length > 0) setInvites(parsed)
  }

  async function handleSend() {
    const validInvites = invites.filter(i => i.prenom.trim() && i.email.trim())
    if (validInvites.length === 0) return
    setSending(true)
    setSendResult(null)
    try {
      const res = await fetch('/api/faire-part/envoyer-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${admin_api_key}`,
        },
        body: JSON.stringify({ marie_uid, invites: validInvites }),
      })
      const data = await res.json() as SendResponse
      setSendResult(data)
    } catch {
      setSendResult({ success: false, sent: 0, errors: 1, results: [] })
    } finally {
      setSending(false)
    }
  }

  const presentCount = rsvp_list.filter(r => r.presence === 'present').length
  const absentCount = rsvp_list.filter(r => r.presence === 'absent').length
  const totalAccomp = rsvp_list
    .filter(r => r.presence === 'present')
    .reduce((s, r) => s + (r.nb_accompagnants || 0), 0)

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="rounded-2xl p-6 border-2 border-[#1B4F72]/30 bg-gradient-to-r from-[#1B4F72]/5 to-[#C9A84C]/5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#1B4F72]/10 flex items-center justify-center text-2xl">💍</div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-[#1A1A1A] text-xl">{noms_maries}</h2>
            <p className="text-sm text-[#1A1A1A]/50 mt-0.5">
              {new Date(date_mariage + 'T12:00:00').toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })} · {lieu}
            </p>
          </div>
          <a href={faire_part_url} target="_blank" rel="noopener noreferrer"
            className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold border"
            style={{ borderColor: '#1B4F72', color: '#1B4F72' }}>
            Voir →
          </a>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 p-1 rounded-2xl bg-gray-100">
        {([
          { key: 'invites', label: '📧 Envoyer les invitations' },
          { key: 'rsvp', label: `💌 RSVP (${rsvp_list.length})` },
        ] as const).map(tab => (
          <button key={tab.key} type="button"
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={activeTab === tab.key
              ? { background: 'white', color: '#1B4F72', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }
              : { color: '#6B7280' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB — Invitations */}
      {activeTab === 'invites' && (
        <div className="space-y-5">
          {/* CSV helper */}
          <div className="rounded-2xl p-4 bg-[#1B4F72]/04 border border-[#1B4F72]/10">
            <p className="text-xs font-semibold text-[#1B4F72] mb-2">
              Importer depuis CSV / copier-coller
            </p>
            <p className="text-xs text-[#1A1A1A]/40 mb-2">
              Format : Prénom, Nom, Email (une ligne par invité)
            </p>
            <textarea
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono outline-none resize-none"
              rows={3}
              placeholder={'Jean,Dupont,jean@email.fr\nMarie,Martin,marie@email.fr'}
              onBlur={e => { if (e.target.value.trim()) handleCsvPaste(e.target.value) }}
            />
          </div>

          {/* Liste invités */}
          <div className="space-y-2">
            {invites.map((inv, i) => (
              <div key={inv.id} className="flex gap-2 items-center">
                <input className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
                  placeholder="Prénom" value={inv.prenom}
                  onChange={e => setInvites(prev => prev.map(x => x.id === inv.id ? { ...x, prenom: e.target.value } : x))} />
                <input className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
                  placeholder="Nom" value={inv.nom}
                  onChange={e => setInvites(prev => prev.map(x => x.id === inv.id ? { ...x, nom: e.target.value } : x))} />
                <input className="flex-[2] border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
                  type="email" placeholder="Email" value={inv.email}
                  onChange={e => setInvites(prev => prev.map(x => x.id === inv.id ? { ...x, email: e.target.value } : x))} />
                <button type="button"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  onClick={() => setInvites(prev => prev.filter(x => x.id !== inv.id || prev.length === 1))}>
                  ×
                </button>
              </div>
            ))}
          </div>

          <button type="button"
            onClick={() => setInvites(prev => [...prev, { id: newId(), prenom: '', nom: '', email: '' }])}
            className="w-full py-2.5 rounded-xl text-sm text-[#1B4F72] border border-dashed border-[#1B4F72]/30 hover:border-[#1B4F72]/60 transition-colors">
            + Ajouter un invité
          </button>

          {/* Bouton envoi */}
          <button type="button" onClick={handleSend} disabled={sending}
            className="w-full py-4 rounded-2xl font-bold text-white text-sm disabled:opacity-60 active:scale-95 transition-all"
            style={{ background: 'linear-gradient(90deg,#1B4F72,#C9A84C)' }}>
            {sending ? 'Envoi en cours…' : `📧 Envoyer ${invites.filter(i => i.email.trim()).length} invitation(s)`}
          </button>

          {/* Résultats */}
          {sendResult && (
            <div className={`rounded-2xl p-4 ${sendResult.sent > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <p className="font-semibold text-sm mb-2">
                {sendResult.sent > 0
                  ? `✅ ${sendResult.sent} email(s) envoyé(s)`
                  : '❌ Aucun email envoyé'}
                {sendResult.errors > 0 && ` · ${sendResult.errors} erreur(s)`}
              </p>
              {sendResult.results.filter(r => r.status === 'error').map((r, i) => (
                <p key={i} className="text-xs text-red-600">{r.email} : {r.error}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB — RSVP */}
      {activeTab === 'rsvp' && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Présents', value: presentCount, color: '#1B4F72' },
              { label: 'Absents', value: absentCount, color: '#9CA3AF' },
              { label: 'Accompagnants', value: totalAccomp, color: '#C9A84C' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-4 text-center bg-white border border-gray-100 shadow-sm">
                <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-[#1A1A1A]/45 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Liste RSVP */}
          {rsvp_list.length === 0 ? (
            <div className="text-center py-10 text-[#1A1A1A]/30 text-sm">
              Aucune réponse reçue pour l&apos;instant.
            </div>
          ) : (
            <div className="space-y-2">
              {rsvp_list.map(r => (
                <div key={r.id} className="rounded-2xl p-4 bg-white border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{r.presence === 'present' ? '🥂' : '💐'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-[#1A1A1A]">
                        {r.prenom} {r.nom}
                      </p>
                      <p className="text-xs text-[#1A1A1A]/40">
                        {r.presence === 'present'
                          ? `Présent${r.nb_accompagnants > 0 ? ` + ${r.nb_accompagnants} accompagnant(s)` : ''}`
                          : 'Absent(e)'}
                        {r.created_at ? ` · ${new Date(r.created_at).toLocaleDateString('fr-FR')}` : ''}
                      </p>
                      {r.message && (
                        <p className="text-xs text-[#1A1A1A]/55 mt-1 italic">&ldquo;{r.message}&rdquo;</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
