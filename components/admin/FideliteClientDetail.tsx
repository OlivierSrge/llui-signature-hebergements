'use client'

import { useState } from 'react'
import {
  changeClientLevel, adjustClientPoints, regenerateClientPromoCode,
  extendClientPromoCode, markPromoCodeSent, validateReferral,
} from '@/actions/fidelite'
import { LOYALTY_LEVELS } from '@/lib/loyaltyDefaults'
import { formatDate } from '@/lib/utils'

interface PointsEntry {
  id: string
  points: number
  action: string
  description: string
  balance_before: number
  balance_after: number
  created_at: string
}

interface Client {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  birthDate?: string | null
  memberCode: string
  niveau: string
  totalSejours: number
  totalPoints: number
  boutiqueDiscount: number
  boutiquePromoCode?: string | null
  boutiquePromoCodeExpiry?: string | null
  boutiquePromoCodeGeneratedAt?: string | null
  boutiquePromoCodeSentAt?: string | null
  referralCode?: string | null
  referrals?: Array<{ id: string; validatedAt: string; name?: string }>
  referredBy?: string | null
  levelChangedAt?: string | null
  levelChangeReason?: string | null
}

interface Props {
  client: Client
  pointsHistory: PointsEntry[]
  nextLevel: { label: string; emoji: string; minStays: number } | null
  progressPercent: number
  sejoursToNext: number | null
}

const NIVEAU_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  novice:      { label: 'Novice', emoji: '⭐', color: '#A0A0A0' },
  explorateur: { label: 'Explorateur', emoji: '⭐⭐', color: '#4A90D9' },
  ambassadeur: { label: 'Ambassadeur', emoji: '⭐⭐⭐', color: '#C9A84C' },
  excellence:  { label: 'Excellence', emoji: '👑', color: '#1A1A1A' },
}

const ACTION_LABELS = [
  'séjour_manuel', 'geste_commercial', 'erreur_correction', 'parrainage',
  'anniversaire', 'avis_client', 'autre',
]

