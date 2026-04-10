'use client'

import { useState, useTransition } from 'react'
import { Users, UserPlus, QrCode, RefreshCw, X, CheckCircle2, Loader2, Clock, Download, AlertTriangle } from 'lucide-react'
import { creerCommercial, renouvelerQrCommercial } from '@/actions/commerciaux'
import type { Commercial } from '@/actions/commerciaux'

interface Props {
  partenaireId: string
  commerciaux: Commercial[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isExpired(iso: string) {
  return new Date(iso) < new Date()
}

function daysLeft(iso: string) {
  const diff = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export default function CommerciauxSection({ partenaireId, commerciaux: initial }: Props) {
  const [commerciaux, setCommerciaux] = useState<Commercial[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [nouveauCommercial, setNouveauCommercial] = useState<{
    nom: string
    pin: string
    qr_url: string
  } | null>(null)
  const [qrModal, setQrModal] = useState<Commercial | null>(null)
  const [renouvPending, setRenouvPending] = useState<string | null>(null)
  const [renouvInfo, setRenouvInfo] = useState<{ nom: string; expire_at: string } | null>(null)

  const nombreActifs = commerciaux.filter((c) => c.statut !== 'suspendu').length

  const handleAjouter = () => {
    if (!nom.trim() || !telephone.trim()) {
      setError('Nom et telephone requis')
      return
    }
    setError('')
    startTransition(async () => {
      const res = await creerCommercial(partenaireId, {
        nom_complet: nom.trim(),
        telephone: telephone.trim(),
      })
      if (res.success && res.commercial_id) {
        const now = new Date()
        const expireAt = new Date(now)
        expireAt.setDate(expireAt.getDate() + 30)
        const newCommercial: Commercial = {
          id: res.commercial_id,
          partenaire_id: partenaireId,
          nom_complet: nom.trim(),
          telephone: telephone.trim(),
          pin_hash: '',
          qr_code_url: res.qr_code_url ?? '',
          qr_code_data: '',
          qr_genere_le: now.toISOString(),
          qr_expire_at: expireAt.toISOString(),
          statut: 'actif',
          total_reservations: 0,
          commission_totale_fcfa: 0,
          created_at: now.toISOString(),
          created_by: partenaireId,
        }
        setCommerciaux((prev) => [newCommercial, ...prev])
        setNouveauCommercial({
          nom: nom.trim(),
          pin: res.pin!,
          qr_url: res.qr_code_url ?? '',
        })
        setNom('')
        setTelephone('')
        setShowForm(false)
      } else {
        setError(res.error ?? 'Erreur lors de la creation')
      }
    })
  }

  const handleRenouveler = (commercial: Commercial) => {
    setRenouvPending(commercial.id)
    startTransition(async () => {
      const res = await renouvelerQrCommercial(commercial.id)
      if (res.success && res.qr_expire_at) {
        setCommerciaux((prev) =>
          prev.map((c) =>
            c.id === commercial.id
              ? { ...c, qr_code_url: res.qr_code_url ?? c.qr_code_url, qr_expire_at: res.qr_expire_at!, statut: 'actif' }
              : c
          )
        )
        setRenouvInfo({ nom: commercial.nom_complet, expire_at: res.qr_expire_at })
        if (qrModal?.id === commercial.id) {
          setQrModal((prev) =>
            prev
              ? { ...prev, qr_code_url: res.qr_code_url ?? prev.qr_code_url, qr_expire_at: res.qr_expire_at! }
              : prev
          )
        }
      }
      setRenouvPending(null)
    })
  }

  const whatsappShare = (commercial: Commercial) => {
    const msg = `Votre QR commercial L&Lui : ${commercial.qr_code_url} — valable jusqu'au ${formatDate(commercial.qr_expire_at)}`
    window.open(`https://wa.me/${commercial.telephone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <div className="bg-white rounded-2xl border border-beige-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-serif text-lg font-semibold text-dark flex items-center gap-2">
            <Users size={18} className="text-gold-500" />
            Mes Commerciaux
          </h2>
          <p className="text-dark/40 text-xs mt-0.5">
            {nombreActifs}/5 commerciaux actifs — ils gagnent 50% des commissions
          </p>
        </div>
        {nombreActifs < 5 && (
          <button
            onClick={() => { setShowForm((v) => !v); setError('') }}
            className="flex items-center gap-2 bg-dark text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-dark/80 transition-all"
          >
            <UserPlus size={15} />
            Ajouter
          </button>
        )}
        {nombreActifs >= 5 && (
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
            Limite atteinte (5/5)
          </span>
        )}
      </div>

      {/* Formulaire ajout */}
      {showForm && (
        <div className="rounded-xl bg-beige-50 border border-beige-200 p-4 mb-5">
          <p className="text-sm font-semibold text-dark mb-1">Nouveau commercial</p>
          <p className="text-xs text-dark/40 mb-3">Un PIN sera auto-généré et envoyé par WhatsApp. QR valable 30 jours.</p>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Nom complet"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full border border-beige-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gold-400"
            />
            <input
              type="tel"
              placeholder="Telephone WhatsApp (ex: +23769...)"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              className="w-full border border-beige-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gold-400"
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleAjouter}
                disabled={isPending}
                className="flex-1 bg-gold-500 hover:bg-gold-400 text-dark font-semibold text-sm py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                Creer le commercial
              </button>
              <button
                onClick={() => { setShowForm(false); setError('') }}
                className="px-3 rounded-xl bg-white border border-beige-200 text-dark/50 hover:text-dark transition-all"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bandeau nouveau commercial créé */}
      {nouveauCommercial && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-4 mb-5">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-600" />
              <p className="text-sm font-semibold text-green-800">Commercial cree — WhatsApp envoye !</p>
            </div>
            <button onClick={() => setNouveauCommercial(null)} className="text-green-600/50 hover:text-green-600">
              <X size={14} />
            </button>
          </div>
          <p className="text-xs text-green-700 mb-0.5">Nom : <span className="font-bold">{nouveauCommercial.nom}</span></p>
          <p className="text-xs text-green-700 mb-3">PIN : <span className="font-mono font-bold text-sm">{nouveauCommercial.pin}</span></p>
          {nouveauCommercial.qr_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={nouveauCommercial.qr_url} alt="QR commercial" width={120} height={120} className="rounded-lg border border-green-200" />
          )}
        </div>
      )}

      {/* Bandeau renouvellement réussi */}
      {renouvInfo && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 mb-5 flex items-center justify-between">
          <p className="text-sm text-blue-800">
            QR de <span className="font-semibold">{renouvInfo.nom}</span> renouvelé jusqu'au{' '}
            <span className="font-bold">{formatDate(renouvInfo.expire_at)}</span>
            <span className="text-xs text-blue-600 ml-2">(WhatsApp envoye)</span>
          </p>
          <button onClick={() => setRenouvInfo(null)} className="text-blue-400 hover:text-blue-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Liste des commerciaux */}
      {commerciaux.length === 0 ? (
        <div className="text-center py-8 text-dark/30">
          <Users size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun commercial. Ajoutez-en un pour etendre votre reseau de vente.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {commerciaux.map((c) => {
            const expired = isExpired(c.qr_expire_at)
            const days = daysLeft(c.qr_expire_at)
            const expiringSoon = !expired && days <= 7
            return (
              <div
                key={c.id}
                className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${
                  c.statut === 'suspendu' ? 'border-beige-200 bg-beige-50 opacity-60' :
                  expired ? 'border-red-200 bg-red-50' :
                  'border-beige-200 bg-white'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-dark text-sm truncate">{c.nom_complet}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.statut === 'suspendu' ? 'bg-gray-100 text-gray-500' :
                      expired ? 'bg-red-100 text-red-600' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {c.statut === 'suspendu' ? 'Suspendu' : expired ? 'Expiré' : 'Actif'}
                    </span>
                  </div>
                  <p className="text-dark/40 text-xs mt-0.5">{c.telephone}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-dark/40">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {expired
                        ? `Expiré le ${formatDate(c.qr_expire_at)}`
                        : expiringSoon
                        ? <span className="text-amber-500 font-medium">Expire dans {days}j</span>
                        : `Expire le ${formatDate(c.qr_expire_at)}`}
                    </span>
                    <span>· {c.total_reservations} rés.</span>
                    <span>· {c.commission_totale_fcfa.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  {expiringSoon && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
                      <AlertTriangle size={11} />
                      <span>QR expire bientot — renouvelez pour continuer</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {/* Voir QR */}
                  <button
                    onClick={() => setQrModal(c)}
                    title="Voir QR"
                    className="p-2 rounded-lg text-dark/40 hover:text-dark hover:bg-beige-100 transition-all"
                  >
                    <QrCode size={16} />
                  </button>
                  {/* Renouveler QR */}
                  <button
                    onClick={() => handleRenouveler(c)}
                    disabled={renouvPending === c.id || isPending}
                    title="Renouveler QR (30 jours)"
                    className="p-2 rounded-lg text-dark/40 hover:text-blue-600 hover:bg-blue-50 transition-all disabled:opacity-40"
                  >
                    {renouvPending === c.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <RefreshCw size={16} />
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal QR */}
      {qrModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-beige-200">
              <div>
                <h3 className="font-semibold text-dark">QR de {qrModal.nom_complet}</h3>
                <p className="text-xs text-dark/40 mt-0.5">
                  {isExpired(qrModal.qr_expire_at)
                    ? <span className="text-red-500">Expiré</span>
                    : `Valable jusqu'au ${formatDate(qrModal.qr_expire_at)}`}
                </p>
              </div>
              <button
                onClick={() => setQrModal(null)}
                className="p-2 rounded-xl hover:bg-beige-50 text-dark/40"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 flex flex-col items-center gap-5">
              {qrModal.qr_code_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrModal.qr_code_url}
                  alt="QR commercial"
                  className="w-48 h-48 rounded-xl border border-beige-200"
                />
              ) : (
                <div className="w-48 h-48 bg-beige-50 rounded-xl flex items-center justify-center text-dark/30 text-xs">
                  QR non disponible
                </div>
              )}

              <div className="flex flex-col gap-2 w-full">
                {/* WhatsApp share */}
                <button
                  onClick={() => whatsappShare(qrModal)}
                  className="w-full py-3 rounded-xl font-medium text-sm text-white flex items-center justify-center gap-2"
                  style={{ background: '#25D366' }}
                >
                  📲 Envoyer par WhatsApp
                </button>

                {/* Download */}
                {qrModal.qr_code_url && (
                  <a
                    href={qrModal.qr_code_url}
                    download={`qr-commercial-${qrModal.nom_complet.replace(/\s+/g, '-')}.png`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 rounded-xl font-medium text-sm text-dark bg-beige-50 border border-beige-200 flex items-center justify-center gap-2 hover:bg-beige-100 transition-colors"
                  >
                    <Download size={15} /> Télécharger le QR
                  </a>
                )}

                {/* Renouveler depuis la modal */}
                <button
                  onClick={() => handleRenouveler(qrModal)}
                  disabled={renouvPending === qrModal.id || isPending}
                  className="w-full py-3 rounded-xl font-medium text-sm text-blue-700 bg-blue-50 border border-blue-200 flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  {renouvPending === qrModal.id ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <RefreshCw size={15} />
                  )}
                  Renouveler QR (30 jours de plus)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
