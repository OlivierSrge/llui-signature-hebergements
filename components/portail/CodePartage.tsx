'use client'
// components/portail/CodePartage.tsx — QR Code + envoi groupé invités + stats partage

import { useState, useEffect, useCallback } from 'react'
import QRCode from 'qrcode'

interface Props {
  code: string
  uid: string
}

interface Invite {
  id: string
  nom: string
  telephone: string
  prenom?: string
  lien_envoye?: boolean
  invitation_envoyee?: boolean
  converted?: boolean
}

const BOUTIQUE_BASE = 'https://l-et-lui-signature.com'

const MSG_DEFAUT = `Bonjour [Prénom] !
[Noms mariés] vous invitent à découvrir leurs prestations de mariage.
Utilisez le code *[CODE]* sur la boutique L&Lui Signature 💝
👉 https://l-et-lui-signature.com?code=[CODE]`

export default function CodePartage({ code, uid }: Props) {
  // --- QR Code ---
  const [showQR, setShowQR] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [downloaded, setDownloaded] = useState(false)

  // --- Envoi groupé ---
  const [showInvites, setShowInvites] = useState(false)
  const [invites, setInvites] = useState<Invite[]>([])
  const [loadingInvites, setLoadingInvites] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState(MSG_DEFAUT)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ envoyes: number; echecs: string[] } | null>(null)

  const url = `${BOUTIQUE_BASE}?code=${encodeURIComponent(code)}`

  // Génère le QR à l'ouverture de la modale
  useEffect(() => {
    if (!showQR) return
    QRCode.toDataURL(url, {
      width: 256,
      margin: 2,
      color: { dark: '#1A1A1A', light: '#FFFFFF' },
    }).then(setQrDataUrl).catch(console.error)
  }, [showQR, url])

  // Charge les invités (au mount pour les stats + à l'ouverture de la modale)
  const chargerInvites = useCallback(async () => {
    setLoadingInvites(true)
    try {
      const res = await fetch('/api/portail/invites')
      if (res.ok) {
        const data = await res.json()
        setInvites(data.guests ?? [])
      }
    } catch { /* silent */ } finally {
      setLoadingInvites(false)
    }
  }, [])

  // Chargement initial pour les stats
  useEffect(() => { chargerInvites() }, [chargerInvites])

  function openInvitesModal() {
    setShowInvites(true)
    setSendResult(null)
    setSelected(new Set())
    chargerInvites()
  }

  function downloadQR() {
    if (!qrDataUrl) return
    const link = document.createElement('a')
    link.download = `qr-code-${code}.png`
    link.href = qrDataUrl
    link.click()
    setDownloaded(true)
    setTimeout(() => setDownloaded(false), 2000)
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    if (selected.size === invites.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(invites.map(i => i.id)))
    }
  }

  async function envoyerInvitations() {
    if (selected.size === 0) return
    setSending(true)
    setSendResult(null)
    try {
      const payload = invites
        .filter(i => selected.has(i.id))
        .map(i => ({ id: i.id, tel: i.telephone, prenom: i.prenom || i.nom.split(' ')[0] || '' }))

      const res = await fetch('/api/portail/envoyer-invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invites: payload, message }),
      })
      const data = await res.json()
      setSendResult({ envoyes: data.envoyes ?? 0, echecs: data.echecs ?? [] })
      // Recharger pour mettre à jour les statuts
      await chargerInvites()
    } catch {
      setSendResult({ envoyes: 0, echecs: Array.from(selected) })
    } finally {
      setSending(false)
    }
  }

  if (!code) return null

  const invitesWithPhone = invites.filter(i => i.telephone)

  // Stats de partage
  const nbInvites = invites.length
  const nbEnvoyes = invites.filter(i => i.lien_envoye || i.invitation_envoyee).length
  const nbCommandos = invites.filter(i => i.converted).length
  const tauxConversion = nbEnvoyes > 0 ? Math.round((nbCommandos / nbEnvoyes) * 100) : 0

  return (
    <>
      {/* Boutons ligne 2 : QR Code + Envoyer à mes invités */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowQR(true)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-3 bg-[#F5F0E8]/10 border border-[#F5F0E8]/20 text-[#F5F0E8] text-sm font-semibold rounded-xl hover:bg-[#F5F0E8]/20 transition-colors"
        >
          <span>📷</span>
          <span>QR Code</span>
        </button>
        <button
          onClick={openInvitesModal}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-3 bg-[#C9A84C]/20 border border-[#C9A84C]/40 text-[#C9A84C] text-sm font-semibold rounded-xl hover:bg-[#C9A84C]/30 transition-colors"
        >
          <span>💌</span>
          <span>Mes invités</span>
        </button>
      </div>

      {/* Stats de partage */}
      {nbInvites > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="bg-[#F5F0E8]/10 rounded-xl p-2 text-center">
            <p className="text-white font-bold text-base">{nbEnvoyes}</p>
            <p className="text-white/50 text-[10px] leading-tight">Invités<br />contactés</p>
          </div>
          <div className="bg-[#F5F0E8]/10 rounded-xl p-2 text-center">
            <p className="text-white font-bold text-base">{nbCommandos}</p>
            <p className="text-white/50 text-[10px] leading-tight">Invités<br />ayant commandé</p>
          </div>
          <div className="bg-[#C9A84C]/10 rounded-xl p-2 text-center">
            <p className="text-[#C9A84C] font-bold text-base">{tauxConversion}%</p>
            <p className="text-white/50 text-[10px] leading-tight">Taux de<br />conversion</p>
          </div>
        </div>
      )}

      {/* ─── Modale QR Code ─── */}
      {showQR && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={e => { if (e.target === e.currentTarget) setShowQR(false) }}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#1A1A1A] text-base">Mon QR Code</h3>
              <button onClick={() => setShowQR(false)} className="text-[#888] hover:text-[#1A1A1A] text-xl font-bold">×</button>
            </div>

            <div className="flex justify-center mb-4">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code ${code}`}
                  width={256}
                  height={256}
                  className="rounded-xl border border-[#F5F0E8]"
                  style={{ background: '#FFFFFF' }}
                />
              ) : (
                <div className="w-64 h-64 bg-[#F5F0E8] rounded-xl flex items-center justify-center">
                  <span className="text-[#888] text-sm">Génération…</span>
                </div>
              )}
            </div>

            <p className="text-center text-[#C9A84C] font-bold text-lg tracking-widest mb-2">{code}</p>
            <p className="text-center text-xs text-[#888] mb-4 leading-relaxed">
              Imprimez ce QR code sur vos faire-part ou décorations de table
            </p>

            <button
              onClick={downloadQR}
              disabled={!qrDataUrl}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-40"
              style={{ background: '#C9A84C' }}
            >
              {downloaded ? '✓ Téléchargé !' : '⬇ Télécharger en PNG'}
            </button>
          </div>
        </div>
      )}

      {/* ─── Modale Envoi groupé invités ─── */}
      {showInvites && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={e => { if (e.target === e.currentTarget) setShowInvites(false) }}
        >
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#F5F0E8]">
              <h3 className="font-bold text-[#1A1A1A] text-base">Envoyer à mes invités</h3>
              <button onClick={() => setShowInvites(false)} className="text-[#888] hover:text-[#1A1A1A] text-xl font-bold">×</button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {/* Message éditable */}
              <div>
                <label className="text-xs font-semibold text-[#444] block mb-1">Message WhatsApp</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={5}
                  className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C9A84C] resize-none"
                />
                <p className="text-[10px] text-[#888] mt-1">
                  Variables : [Prénom], [Noms mariés], [CODE]
                </p>
              </div>

              {/* Liste invités */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-[#444]">
                    Invités ({invitesWithPhone.length} avec numéro)
                  </label>
                  {invitesWithPhone.length > 0 && (
                    <button
                      onClick={selectAll}
                      className="text-[11px] text-[#C9A84C] font-semibold"
                    >
                      {selected.size === invitesWithPhone.length ? 'Désélectionner' : 'Sélectionner tous'}
                    </button>
                  )}
                </div>

                {loadingInvites && (
                  <p className="text-xs text-[#888] text-center py-4">Chargement…</p>
                )}

                {!loadingInvites && invitesWithPhone.length === 0 && (
                  <p className="text-xs text-[#888] text-center py-4">
                    Aucun invité avec numéro de téléphone.<br />
                    Ajoutez des invités dans la section Invités.
                  </p>
                )}

                {!loadingInvites && invitesWithPhone.map(invite => (
                  <div
                    key={invite.id}
                    onClick={() => toggleSelect(invite.id)}
                    className="flex items-center gap-3 py-2 cursor-pointer hover:bg-[#F5F0E8] rounded-lg px-2 transition-colors"
                  >
                    <div
                      className="w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors"
                      style={{
                        borderColor: selected.has(invite.id) ? '#C9A84C' : '#DDD',
                        background: selected.has(invite.id) ? '#C9A84C' : 'transparent',
                      }}
                    >
                      {selected.has(invite.id) && <span className="text-white text-[10px] font-bold">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#1A1A1A] font-medium truncate">{invite.prenom || invite.nom}</p>
                      <p className="text-[10px] text-[#888]">{invite.telephone}</p>
                    </div>
                    {(invite.lien_envoye || invite.invitation_envoyee) && (
                      <span className="text-[10px] text-[#7C9A7E] font-semibold flex-shrink-0">✓ Envoyé</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Résultat d'envoi */}
              {sendResult && (
                <div className={`rounded-xl p-3 text-sm text-center ${sendResult.envoyes > 0 ? 'bg-[#7C9A7E]/10 text-[#7C9A7E]' : 'bg-red-50 text-red-600'}`}>
                  {sendResult.envoyes > 0 && <p>✓ {sendResult.envoyes} message{sendResult.envoyes > 1 ? 's' : ''} envoyé{sendResult.envoyes > 1 ? 's' : ''} !</p>}
                  {sendResult.echecs.length > 0 && <p>{sendResult.echecs.length} échec{sendResult.echecs.length > 1 ? 's' : ''}</p>}
                </div>
              )}
            </div>

            {/* Bouton envoyer */}
            <div className="p-5 border-t border-[#F5F0E8]">
              <button
                onClick={envoyerInvitations}
                disabled={selected.size === 0 || sending}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: '#25D366' }}
              >
                <span>📲</span>
                <span>
                  {sending
                    ? 'Envoi en cours…'
                    : selected.size > 0
                      ? `Envoyer via WhatsApp (${selected.size})`
                      : 'Sélectionnez des invités'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
