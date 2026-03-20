'use client'
// components/portail/GuestCard.tsx — Card invité avec QR, WhatsApp, suppression

import { getMagicLinkUrl } from '@/lib/generateMagicLink'

export interface Guest {
  id: string; nom: string; telephone: string; magic_link_slug: string
  lien_envoye: boolean; converted: boolean; total_achats: number; commissions_generees: number
}

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

interface Props {
  guest: Guest
  onQr: (g: Guest) => void
  onDelete: (g: Guest) => void
  onWa: (g: Guest) => void
  onCopy: (url: string) => void
}

export default function GuestCard({ guest: g, onQr, onDelete, onWa, onCopy }: Props) {
  const statut = g.converted
    ? { label: 'A acheté', color: '#7C9A7E', bg: '#7C9A7E18' }
    : g.lien_envoye
      ? { label: 'Lien envoyé', color: '#C9A84C', bg: '#C9A84C18' }
      : { label: 'En attente', color: '#888', bg: '#88888818' }

  const url = getMagicLinkUrl(g.magic_link_slug)

  const waMsg = `Bonjour ${g.nom} ! 🎊\nVous êtes invité(e) au mariage.\nVotre espace privilégié L&Lui :\n${url}\nAvec nos meilleurs vœux 💛\nL&Lui Signature`
  const waUrl = `https://wa.me/${g.telephone.replace(/\D/g, '')}?text=${encodeURIComponent(waMsg)}`

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F5F0E8]">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm text-[#1A1A1A]">{g.nom}</p>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: statut.color, background: statut.bg }}>
              {statut.label}{g.converted && g.total_achats > 0 ? ` · ${formatFCFA(g.total_achats)}` : ''}
            </span>
          </div>
          <p className="text-[11px] text-[#888]">{g.telephone}</p>
        </div>
        <button onClick={() => onDelete(g)} className="text-[11px] text-red-400 hover:text-red-600 ml-2">✕</button>
      </div>

      <div className="flex items-center gap-1 mb-3">
        <p className="text-[10px] text-[#888] truncate flex-1">{url.slice(0, 42)}…</p>
        <button onClick={() => onCopy(url)} className="text-[10px] text-[#C9A84C] hover:underline flex-shrink-0">Copier</button>
      </div>

      <div className="flex gap-2">
        <button onClick={() => onQr(g)} className="flex-1 py-2 rounded-xl text-xs border border-[#E8E0D0] text-[#888]">
          QR Code
        </button>
        <a href={waUrl} target="_blank" rel="noopener noreferrer" onClick={() => onWa(g)}
          className="flex-1 py-2 rounded-xl text-xs font-semibold text-white text-center" style={{ background: '#25D366' }}>
          WhatsApp
        </a>
      </div>
    </div>
  )
}

export function QrModal({ guest, onClose }: { guest: Guest; onClose: () => void }) {
  const url = getMagicLinkUrl(guest.magic_link_slug)
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-xs w-full text-center" onClick={e => e.stopPropagation()}>
        <p className="font-semibold text-sm mb-3">{guest.nom}</p>
        <img src={qrSrc} alt="QR Code" className="mx-auto mb-4 rounded-xl" />
        <div className="flex gap-2">
          <a href={qrSrc} download={`qr-${guest.magic_link_slug}.png`}
            className="flex-1 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: '#C9A84C' }}>
            Télécharger
          </a>
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm border border-[#E8E0D0]">Fermer</button>
        </div>
      </div>
    </div>
  )
}
