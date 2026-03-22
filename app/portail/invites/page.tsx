'use client'
// app/portail/invites/page.tsx — Guest Connect : import + liste + QR + WhatsApp + PDF

import { useState, useEffect, useRef } from 'react'
import Papa from 'papaparse'
import { generateSlug, getMagicLinkUrl, validateTelephoneCM, normalizeTelephone } from '@/lib/generateMagicLink'
import GuestCard, { QrModal } from '@/components/portail/GuestCard'
import type { Guest } from '@/components/portail/GuestCard'
import { useClientIdentity } from '@/hooks/useClientIdentity'

type GuestEnrichi = Guest & {
  invitation_envoyee?: boolean
  relance_envoyee?: boolean
  relance_date?: string
  date_envoi?: string
  fiche_envoyee?: boolean
  fiche_date?: string
  achats?: Array<{ produit: string; montant: number; date: string }>
}

interface CsvRow { Nom?: string; Telephone?: string; Email?: string }

interface MainInvite {
  id?: string
  prenom?: string
  nom?: string
  statut?: string
  hebergement?: boolean
  table?: string
}

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}
function getUid() {
  if (typeof document === 'undefined') return ''
  return decodeURIComponent(document.cookie.match(/portail_uid=([^;]+)/)?.[1] ?? '')
}

const STATUT_DOT: Record<string, { bg: string; label: string }> = {
  confirmé:       { bg: '#7C9A7E', label: 'Confirmé' },
  confirme:       { bg: '#7C9A7E', label: 'Confirmé' },
  en_attente:     { bg: '#E8A84C', label: 'En attente' },
  absent:         { bg: '#C0392B', label: 'Absent' },
  non_renseigné:  { bg: '#CCCCCC', label: 'Non renseigné' },
}

function dotColor(statut?: string): string {
  return STATUT_DOT[statut ?? 'non_renseigné']?.bg ?? '#CCCCCC'
}
function dotLabel(statut?: string): string {
  return STATUT_DOT[statut ?? 'non_renseigné']?.label ?? 'Non renseigné'
}

