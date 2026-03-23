'use client'
// components/portail/stars/StarsParrainage.tsx — #150 L&Lui Stars étendu DIAMANT

import { useState } from 'react'

interface Filleul {
  uid: string
  noms_maries: string
  date_parrainage: string
  commission_fcfa: number
  statut: 'en_attente' | 'validee' | 'payee'
}

interface Props {
  marie_uid: string
  grade: string
  rev_lifetime: number
  code_parrainage: string
  filleuls: Filleul[]
  total_commissions: number
}

const AVANTAGES_DIAMANT = [
  { emoji: '💎', titre: 'Statut DIAMANT à vie', detail: 'Votre grade est permanent, même après le mariage' },
  { emoji: '💰', titre: '50 000 FCFA par filleul', detail: 'Pour chaque couple que vous parrainez et qui signe' },
  { emoji: '🎁', titre: 'Cadeaux anniversaire J+1 an', detail: 'Surprise exclusive livrée à votre domicile' },
  { emoji: '⭐', titre: 'Accès prioritaire nouveaux packs', detail: 'Avant tout le monde sur les nouvelles offres L&Lui' },
  { emoji: '📞', titre: 'Ligne directe Olivier', detail: 'Contact WhatsApp prioritaire 7j/7' },
  { emoji: '🎖️', titre: 'Badge DIAMANT sur portail', detail: 'Visible par toute la communauté alumni' },
]

const STATUT_CONFIG = {
  en_attente: { label: 'En attente', color: '#C9A84C', bg: '#C9A84C15' },
  validee: { label: 'Validée', color: '#5B8FBF', bg: '#5B8FBF15' },
  payee: { label: 'Payée ✓', color: '#7C9A7E', bg: '#7C9A7E15' },
}

