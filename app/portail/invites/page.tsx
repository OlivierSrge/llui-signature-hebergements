'use client'
// app/portail/invites/page.tsx — Guest Connect : import + liste + QR + WhatsApp

import { useState, useEffect, useRef } from 'react'
import Papa from 'papaparse'
import { generateSlug, getMagicLinkUrl, validateTelephoneCM, normalizeTelephone } from '@/lib/generateMagicLink'
import GuestCard, { QrModal } from '@/components/portail/GuestCard'
import type { Guest } from '@/components/portail/GuestCard'

interface CsvRow { Nom?: string; Telephone?: string; Email?: string }

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}
function getUid() {
  if (typeof document === 'undefined') return ''
  return decodeURIComponent(document.cookie.match(/portail_uid=([^;]+)/)?.[1] ?? '')
}

export default function InvitesPage() {
  const [uid] = useState(() => getUid())
  const [guests, setGuests] = useState<Guest[]>([])
  const [search, setSearch] = useState('')
  const [filtre, setFiltre] = useState<'tous' | 'non_envoye' | 'envoye' | 'converti'>('tous')
  const [qrGuest, setQrGuest] = useState<Guest | null>(null)
  const [nom, setNom] = useState(''); const [telephone, setTelephone] = useState(''); const [email, setEmail] = useState('')
  const [telError, setTelError] = useState(''); const [ajoutLoading, setAjoutLoading] = useState(false)
  const [toast, setToast] = useState(''); const [csvPreview, setCsvPreview] = useState<CsvRow[]>([])
  const [csvErrors, setCsvErrors] = useState<string[]>([]); const [csvLoading, setCsvLoading] = useState(false)
  const [sendAllIdx, setSendAllIdx] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = () => fetch('/api/portail/invites').then(r => r.json()).then(d => setGuests(d.guests ?? []))
  useEffect(() => { if (uid) load() }, [uid])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }
  const handleTelChange = (v: string) => { setTelephone(v); setTelError(v && !validateTelephoneCM(v) ? 'Format attendu : +237XXXXXXXXX' : '') }

  const handleAjouter = async (e: React.FormEvent) => {
    e.preventDefault(); if (telError || !uid) return
    setAjoutLoading(true)
    await fetch('/api/portail/invites', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom: nom.trim(), telephone: normalizeTelephone(telephone.trim()), email: email.trim() || null, magic_link_slug: generateSlug(nom.trim()) }) })
    setNom(''); setTelephone(''); setEmail(''); setAjoutLoading(false); showToast('Invité ajouté ✓'); load()
  }

  const handleDelete = async (g: Guest) => {
    if (!confirm(`Supprimer ${g.nom} ?`)) return
    await fetch(`/api/portail/invites/${g.id}`, { method: 'DELETE' }); load()
  }

  const markEnvoye = async (g: Guest) => {
    await fetch(`/api/portail/invites/${g.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lien_envoye: true, lien_envoye_at: new Date().toISOString() }) }); load()
  }

  const waUrlFor = (g: Guest) => {
    const msg = `Bonjour ${g.nom} ! 🎊\nVous êtes invité(e) au mariage.\nVotre espace privilégié L&Lui :\n${getMagicLinkUrl(g.magic_link_slug)}\nAvec nos meilleurs vœux 💛\nL&Lui Signature`
    return `https://wa.me/${g.telephone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
  }

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    Papa.parse<CsvRow>(file, { header: true, skipEmptyLines: true, complete: (res) => {
      const errs: string[] = []
      const valid = res.data.filter((row, i) => {
        if (!row.Nom?.trim()) { errs.push(`Ligne ${i + 2}: Nom manquant`); return false }
        if (!validateTelephoneCM(row.Telephone ?? '')) { errs.push(`Ligne ${i + 2}: Tél invalide (${row.Telephone})`); return false }
        return true
      })
      setCsvPreview(valid); setCsvErrors(errs)
    }})
  }

  const handleImportCsv = async () => {
    setCsvLoading(true)
    for (let i = 0; i < csvPreview.length; i += 50) {
      await Promise.all(csvPreview.slice(i, i + 50).map(row =>
        fetch('/api/portail/invites', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nom: row.Nom!.trim(), telephone: normalizeTelephone(row.Telephone!.trim()),
            email: row.Email?.trim() || null, magic_link_slug: generateSlug(row.Nom!.trim()) }) })))
    }
    showToast(`${csvPreview.length} invités importés ✓`); setCsvPreview([]); setCsvErrors([])
    if (fileRef.current) fileRef.current.value = ''; setCsvLoading(false); load()
  }

  const filtered = guests
    .filter(g => filtre === 'tous' || (filtre === 'non_envoye' && !g.lien_envoye) || (filtre === 'envoye' && g.lien_envoye && !g.converted) || (filtre === 'converti' && g.converted))
    .filter(g => !search || g.nom.toLowerCase().includes(search.toLowerCase()) || g.telephone.includes(search))
    .sort((a, b) => Number(a.converted) - Number(b.converted) || Number(a.lien_envoye) - Number(b.lien_envoye))

  const nonEnvoyes = guests.filter(g => !g.lien_envoye)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white text-sm px-4 py-2 rounded-xl shadow-lg">{toast}</div>}
      {qrGuest && <QrModal guest={qrGuest} onClose={() => setQrGuest(null)} />}

      <div className="flex items-center justify-between">
        <h1 className="font-serif italic text-2xl text-[#1A1A1A]">Mes Invités</h1>
        <a href="/portail/invites/analytics" className="text-xs text-[#C9A84C] hover:underline">Statistiques →</a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[{ label: 'Importés', val: guests.length, color: '#1A1A1A' },
          { label: 'Liens envoyés', val: guests.filter(g => g.lien_envoye).length, color: '#C9A84C' },
          { label: 'Commissions', val: formatFCFA(guests.reduce((s, g) => s + (g.commissions_generees ?? 0), 0)), color: '#7C9A7E' }]
          .map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-3 shadow-sm border border-[#F5F0E8] text-center">
              <p className="font-bold text-base" style={{ color: s.color }}>{s.val}</p>
              <p className="text-[10px] text-[#888]">{s.label}</p>
            </div>
          ))}
      </div>

      {/* Import manuel */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F5F0E8]">
        <p className="font-semibold text-sm mb-3">Ajouter un invité</p>
        <form onSubmit={handleAjouter} className="space-y-3">
          <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Prénom et Nom *" required className="w-full border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]" />
          <div>
            <input value={telephone} onChange={e => handleTelChange(e.target.value)} placeholder="+237XXXXXXXXX ou 06XXXXXXXX *" required className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none ${telError ? 'border-red-400' : 'border-[#E8E0D0] focus:border-[#C9A84C]'}`} />
            {telError && <p className="text-[11px] text-red-500 mt-1">{telError}</p>}
          </div>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email (optionnel)" className="w-full border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]" />
          <button type="submit" disabled={ajoutLoading || !!telError || !nom || !telephone} className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#C9A84C' }}>
            {ajoutLoading ? 'Ajout…' : '+ Ajouter cet invité'}
          </button>
        </form>
      </div>

      {/* Import CSV */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F5F0E8]">
        <p className="font-semibold text-sm mb-1">Importer depuis CSV</p>
        <p className="text-[11px] text-[#888] mb-3">Format : Nom, Telephone, Email (header requis)</p>
        <input ref={fileRef} type="file" accept=".csv" onChange={handleCsvFile} className="w-full text-sm text-[#888] mb-2" />
        {csvErrors.length > 0 && <div className="bg-red-50 rounded-xl p-3 mb-2">{csvErrors.map((e, i) => <p key={i} className="text-[11px] text-red-600">{e}</p>)}</div>}
        {csvPreview.length > 0 && (
          <div>
            <p className="text-xs text-[#888] mb-2">{csvPreview.length} invités valides</p>
            <table className="w-full text-xs mb-2"><thead><tr className="border-b border-[#F5F0E8]"><th className="text-left py-1 text-[#888]">Nom</th><th className="text-left py-1 text-[#888]">Tél</th></tr></thead>
              <tbody>{csvPreview.slice(0, 5).map((r, i) => <tr key={i} className="border-b border-[#F5F0E8]"><td className="py-1">{r.Nom}</td><td className="py-1">{r.Telephone}</td></tr>)}
                {csvPreview.length > 5 && <tr><td colSpan={2} className="py-1 text-[#888]">…et {csvPreview.length - 5} autres</td></tr>}</tbody>
            </table>
            <button onClick={handleImportCsv} disabled={csvLoading} className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#1A1A1A' }}>
              {csvLoading ? 'Import…' : `Importer ${csvPreview.length} invités`}
            </button>
          </div>
        )}
      </div>

      {/* Recherche, filtres, liste */}
      {guests.length > 0 && (
        <>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un invité..." className="w-full border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C] bg-white" />
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {(['tous', 'non_envoye', 'envoye', 'converti'] as const).map(f => (
              <button key={f} onClick={() => setFiltre(f)} className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{ background: filtre === f ? '#C9A84C' : '#F5F0E8', color: filtre === f ? 'white' : '#888' }}>
                {{ tous: 'Tous', non_envoye: 'Non envoyé', envoye: 'Envoyé', converti: 'Converti' }[f]}
              </button>
            ))}
          </div>

          {/* Envoyer à tous par batch */}
          {nonEnvoyes.length > 0 && (
            <div className="bg-[#1A1A1A] rounded-2xl p-4 flex flex-wrap items-center gap-2">
              <p className="text-sm text-white flex-1">{nonEnvoyes.length} lien(s) non envoyé(s)</p>
              {nonEnvoyes.slice(sendAllIdx, sendAllIdx + 5).map(g => (
                <a key={g.id} href={waUrlFor(g)} target="_blank" rel="noopener noreferrer" onClick={() => markEnvoye(g)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#1A1A1A]" style={{ background: '#C9A84C' }}>
                  {g.nom.split(' ')[0]}
                </a>
              ))}
              {nonEnvoyes.length > sendAllIdx + 5 && (
                <button onClick={() => setSendAllIdx(i => i + 5)} className="px-3 py-1.5 rounded-xl text-xs border border-white/20 text-white">5 suivants</button>
              )}
            </div>
          )}

          <div className="space-y-3">
            {filtered.map(g => (
              <GuestCard key={g.id} guest={g} onQr={setQrGuest} onDelete={handleDelete}
                onWa={markEnvoye} onCopy={url => { navigator.clipboard.writeText(url); showToast('Lien copié ✓') }} />
            ))}
            {filtered.length === 0 && <p className="text-center py-6 text-sm text-[#888]">Aucun invité trouvé</p>}
          </div>
        </>
      )}
    </div>
  )
}