export default function InvitesPage() {
  const [uid] = useState(() => getUid())
  const identity = useClientIdentity()
  const [guests, setGuests] = useState<GuestEnrichi[]>([])
  const [mainInvites, setMainInvites] = useState<MainInvite[]>([])
  const [search, setSearch] = useState('')
  const [filtre, setFiltre] = useState<'tous' | 'non_envoye' | 'envoye' | 'converti'>('tous')
  const [filtreStatut, setFiltreStatut] = useState<'tous' | 'confirmé' | 'en_attente' | 'absent'>('tous')
  const [hoveredDot, setHoveredDot] = useState<string | null>(null)
  const [qrGuest, setQrGuest] = useState<Guest | null>(null)
  const [nom, setNom] = useState(''); const [telephone, setTelephone] = useState(''); const [email, setEmail] = useState('')
  const [table, setTable] = useState(''); const [hebergement, setHebergement] = useState(false)
  const [telError, setTelError] = useState(''); const [ajoutLoading, setAjoutLoading] = useState(false)
  const [toast, setToast] = useState(''); const [csvPreview, setCsvPreview] = useState<CsvRow[]>([])
  const [csvErrors, setCsvErrors] = useState<string[]>([]); const [csvLoading, setCsvLoading] = useState(false)
  const [sendAllIdx, setSendAllIdx] = useState(0)
  const [relanceEnCours, setRelanceEnCours] = useState<string | null>(null)
  const [showFicheModal, setShowFicheModal] = useState(false)
  const [ficheSelection, setFicheSelection] = useState<Set<string>>(new Set())
  const [ficheEnvoyLoading, setFicheEnvoyLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // invites-stats retourne maintenant : guests (enrichis), invites (dots), stats
  const load = () =>
    fetch('/api/portail/invites-stats')
      .then(r => r.json())
      .then(d => {
        setGuests(d.guests ?? [])
        setMainInvites(d.invites ?? [])
      })
      .catch(() => {})

  // Conserver aussi le fetch direct /invites pour les opérations d'écriture (reload après ajout/suppression)
  const loadMainInvites = () =>
    fetch('/api/portail/invites-stats')
      .then(r => r.json())
      .then(d => {
        setGuests(d.guests ?? [])
        setMainInvites(d.invites ?? [])
      })
      .catch(() => {})

  useEffect(() => { if (uid) { load() } }, [uid])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }
  const handleTelChange = (v: string) => { setTelephone(v); setTelError(v && !validateTelephoneCM(v) ? 'Format attendu : +237XXXXXXXXX' : '') }

  const handleAjouter = async (e: React.FormEvent) => {
    e.preventDefault(); if (telError || !uid) return
    setAjoutLoading(true)
    const nomFull = nom.trim()
    await fetch('/api/portail/invites', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom: nomFull, telephone: normalizeTelephone(telephone.trim()), email: email.trim() || null, magic_link_slug: generateSlug(nomFull) }) })
    // Aussi écrire dans mariés/[uid].invites[] pour le compteur dashboard
    await fetch('/api/portail/ajouter-invite', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prenom: nomFull.split(' ')[0], nom: nomFull.split(' ').slice(1).join(' '), tel: normalizeTelephone(telephone.trim()), table: table.trim(), hebergement }) }).catch(() => {})
    setNom(''); setTelephone(''); setEmail(''); setTable(''); setHebergement(false); setAjoutLoading(false); showToast('Invité ajouté ✓'); load(); loadMainInvites()
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
    const nomsMaries = identity.noms_maries && identity.noms_maries !== 'Mon mariage' ? identity.noms_maries : 'les Mariés'
    const codePromo = identity.code_promo ? `\nVotre code privilège : ${identity.code_promo}` : ''
    const msg = `Bonjour ${g.nom} ! 🎊\nVous êtes invité(e) au mariage de ${nomsMaries}.\nNous avons préparé pour vous une fiche personnalisée avec des offres exclusives :\n${getMagicLinkUrl(g.magic_link_slug)}${codePromo}\nAvec nos meilleurs vœux 💛\n${nomsMaries} / L&Lui Signature`
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

  const handleRelancer = async (g: GuestEnrichi) => {
    setRelanceEnCours(g.id)
    try {
      const prenom = g.nom.split(' ')[0] || g.nom
      const res = await fetch('/api/portail/relancer-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_id: g.id, tel: g.telephone, prenom }),
      })
      if (res.ok) {
        showToast(`Relance envoyée à ${prenom} ✓`)
        load()
      } else {
        showToast('Échec envoi — vérifier Twilio')
      }
    } catch {
      showToast('Erreur réseau')
    } finally {
      setRelanceEnCours(null)
    }
  }

  const ficheUrl = (g: GuestEnrichi) => {
    const prenom = encodeURIComponent(g.nom.split(' ')[0] || g.nom)
    const code = encodeURIComponent(identity.code_promo || '')
    return `https://llui-signature-hebergements.vercel.app/fiche/${uid}?prenom=${prenom}&code=${code}`
  }

  const ficheWaUrlFor = (g: GuestEnrichi) => {
    const nomsMaries = identity.noms_maries && identity.noms_maries !== 'Mon mariage' ? identity.noms_maries : 'les Mariés'
    const prenom = g.nom.split(' ')[0] || g.nom
    const code = identity.code_promo || ''
    const url = ficheUrl(g)
    const msg = `Bonjour ${prenom} ! 🎉\n${nomsMaries} vous ont préparé une invitation personnalisée pour leur mariage.\n\nDécouvrez votre fiche d'invitation :\n👉 ${url}\n\nVotre code privilège : *${code}*\nChaque achat participe à leur cagnotte 💝`
    return `https://wa.me/${g.telephone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
  }

  const handleEnvoyerFiche = async (g: GuestEnrichi) => {
    // Ouvrir WhatsApp
    window.open(ficheWaUrlFor(g), '_blank', 'noopener,noreferrer')
    // Marquer fiche_envoyee = true dans Firestore
    await fetch(`/api/portail/invites/${g.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fiche_envoyee: true, fiche_date: new Date().toISOString(), lien_envoye: true }),
    }).catch(() => {})
    load()
  }

  const handleEnvoyerFichesGroupees = async () => {
    if (ficheSelection.size === 0) return
    setFicheEnvoyLoading(true)
    const invitesSelectionnes = guests
      .filter(g => ficheSelection.has(g.id))
      .map(g => ({ id: g.id, tel: g.telephone, prenom: g.nom.split(' ')[0] || g.nom }))
    try {
      const res = await fetch('/api/portail/envoyer-fiches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invites: invitesSelectionnes }),
      })
      const d = await res.json()
      if (res.ok) {
        showToast(`✅ ${d.envoyes} fiche(s) envoyée(s)${d.echecs?.length ? ` · ${d.echecs.length} échec(s)` : ''}`)
        setShowFicheModal(false)
        setFicheSelection(new Set())
        load()
      } else {
        showToast('Erreur envoi — ' + (d.error ?? 'inconnu'))
      }
    } catch {
      showToast('Erreur réseau')
    } finally {
      setFicheEnvoyLoading(false)
    }
  }

  const filtered = guests
    .filter(g => filtre === 'tous' || (filtre === 'non_envoye' && !g.lien_envoye) || (filtre === 'envoye' && g.lien_envoye && !g.converted) || (filtre === 'converti' && g.converted))
    .filter(g => !search || g.nom.toLowerCase().includes(search.toLowerCase()) || g.telephone.includes(search))
    .sort((a, b) => Number(a.converted) - Number(b.converted) || Number(a.lien_envoye) - Number(b.lien_envoye))

  const nonEnvoyes = guests.filter(g => !g.lien_envoye)

  // Compteurs statut depuis mainInvites
  const nbConfirmes = mainInvites.filter(i => i.statut === 'confirmé' || i.statut === 'confirme').length
  const nbEnAttente = mainInvites.filter(i => !i.statut || i.statut === 'en_attente').length
  const nbAbsents = mainInvites.filter(i => i.statut === 'absent').length

  // Liste filtrée par statut (mainInvites)
  const filteredMain = mainInvites.filter(i => {
    if (filtreStatut === 'tous') return true
    if (filtreStatut === 'confirmé') return i.statut === 'confirmé' || i.statut === 'confirme'
    if (filtreStatut === 'en_attente') return !i.statut || i.statut === 'en_attente'
    if (filtreStatut === 'absent') return i.statut === 'absent'
    return true
  })

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white text-sm px-4 py-2 rounded-xl shadow-lg">{toast}</div>}
      {qrGuest && <QrModal guest={qrGuest} onClose={() => setQrGuest(null)} />}

      {/* MODALE ENVOI GROUPÉ FICHES */}
      {showFicheModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4 pb-4" onClick={() => setShowFicheModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-[#F5F0E8]">
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-[#1A1A1A]">📨 Envoyer toutes les fiches</p>
                <button onClick={() => setShowFicheModal(false)} className="text-[#AAA] text-sm hover:text-[#666]">✕</button>
              </div>
              <p className="text-xs text-[#888]">Envoi WhatsApp via Twilio · max 50 par envoi</p>
            </div>

            <div className="overflow-y-auto max-h-[50vh] p-4 space-y-2">
              {/* Sélectionner tous */}
              <button
                onClick={() => {
                  const sansFiche = guests.filter(g => !g.fiche_envoyee)
                  setFicheSelection(new Set(sansFiche.map(g => g.id)))
                }}
                className="text-xs text-[#C9A84C] font-semibold mb-1"
              >
                Sélectionner tous sans fiche ({guests.filter(g => !g.fiche_envoyee).length})
              </button>

              {guests.map(g => (
                <label key={g.id} className="flex items-center gap-3 py-2 border-b border-[#F5F0E8] last:border-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ficheSelection.has(g.id)}
                    onChange={e => {
                      const s = new Set(ficheSelection)
                      e.target.checked ? s.add(g.id) : s.delete(g.id)
                      setFicheSelection(s)
                    }}
                    className="w-4 h-4 accent-[#C9A84C]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#1A1A1A] truncate">{g.nom}</p>
                    <p className="text-[10px] text-[#888]">{g.telephone}</p>
                  </div>
                  {g.fiche_envoyee && <span className="text-[10px] text-[#7C9A7E] flex-shrink-0">🎫 Envoyée</span>}
                </label>
              ))}
            </div>

            <div className="p-4 border-t border-[#F5F0E8]">
              <button
                onClick={handleEnvoyerFichesGroupees}
                disabled={ficheEnvoyLoading || ficheSelection.size === 0}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
                style={{ background: '#C9A84C' }}
              >
                {ficheEnvoyLoading ? '⏳ Envoi en cours…' : `Envoyer ${ficheSelection.size} fiche(s) via WhatsApp`}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="font-serif italic text-2xl text-[#1A1A1A]">Mes Invités</h1>
        <div className="flex gap-2 items-center">
          {guests.length > 0 && (
            <button
              onClick={() => setShowFicheModal(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
              style={{ background: '#C9A84C' }}
            >
              📨 Fiches
            </button>
          )}
          <a href="/portail/invites/pdf" className="text-xs text-[#C9A84C] hover:underline">📄 PDF →</a>
          <a href="/portail/invites/analytics" className="text-xs text-[#888] hover:underline">Stats →</a>
        </div>
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

      {/* SECTION STATUTS INVITÉS — dots colorés + filtres */}
      {mainInvites.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F5F0E8]">
          {/* Compteurs statuts */}
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-sm text-[#1A1A1A]">Statuts de présence</p>
            <p className="text-xs text-[#888]">Total : {mainInvites.length}</p>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { key: 'tous',       label: 'Tous',        count: mainInvites.length, color: '#1A1A1A' },
              { key: 'confirmé',   label: 'Confirmés',   count: nbConfirmes,        color: '#7C9A7E' },
              { key: 'en_attente', label: 'En attente',  count: nbEnAttente,        color: '#E8A84C' },
              { key: 'absent',     label: 'Absents',     count: nbAbsents,          color: '#C0392B' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFiltreStatut(f.key as typeof filtreStatut)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  background: filtreStatut === f.key ? f.color : '#F5F0E8',
                  color: filtreStatut === f.key ? 'white' : '#555',
                }}
              >
                <span>{f.label}</span>
                <span className="font-bold">{f.count}</span>
              </button>
            ))}
          </div>

          {/* Grille de dots */}
          <div className="flex flex-wrap gap-2 relative">
            {filteredMain.map((inv, idx) => {
              const key = inv.id ?? `${idx}`
              const prenom = inv.prenom ?? inv.nom ?? `Invité ${idx + 1}`
              const statut = inv.statut ?? 'en_attente'
              return (
                <div
                  key={key}
                  className="relative"
                  onMouseEnter={() => setHoveredDot(key)}
                  onMouseLeave={() => setHoveredDot(null)}
                >
                  <div
                    className="w-5 h-5 rounded-full cursor-pointer transition-transform hover:scale-125"
                    style={{ background: dotColor(statut) }}
                    title={`${prenom} — ${dotLabel(statut)}`}
                  />
                  {hoveredDot === key && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-10 bg-[#1A1A1A] text-white text-[10px] rounded-lg px-2 py-1 whitespace-nowrap shadow-lg pointer-events-none">
                      {prenom}
                      <br />
                      <span style={{ color: dotColor(statut) }}>{dotLabel(statut)}</span>
                    </div>
                  )}
                </div>
              )
            })}
            {filteredMain.length === 0 && (
              <p className="text-xs text-[#AAA] py-2">Aucun invité dans cette catégorie</p>
            )}
          </div>

          {/* Légende */}
          <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-[#F5F0E8]">
            {[
              { color: '#7C9A7E', label: 'Confirmé' },
              { color: '#E8A84C', label: 'En attente' },
              { color: '#C0392B', label: 'Absent' },
              { color: '#CCCCCC', label: 'Non renseigné' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full inline-block" style={{ background: l.color }} />
                <span className="text-[10px] text-[#888]">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
           SECTION PARTICIPATION BOUTIQUE
          ══════════════════════════════════════════ */}
      {guests.length > 0 && (() => {
        const nbTotal = guests.length
        const nbContactes = guests.filter(g => g.lien_envoye || g.invitation_envoyee).length
        const nbCommandos = guests.filter(g => g.converted).length
        const tauxPct = nbTotal > 0 ? Math.round((nbCommandos / nbTotal) * 100) : 0
        const pctContactes = nbTotal > 0 ? Math.round((nbContactes / nbTotal) * 100) : 0
        const ayantCommande = guests.filter(g => g.converted)
        const silencieux = guests.filter(g => !g.converted)
        return (
          <>
            {/* Stats participation */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F5F0E8]">
              <p className="font-semibold text-sm text-[#1A1A1A] mb-4">Participation boutique</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-[#F5F0E8] rounded-xl p-3 text-center">
                  <p className="font-bold text-xl text-[#1A1A1A]">{nbTotal}</p>
                  <p className="text-[10px] text-[#888] mt-0.5">Total invités</p>
                </div>
                <div className="bg-[#C9A84C]/10 rounded-xl p-3 text-center">
                  <p className="font-bold text-xl text-[#C9A84C]">{nbContactes}</p>
                  <p className="text-[10px] text-[#888] mt-0.5">Contactés</p>
                </div>
                <div className="bg-[#7C9A7E]/10 rounded-xl p-3 text-center">
                  <p className="font-bold text-xl text-[#7C9A7E]">{nbCommandos}</p>
                  <p className="text-[10px] text-[#888] mt-0.5">Ont commandé</p>
                </div>
                <div className="bg-[#1A1A1A]/5 rounded-xl p-3 text-center">
                  <p className="font-bold text-xl text-[#1A1A1A]">{tauxPct}%</p>
                  <p className="text-[10px] text-[#888] mt-0.5">Taux participation</p>
                </div>
              </div>
              {/* Barre de progression */}
              <div>
                <div className="flex justify-between text-[10px] text-[#888] mb-1">
                  <span>Progression des commandes</span>
                  <span>{nbCommandos}/{nbTotal}</span>
                </div>
                <div className="h-3 bg-[#F5F0E8] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${tauxPct}%`, background: tauxPct >= 50 ? '#7C9A7E' : '#C9A84C' }}
                  />
                </div>
                <div className="flex justify-between text-[10px] mt-1">
                  <span className="text-[#C9A84C]">{pctContactes}% contactés</span>
                  <span className="text-[#7C9A7E]">{tauxPct}% commandé</span>
                </div>
              </div>
            </div>

            {/* 2 colonnes : Ont commandé / Silencieux */}
            <div className="grid grid-cols-1 gap-3">

              {/* Colonne 1 — Ont commandé */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">✅</span>
                  <p className="font-semibold text-sm text-[#1A1A1A]">Ont commandé</p>
                  <span className="ml-auto bg-[#7C9A7E]/15 text-[#7C9A7E] text-xs font-bold px-2 py-0.5 rounded-full">{ayantCommande.length}</span>
                </div>
                {ayantCommande.length === 0 ? (
                  <p className="text-xs text-[#AAA] text-center py-4">
                    Vos invités n&apos;ont pas encore commandé 🌟<br />
                    <span className="text-[10px]">Partagez votre code pour les encourager !</span>
                  </p>
                ) : (
                  <div className="space-y-2">
                    {ayantCommande.map(g => (
                      <div key={g.id} className="flex items-center gap-3 py-2 border-b border-[#F5F0E8] last:border-0">
                        <div className="w-8 h-8 rounded-full bg-[#7C9A7E]/15 flex items-center justify-center flex-shrink-0">
                          <span className="text-[#7C9A7E] text-xs font-bold">{g.nom.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1A1A1A] truncate">{g.nom}</p>
                          {g.achats && g.achats.length > 0 ? (
                            <p className="text-[10px] text-[#888]">
                              {g.achats[0].produit} · {new Intl.NumberFormat('fr-FR').format(g.achats[0].montant)} FCFA
                            </p>
                          ) : g.total_achats > 0 ? (
                            <p className="text-[10px] text-[#888]">{new Intl.NumberFormat('fr-FR').format(g.total_achats)} FCFA</p>
                          ) : null}
                        </div>
                        <button
                          onClick={() => handleEnvoyerFiche(g)}
                          className="text-[10px] font-semibold px-2 py-1 rounded-full flex-shrink-0 transition-colors"
                          style={g.fiche_envoyee
                            ? { background: '#7C9A7E22', color: '#7C9A7E' }
                            : { background: '#C9A84C22', color: '#C9A84C' }}
                        >
                          {g.fiche_envoyee ? '🎫 Envoyée' : '🎫 Fiche →'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Colonne 2 — Silencieux */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">🔕</span>
                  <p className="font-semibold text-sm text-[#1A1A1A]">Silencieux</p>
                  <span className="ml-auto bg-[#888]/10 text-[#888] text-xs font-bold px-2 py-0.5 rounded-full">{silencieux.length}</span>
                </div>
                {silencieux.length === 0 ? (
                  <p className="text-xs text-[#7C9A7E] text-center py-4 font-medium">
                    🎉 Tous vos invités ont commandé !
                  </p>
                ) : (
                  <div className="space-y-2">
                    {silencieux.map(g => (
                      <div key={g.id} className="flex items-center gap-3 py-2 border-b border-[#F5F0E8] last:border-0">
                        <div className="w-8 h-8 rounded-full bg-[#F5F0E8] flex items-center justify-center flex-shrink-0">
                          <span className="text-[#888] text-xs font-bold">{g.nom.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1A1A1A] truncate">{g.nom}</p>
                          <p className="text-[10px] text-[#888]">
                            {g.relance_envoyee
                              ? '⚡ Relancé'
                              : g.lien_envoye || g.invitation_envoyee
                                ? 'Lien envoyé'
                                : 'Pas encore contacté'}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleEnvoyerFiche(g)}
                            className="text-[11px] font-semibold px-3 py-1.5 rounded-xl transition-colors"
                            style={g.fiche_envoyee
                              ? { background: '#7C9A7E22', color: '#7C9A7E' }
                              : { background: '#C9A84C', color: '#1A1A1A' }}
                          >
                            {g.fiche_envoyee ? '🎫 Envoyée' : '🎫 Fiche →'}
                          </button>
                          <button
                            onClick={() => !g.relance_envoyee && handleRelancer(g)}
                            disabled={relanceEnCours === g.id}
                            className="text-[11px] font-semibold px-3 py-1.5 rounded-xl border transition-colors disabled:opacity-50"
                            style={g.relance_envoyee
                              ? { borderColor: '#E8A84C', color: '#E8A84C', background: '#E8A84C10' }
                              : { borderColor: '#C9A84C', color: '#C9A84C', background: 'transparent' }}
                          >
                            {relanceEnCours === g.id ? '…' : g.relance_envoyee ? 'Relancé' : 'Relancer →'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )
      })()}

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
          <div className="grid grid-cols-2 gap-2">
            <input value={table} onChange={e => setTable(e.target.value)} placeholder="Table (optionnel)" className="border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]" />
            <label className="flex items-center gap-2 px-3 py-2.5 border border-[#E8E0D0] rounded-xl cursor-pointer">
              <input type="checkbox" checked={hebergement} onChange={e => setHebergement(e.target.checked)} className="w-4 h-4 accent-[#C9A84C]" />
              <span className="text-sm text-[#1A1A1A]">Hébergement</span>
            </label>
          </div>
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