export default function FideliteClientDetail({ client, pointsHistory, nextLevel, progressPercent, sejoursToNext }: Props) {
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  // Section B — Points
  const [showAddPoints, setShowAddPoints] = useState(false)
  const [showRemovePoints, setShowRemovePoints] = useState(false)
  const [pointsAmount, setPointsAmount] = useState('')
  const [pointsAction, setPointsAction] = useState('geste_commercial')
  const [pointsDesc, setPointsDesc] = useState('')

  // Section A — Changer niveau
  const [showLevelChange, setShowLevelChange] = useState(false)
  const [newLevel, setNewLevel] = useState(client.niveau)
  const [levelReason, setLevelReason] = useState('')

  // Section D — Parrainage
  const [showReferral, setShowReferral] = useState(false)
  const [refereeId, setRefereeId] = useState('')

  const notify = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 4000) }

  const niveauInfo = NIVEAU_LABELS[client.niveau] || NIVEAU_LABELS.novice
  const now = new Date()
  const promoExpired = client.boutiquePromoCodeExpiry && new Date(client.boutiquePromoCodeExpiry) <= now
  const promoActive = client.boutiquePromoCode && !promoExpired

  const waPhone = (client.phone || '').replace(/\D/g, '').startsWith('237')
    ? (client.phone || '').replace(/\D/g, '')
    : `237${(client.phone || '').replace(/\D/g, '')}`

  const buildPromoMsg = () => {
    const levelData = LOYALTY_LEVELS[client.niveau as keyof typeof LOYALTY_LEVELS]
    const expiry = client.boutiquePromoCodeExpiry
      ? formatDate(client.boutiquePromoCodeExpiry, 'dd/MM/yyyy') : 'N/A'
    return encodeURIComponent(
      `Bonjour ${client.firstName} 🌟\n\nEn tant que membre ${niveauInfo.emoji} ${niveauInfo.label} L&Lui Stars, voici votre code promo exclusif pour la boutique en ligne :\n\n🎁 Code : ${client.boutiquePromoCode}\n💰 Réduction : ${levelData?.discountBoutique || 0}% sur tous vos achats\n⏰ Valable jusqu'au : ${expiry}\n\n👉 Boutique : http://l-et-lui-signature.com\n\nMerci de votre fidélité ! L'équipe L&Lui Signature 🌺`
    )
  }

  const handleAdjustPoints = async (mode: 'add' | 'remove') => {
    const delta = parseInt(pointsAmount)
    if (isNaN(delta) || delta <= 0) return notify('❌ Montant invalide')
    if (!pointsDesc.trim()) return notify('❌ Description obligatoire')
    setLoading('points')
    const res = await adjustClientPoints(client.id, mode === 'add' ? delta : -delta, pointsAction, pointsDesc)
    if (res.success) {
      notify(`✅ ${mode === 'add' ? '+' : '-'}${delta} points — nouveau solde : ${res.newTotal}`)
      setShowAddPoints(false)
      setShowRemovePoints(false)
      setPointsAmount('')
      setPointsDesc('')
    } else {
      notify(`❌ ${res.error}`)
    }
    setLoading(null)
  }

  const handleLevelChange = async () => {
    if (!levelReason.trim()) return notify('❌ Raison obligatoire')
    setLoading('level')
    const res = await changeClientLevel(client.id, newLevel, levelReason)
    if (res.success) {
      notify(`✅ Niveau changé en ${NIVEAU_LABELS[newLevel]?.label}`)
      setShowLevelChange(false)
      setLevelReason('')
    } else {
      notify(`❌ ${res.error}`)
    }
    setLoading(null)
  }

  const handleRegenPromo = async () => {
    setLoading('promo')
    const res = await regenerateClientPromoCode(client.id)
    if (res.success) notify(`✅ Nouveau code : ${res.code}`)
    else notify(`❌ ${res.error}`)
    setLoading(null)
  }

  const handleExtend = async () => {
    setLoading('extend')
    const res = await extendClientPromoCode(client.id, 30)
    if (res.success) notify('✅ Code prolongé de 30 jours')
    else notify(`❌ ${res.error}`)
    setLoading(null)
  }

  const handleMarkSent = async () => {
    setLoading('sent')
    await markPromoCodeSent(client.id)
    notify('✅ Marqué comme envoyé')
    setLoading(null)
  }

  const handleReferral = async () => {
    if (!refereeId.trim()) return notify('❌ ID filleul obligatoire')
    setLoading('referral')
    const res = await validateReferral(client.id, refereeId)
    if (res.success) {
      notify('✅ Parrainage validé — points attribués')
      setShowReferral(false)
      setRefereeId('')
    } else {
      notify(`❌ ${res.error}`)
    }
    setLoading(null)
  }

  return (
    <div className="space-y-5">
      {/* Message de feedback */}
      {msg && (
        <div className="fixed top-4 right-4 z-50 bg-dark text-white px-4 py-2.5 rounded-xl text-sm shadow-lg">
          {msg}
        </div>
      )}

      {/* SECTION A — Informations et niveau */}
      <div className="bg-white rounded-2xl border border-beige-200 p-5">
        <h2 className="font-semibold text-dark text-sm mb-4">Niveau de fidélité</h2>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{niveauInfo.emoji}</span>
          <div>
            <p className="font-bold text-dark text-lg">{niveauInfo.label}</p>
            <p className="text-xs text-dark/40">{client.totalSejours} séjour(s) confirmé(s)</p>
          </div>
          <button onClick={() => setShowLevelChange(!showLevelChange)}
            className="ml-auto text-xs px-3 py-1.5 rounded-xl border border-beige-200 text-dark/60 hover:bg-beige-50">
            Changer manuellement
          </button>
        </div>

        {/* Barre progression */}
        {nextLevel && sejoursToNext !== null && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-dark/40 mb-1">
              <span>Vers {nextLevel.emoji} {nextLevel.label}</span>
              <span>{sejoursToNext} séjour(s) restant(s)</span>
            </div>
            <div className="w-full h-2 bg-beige-100 rounded-full overflow-hidden">
              <div className="h-full bg-gold-400 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        )}
        {!nextLevel && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-dark/40 mb-1">
              <span>Niveau maximum atteint 👑</span>
              <span>100%</span>
            </div>
            <div className="w-full h-2 bg-dark/20 rounded-full" />
          </div>
        )}

        {/* Formulaire changement niveau */}
        {showLevelChange && (
          <div className="border border-beige-200 rounded-xl p-4 space-y-3 mt-2">
            <select value={newLevel} onChange={(e) => setNewLevel(e.target.value)}
              className="w-full text-sm border border-beige-200 rounded-xl px-3 py-2 focus:outline-none focus:border-gold-400">
              <option value="novice">⭐ Novice</option>
              <option value="explorateur">⭐⭐ Explorateur</option>
              <option value="ambassadeur">⭐⭐⭐ Ambassadeur</option>
              <option value="excellence">👑 Excellence</option>
            </select>
            <input
              type="text"
              placeholder="Raison du changement (obligatoire)"
              value={levelReason}
              onChange={(e) => setLevelReason(e.target.value)}
              className="w-full text-sm border border-beige-200 rounded-xl px-3 py-2 focus:outline-none focus:border-gold-400"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowLevelChange(false)}
                className="flex-1 py-2 text-sm border border-beige-200 rounded-xl text-dark/60">Annuler</button>
              <button onClick={handleLevelChange} disabled={loading === 'level'}
                className="flex-1 py-2 text-sm bg-gold-500 text-white rounded-xl font-medium hover:bg-gold-600">
                {loading === 'level' ? '...' : 'Confirmer'}
              </button>
            </div>
          </div>
        )}

        {client.levelChangedAt && (
          <p className="text-xs text-dark/30 mt-2">
            Dernier changement : {formatDate(client.levelChangedAt, 'dd/MM/yyyy')} — {client.levelChangeReason}
          </p>
        )}
      </div>

      {/* SECTION B — Points */}
      <div className="bg-white rounded-2xl border border-beige-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-dark text-sm">Points de fidélité</h2>
          <span className="text-2xl font-bold text-gold-600">{(client.totalPoints || 0).toLocaleString('fr-FR')} pts</span>
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={() => { setShowAddPoints(true); setShowRemovePoints(false) }}
            className="flex-1 py-2 text-sm bg-green-600 text-white rounded-xl font-medium hover:bg-green-700">
            + Ajouter des points
          </button>
          <button onClick={() => { setShowRemovePoints(true); setShowAddPoints(false) }}
            className="flex-1 py-2 text-sm border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50">
            − Retirer des points
          </button>
        </div>

        {(showAddPoints || showRemovePoints) && (
          <div className="border border-beige-200 rounded-xl p-4 space-y-3 mb-4">
            <p className="text-sm font-medium text-dark">
              {showAddPoints ? '+ Ajouter des points' : '− Retirer des points'}
            </p>
            <input
              type="number"
              min="1"
              placeholder="Nombre de points"
              value={pointsAmount}
              onChange={(e) => setPointsAmount(e.target.value)}
              className="w-full text-sm border border-beige-200 rounded-xl px-3 py-2 focus:outline-none focus:border-gold-400"
            />
            <select value={pointsAction} onChange={(e) => setPointsAction(e.target.value)}
              className="w-full text-sm border border-beige-200 rounded-xl px-3 py-2 focus:outline-none focus:border-gold-400">
              {ACTION_LABELS.map((a) => <option key={a} value={a}>{a.replace('_', ' ')}</option>)}
            </select>
            <input
              type="text"
              placeholder="Description libre (obligatoire)"
              value={pointsDesc}
              onChange={(e) => setPointsDesc(e.target.value)}
              className="w-full text-sm border border-beige-200 rounded-xl px-3 py-2 focus:outline-none focus:border-gold-400"
            />
            <div className="flex gap-2">
              <button onClick={() => { setShowAddPoints(false); setShowRemovePoints(false) }}
                className="flex-1 py-2 text-sm border border-beige-200 rounded-xl text-dark/60">Annuler</button>
              <button onClick={() => handleAdjustPoints(showAddPoints ? 'add' : 'remove')}
                disabled={loading === 'points'}
                className={`flex-1 py-2 text-sm rounded-xl font-medium text-white ${showAddPoints ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}>
                {loading === 'points' ? '...' : 'Confirmer'}
              </button>
            </div>
          </div>
        )}

        {/* Historique points */}
        {pointsHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-beige-100">
                  <th className="text-left text-dark/40 font-medium pb-2">Date</th>
                  <th className="text-left text-dark/40 font-medium pb-2">Action</th>
                  <th className="text-left text-dark/40 font-medium pb-2 hidden sm:table-cell">Description</th>
                  <th className="text-right text-dark/40 font-medium pb-2">Points</th>
                  <th className="text-right text-dark/40 font-medium pb-2">Solde</th>
                </tr>
              </thead>
              <tbody>
                {pointsHistory.slice(0, 10).map((h) => (
                  <tr key={h.id} className="border-b border-beige-50 last:border-0">
                    <td className="py-2 text-dark/50">{formatDate(h.created_at, 'dd/MM HH:mm')}</td>
                    <td className="py-2 text-dark/70">{h.action}</td>
                    <td className="py-2 text-dark/50 hidden sm:table-cell truncate max-w-xs">{h.description}</td>
                    <td className={`py-2 text-right font-semibold ${h.points >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {h.points >= 0 ? '+' : ''}{h.points}
                    </td>
                    <td className="py-2 text-right text-dark/60">{h.balance_after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-dark/30">Aucun historique de points enregistré.</p>
        )}
      </div>

      {/* SECTION C — Code promo boutique */}
      <div className="bg-white rounded-2xl border border-beige-200 p-5">
        <h2 className="font-semibold text-dark text-sm mb-4">Code promo boutique</h2>
        {client.boutiquePromoCode ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-beige-50 rounded-xl">
              <div>
                <p className="font-mono font-bold text-dark text-base">{client.boutiquePromoCode}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-dark/40">
                  <span className={`font-medium ${promoActive ? 'text-green-600' : 'text-red-500'}`}>
                    {promoActive ? '● Actif' : '● Expiré'}
                  </span>
                  {client.boutiquePromoCodeExpiry && (
                    <span>Expire le {formatDate(client.boutiquePromoCodeExpiry, 'dd/MM/yyyy')}</span>
                  )}
                  {client.boutiquePromoCodeSentAt && (
                    <span>Envoyé le {formatDate(client.boutiquePromoCodeSentAt, 'dd/MM/yyyy')}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={handleRegenPromo} disabled={loading === 'promo'}
                className="text-xs px-3 py-2 rounded-xl border border-beige-200 text-dark/60 hover:bg-beige-50">
                {loading === 'promo' ? '...' : '🔄 Nouveau code'}
              </button>
              {client.phone && (
                <a
                  href={`https://wa.me/${waPhone}?text=${buildPromoMsg()}`}
                  target="_blank" rel="noopener noreferrer"
                  onClick={handleMarkSent}
                  className="text-xs px-3 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700"
                >
                  📱 Envoyer WhatsApp
                </a>
              )}
              <button onClick={handleExtend} disabled={loading === 'extend'}
                className="text-xs px-3 py-2 rounded-xl border border-beige-200 text-dark/60 hover:bg-beige-50">
                {loading === 'extend' ? '...' : '⏱ +30 jours'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-dark/40 mb-3">Aucun code promo généré pour ce client.</p>
            <button onClick={handleRegenPromo} disabled={loading === 'promo'}
              className="px-4 py-2 text-sm bg-gold-500 text-white rounded-xl font-medium hover:bg-gold-600">
              {loading === 'promo' ? '...' : '✨ Générer un code'}
            </button>
          </div>
        )}
      </div>

      {/* SECTION D — Parrainage */}
      <div className="bg-white rounded-2xl border border-beige-200 p-5">
        <h2 className="font-semibold text-dark text-sm mb-4">Parrainage</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-dark">{(client.referrals || []).length}</p>
            <p className="text-xs text-dark/40">Filleuls actifs</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-dark/40 mb-1">Code personnel</p>
            <p className="font-mono font-semibold text-dark text-sm">
              {client.referralCode || `LLUI-${client.memberCode?.slice(-5) || '?????'}`}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-dark/40 mb-1">Parrainé par</p>
            <p className="text-sm text-dark/60">{client.referredBy ? `ID: ${client.referredBy.slice(-8)}` : '—'}</p>
          </div>
        </div>

        {(client.referrals || []).length > 0 && (
          <div className="mb-4 space-y-1">
            {(client.referrals || []).map((r, i) => (
              <div key={i} className="flex items-center justify-between text-xs text-dark/50 py-1 border-b border-beige-50">
                <span>Filleul {i + 1} — {r.id?.slice(-8)}</span>
                <span>{r.validatedAt ? formatDate(r.validatedAt, 'dd/MM/yyyy') : ''}</span>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => setShowReferral(!showReferral)}
          className="text-xs px-3 py-2 rounded-xl border border-beige-200 text-dark/60 hover:bg-beige-50">
          ✅ Valider un parrainage manuel
        </button>

        {showReferral && (
          <div className="border border-beige-200 rounded-xl p-4 space-y-3 mt-3">
            <input
              type="text"
              placeholder="ID Firestore du filleul"
              value={refereeId}
              onChange={(e) => setRefereeId(e.target.value)}
              className="w-full text-sm border border-beige-200 rounded-xl px-3 py-2 focus:outline-none focus:border-gold-400"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowReferral(false)}
                className="flex-1 py-2 text-sm border border-beige-200 rounded-xl text-dark/60">Annuler</button>
              <button onClick={handleReferral} disabled={loading === 'referral'}
                className="flex-1 py-2 text-sm bg-gold-500 text-white rounded-xl font-medium">
                {loading === 'referral' ? '...' : 'Valider'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECTION E — Communications */}
      <div className="bg-white rounded-2xl border border-beige-200 p-5">
        <h2 className="font-semibold text-dark text-sm mb-4">Communications</h2>
        {client.phone ? (
          <div className="flex flex-wrap gap-2">
            <a
              href={`https://wa.me/${waPhone}?text=${encodeURIComponent(`Bonjour ${client.firstName} ${niveauInfo.emoji}\n\nEn tant que membre ${niveauInfo.label} L&Lui Stars, vous bénéficiez de :\n- ${LOYALTY_LEVELS[client.niveau as keyof typeof LOYALTY_LEVELS]?.discountAccommodation || 0}% sur nos hébergements\n- ${LOYALTY_LEVELS[client.niveau as keyof typeof LOYALTY_LEVELS]?.discountBoutique || 0}% sur la boutique\n\nMerci de votre fidélité !\nL'équipe L&Lui Signature 🌺`)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl bg-green-600 text-white hover:bg-green-700"
            >
              📱 Message bienvenue niveau
            </a>
            {client.boutiquePromoCode && (
              <a
                href={`https://wa.me/${waPhone}?text=${buildPromoMsg()}`}
                target="_blank" rel="noopener noreferrer"
                onClick={handleMarkSent}
                className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl bg-green-600 text-white hover:bg-green-700"
              >
                🎁 Rappel code promo
              </a>
            )}
            {client.birthDate && (
              <a
                href={`https://wa.me/${waPhone}?text=${encodeURIComponent(`Joyeux anniversaire ${client.firstName} 🎂🎉\n\nL'équipe L&Lui Signature vous offre ${LOYALTY_LEVELS[client.niveau as keyof typeof LOYALTY_LEVELS] ? '500' : '500'} points de fidélité pour votre anniversaire !\n\nMerci d'être parmi nos membres fidèles. 🌺`)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl bg-amber-500 text-white hover:bg-amber-600"
              >
                🎂 Message anniversaire
              </a>
            )}
          </div>
        ) : (
          <p className="text-xs text-dark/40">Aucun numéro de téléphone enregistré pour ce client.</p>
        )}
      </div>
    </div>
  )
}