export default function StarsParrainage({ marie_uid, grade, rev_lifetime, code_parrainage, filleuls, total_commissions }: Props) {
  const [copied, setCopied] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [nomFilleul, setNomFilleul] = useState('')
  const [telFilleul, setTelFilleul] = useState('')

  const isDiamant = grade === 'DIAMANT'
  const lienParrainage = `https://signature.llui.cm/portail?ref=${code_parrainage}`

  async function copyLink() {
    await navigator.clipboard.writeText(lienParrainage).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function sendReferral() {
    if (!nomFilleul.trim() || !telFilleul.trim()) return
    setSending(true)
    try {
      await fetch('/api/portail/stars-parrainage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marie_uid, nom_filleul: nomFilleul, tel_filleul: telFilleul, code_parrainage }),
      })
      setSent(true)
      setNomFilleul('')
      setTelFilleul('')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Grade banner */}
      <div className="rounded-2xl p-5 text-center" style={{ background: 'linear-gradient(135deg, #0A0A0A, #1A1A1A)', border: '1px solid #B9F2FF30' }}>
        <div className="text-3xl mb-2">💎</div>
        <p className="text-xs tracking-[0.3em] uppercase mb-1" style={{ color: '#B9F2FF' }}>L&Lui Stars</p>
        <p className="text-2xl font-serif text-white">Niveau {grade}</p>
        {!isDiamant && (
          <p className="text-xs mt-2" style={{ color: '#888' }}>
            DIAMANT dès {(150001 - rev_lifetime).toLocaleString('fr-FR')} FCFA de REV supplémentaires
          </p>
        )}
        {isDiamant && (
          <p className="text-xs mt-2" style={{ color: '#B9F2FF' }}>✨ Statut à vie — {total_commissions.toLocaleString('fr-FR')} FCFA de commissions cumulées</p>
        )}
      </div>

      {/* Avantages DIAMANT */}
      <div>
        <p className="text-xs font-bold text-[#888] uppercase tracking-wide mb-3">💎 Avantages DIAMANT</p>
        <div className="space-y-2">
          {AVANTAGES_DIAMANT.map(a => (
            <div key={a.titre} className="bg-white rounded-xl p-3 flex items-start gap-3" style={{ border: '1px solid #F5F0E8', opacity: isDiamant ? 1 : 0.5 }}>
              <span className="text-xl flex-shrink-0">{a.emoji}</span>
              <div>
                <p className="text-sm font-semibold text-[#1A1A1A]">{a.titre}</p>
                <p className="text-[10px] text-[#888]">{a.detail}</p>
              </div>
              {isDiamant && <span className="ml-auto text-[#7C9A7E] flex-shrink-0">✓</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Lien de parrainage */}
      <div className="bg-white rounded-2xl p-4" style={{ border: '1px solid #F5F0E8' }}>
        <p className="text-xs font-bold text-[#888] uppercase tracking-wide mb-3">🔗 Votre lien de parrainage</p>
        <div className="rounded-xl p-3 mb-3" style={{ background: '#C9A84C10', border: '1px solid #C9A84C20' }}>
          <p className="text-xs text-[#888] mb-1">Code parrainage</p>
          <p className="text-lg font-mono font-bold text-[#C9A84C]">{code_parrainage}</p>
        </div>
        <button
          onClick={copyLink}
          className="w-full py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{ background: copied ? '#7C9A7E' : '#1A1A1A', color: 'white' }}
        >
          {copied ? '✓ Lien copié !' : '📋 Copier le lien de parrainage'}
        </button>

        {/* Envoi direct */}
        <div className="mt-4 space-y-2">
          <p className="text-[10px] font-bold text-[#888] uppercase">Recommander directement un couple</p>
          <input
            value={nomFilleul} onChange={e => setNomFilleul(e.target.value)}
            placeholder="Noms des futurs mariés"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]"
          />
          <input
            value={telFilleul} onChange={e => setTelFilleul(e.target.value)}
            placeholder="Téléphone WhatsApp (+237…)"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]"
          />
          {sent ? (
            <p className="text-center text-xs font-bold text-[#7C9A7E] py-2">✅ Recommandation envoyée à L&Lui !</p>
          ) : (
            <button
              onClick={sendReferral}
              disabled={sending || !nomFilleul.trim() || !telFilleul.trim()}
              className="w-full py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
              style={{ background: '#C9A84C', color: 'white' }}
            >
              {sending ? 'Envoi…' : '💌 Envoyer la recommandation'}
            </button>
          )}
        </div>
      </div>

      {/* Tableau filleuls */}
      {filleuls.length > 0 && (
        <div>
          <p className="text-xs font-bold text-[#888] uppercase tracking-wide mb-3">👥 Mes filleuls ({filleuls.length})</p>
          <div className="space-y-2">
            {filleuls.map(f => {
              const cfg = STATUT_CONFIG[f.statut]
              return (
                <div key={f.uid} className="bg-white rounded-xl p-3" style={{ border: '1px solid #F5F0E8' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#1A1A1A]">{f.noms_maries}</p>
                      <p className="text-[10px] text-[#888]">{new Date(f.date_parrainage).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#C9A84C]">{f.commission_fcfa.toLocaleString('fr-FR')} FCFA</p>
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-3 rounded-xl p-3 text-center" style={{ background: '#C9A84C10', border: '1px solid #C9A84C20' }}>
            <p className="text-xs text-[#888]">Total commissions générées</p>
            <p className="text-xl font-bold text-[#C9A84C]">{total_commissions.toLocaleString('fr-FR')} FCFA</p>
          </div>
        </div>
      )}

      {filleuls.length === 0 && (
        <div className="rounded-xl p-5 text-center" style={{ border: '1px dashed #DDD' }}>
          <p className="text-3xl mb-2">🤝</p>
          <p className="text-sm font-semibold text-[#1A1A1A]">Aucun filleul pour l'instant</p>
          <p className="text-[10px] text-[#888] mt-1">Partagez votre lien — 50 000 FCFA par couple signé</p>
        </div>
      )}
    </div>
  )
}
