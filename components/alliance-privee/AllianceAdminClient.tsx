'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  type AlliancePartner,
  type AllianceApplication,
  type AllianceStats,
  type AllianceCardTier,
  type AlliancePayment,
  TIER_CONFIGS,
} from '@/types/alliance-privee'
import {
  toggleAllianceActive,
  upsertAlliancePartner,
  traiterCandidature,
  verifierPaiement,
} from '@/actions/alliance-privee'

const BASE_URL = 'https://llui-signature-hebergements.vercel.app'

function slugifyNom(nom: string): string {
  return nom
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // accents
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function getQrPath(p: AlliancePartner): string {
  const slug = slugifyNom(p.nom_etablissement || p.id)
  return `/qr-codes/alliance/${slug}.png`
}

function getActivateUrl(p: AlliancePartner): string {
  return `${BASE_URL}/alliance-privee/activate?pid=${p.id}`
}

interface Props {
  partners: AlliancePartner[]
  candidatures: AllianceApplication[]
  stats: AllianceStats
  paiements: AlliancePayment[]
}

type Tab = 'stats' | 'partenaires' | 'paiements' | 'candidatures'

export default function AllianceAdminClient({ partners, candidatures, stats, paiements }: Props) {
  const [tab, setTab] = useState<Tab>('stats')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editPartnerId, setEditPartnerId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<AlliancePartner>>({})
  const [decisionId, setDecisionId] = useState<string | null>(null)
  const [moderNotes, setModerNotes] = useState('')
  const [decisionError, setDecisionError] = useState('')

  // ─── Partenaires ───────────────────────────────────────────────

  async function handleToggle(p: AlliancePartner) {
    setLoadingId(p.id)
    await toggleAllianceActive(p.partenaire_id, !p.alliance_active)
    setLoadingId(null)
  }

  function startEdit(p: AlliancePartner) {
    setEditPartnerId(p.id)
    setEditForm({
      prix_prestige_fcfa: p.prix_prestige_fcfa,
      prix_excellence_fcfa: p.prix_excellence_fcfa,
      prix_elite_fcfa: p.prix_elite_fcfa,
      revolut_link_prestige: p.revolut_link_prestige ?? '',
      revolut_link_excellence: p.revolut_link_excellence ?? '',
      revolut_link_elite: p.revolut_link_elite ?? '',
      description_club: p.description_club ?? '',
    })
  }

  async function saveEdit(p: AlliancePartner) {
    setLoadingId(p.id)
    await upsertAlliancePartner(p.partenaire_id, editForm)
    setEditPartnerId(null)
    setLoadingId(null)
  }

  // ─── Candidatures ──────────────────────────────────────────────

  async function handleDecision(appId: string, decision: 'approuve' | 'refuse' | 'en_revision') {
    setLoadingId(appId)
    setDecisionError('')
    const res = await traiterCandidature(appId, decision, moderNotes)
    if (!res.success && res.error) {
      setDecisionError(res.error)
    } else {
      setDecisionId(null)
      setModerNotes('')
    }
    setLoadingId(null)
  }

  async function handleVerifierPaiement(payId: string, decision: 'VERIFIED' | 'REJECTED') {
    setLoadingId(payId)
    await verifierPaiement(payId, decision, 'admin')
    setLoadingId(null)
  }

  const paiementsEnAttente = paiements.filter((p) => p.statut === 'PENDING')

  const pendingCandidatures = candidatures.filter((c) => c.status === 'en_attente')
  const treatedCandidatures = candidatures.filter((c) => c.status !== 'en_attente')

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/5 bg-black/80 sticky top-0 z-20 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-amber-400">✦</span>
            <span className="font-semibold text-white">Alliance Privée — Admin</span>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {(['stats', 'partenaires', 'paiements', 'candidatures'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-colors ${
                  tab === t ? 'bg-amber-500/20 text-amber-300' : 'text-white/40 hover:text-white/60'
                }`}
              >
                {t}
                {t === 'candidatures' && pendingCandidatures.length > 0 && (
                  <span className="ml-1.5 bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {pendingCandidatures.length}
                  </span>
                )}
                {t === 'paiements' && paiementsEnAttente.length > 0 && (
                  <span className="ml-1.5 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {paiementsEnAttente.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-8">
        {/* Onglet Stats */}
        {tab === 'stats' && (
          <div>
            <h2 className="text-xl font-serif font-light text-white mb-6">Vue d&apos;ensemble</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Partenaires actifs', value: stats.total_partenaires_actifs, icon: '🏢' },
                { label: 'Candidatures', value: stats.total_candidatures, icon: '📝' },
                { label: 'En attente', value: stats.candidatures_en_attente, icon: '⏳', accent: true },
                { label: 'Portraits actifs', value: stats.total_portraits, icon: '✦' },
                { label: 'Matches créés', value: stats.total_matches, icon: '🔗' },
                { label: 'Matches mutuels', value: stats.matches_mutuels, icon: '💑' },
                { label: 'Approuvés', value: stats.candidatures_approuvees, icon: '✅' },
              ].map((s) => (
                <div
                  key={s.label}
                  className={`rounded-2xl border p-5 ${s.accent ? 'border-amber-500/30 bg-amber-500/5' : 'border-white/10 bg-white/5'}`}
                >
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <div className={`text-2xl font-bold mb-1 ${s.accent ? 'text-amber-400' : 'text-white'}`}>
                    {s.value}
                  </div>
                  <div className="text-white/40 text-xs">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Onglet Partenaires */}
        {tab === 'partenaires' && (
          <div>
            <h2 className="text-xl font-serif font-light text-white mb-6">Partenaires Alliance</h2>
            {partners.length === 0 ? (
              <div className="text-center py-16 text-white/30">
                <div className="text-4xl mb-3">✦</div>
                <p>Aucun partenaire Alliance configuré</p>
                <p className="text-xs mt-1">Créez un partenaire via la section Prescripteurs</p>
              </div>
            ) : (
              <div className="space-y-4">
                {partners.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      {/* Infos + actions */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-white">{p.nom_etablissement}</span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border ${
                              p.alliance_active
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-white/5 text-white/30 border-white/10'
                            }`}
                          >
                            {p.alliance_active ? '● Actif' : '○ Inactif'}
                          </span>
                        </div>
                        <p className="text-white/30 text-xs font-mono truncate">{p.id}</p>

                        {/* URL d'activation + copie */}
                        <QrUrlRow activateUrl={getActivateUrl(p)} />
                      </div>

                      {/* QR code */}
                      <QrBlock qrPath={getQrPath(p)} activateUrl={getActivateUrl(p)} nom={p.nom_etablissement} />
                    </div>

                    {/* Boutons Modifier / Activer */}
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        onClick={() => (editPartnerId === p.id ? setEditPartnerId(null) : startEdit(p))}
                        className="px-3 py-1.5 rounded-lg border border-white/10 text-white/50 text-xs hover:border-white/20 transition-colors"
                      >
                        {editPartnerId === p.id ? 'Annuler' : 'Modifier'}
                      </button>
                      <button
                        onClick={() => handleToggle(p)}
                        disabled={loadingId === p.id}
                        className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                          p.alliance_active
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                        }`}
                      >
                        {loadingId === p.id ? '...' : p.alliance_active ? 'Désactiver' : 'Activer'}
                      </button>
                    </div>

                    {editPartnerId === p.id && (
                      <div className="border-t border-white/5 pt-4 mt-2 space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          {(['PRESTIGE', 'EXCELLENCE', 'ELITE'] as AllianceCardTier[]).map((tier) => (
                            <div key={tier}>
                              <label className="block text-white/40 text-xs mb-1">
                                Prix {TIER_CONFIGS[tier].label} (FCFA)
                              </label>
                              <input
                                type="number"
                                value={editForm[`prix_${tier.toLowerCase()}_fcfa` as keyof typeof editForm] as number ?? ''}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    [`prix_${tier.toLowerCase()}_fcfa`]: parseInt(e.target.value, 10),
                                  }))
                                }
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500/40"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="space-y-2">
                          {(['PRESTIGE', 'EXCELLENCE', 'ELITE'] as AllianceCardTier[]).map((tier) => (
                            <div key={tier}>
                              <label className="block text-white/40 text-xs mb-1">
                                Lien Revolut {TIER_CONFIGS[tier].label}
                              </label>
                              <input
                                type="url"
                                value={editForm[`revolut_link_${tier.toLowerCase()}` as keyof typeof editForm] as string ?? ''}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    [`revolut_link_${tier.toLowerCase()}`]: e.target.value,
                                  }))
                                }
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500/40"
                                placeholder="https://revolut.me/..."
                              />
                            </div>
                          ))}
                        </div>
                        <div>
                          <label className="block text-white/40 text-xs mb-1">Description du club (optionnel)</label>
                          <textarea
                            value={editForm.description_club ?? ''}
                            onChange={(e) => setEditForm((f) => ({ ...f, description_club: e.target.value }))}
                            rows={2}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500/40 resize-none"
                            placeholder="Texte d'accroche affiché sur la page d'activation..."
                          />
                        </div>
                        <button
                          onClick={() => saveEdit(p)}
                          disabled={loadingId === p.id}
                          className="w-full py-2.5 rounded-xl bg-amber-500 text-black font-semibold text-xs hover:bg-amber-400 transition-colors disabled:opacity-50"
                        >
                          {loadingId === p.id ? 'Enregistrement...' : 'Enregistrer les modifications'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Onglet Paiements */}
        {tab === 'paiements' && (
          <div>
            <h2 className="text-xl font-serif font-light text-white mb-6">
              Justificatifs de paiement
              {paiementsEnAttente.length > 0 && (
                <span className="ml-3 text-sm text-orange-400">{paiementsEnAttente.length} en attente</span>
              )}
            </h2>

            {paiements.length === 0 ? (
              <div className="text-center py-16 text-white/30">
                <div className="text-4xl mb-3">💳</div>
                <p>Aucun justificatif reçu</p>
              </div>
            ) : (
              <div className="space-y-4">
                {paiements.map((p) => (
                  <div key={p.id} className={`rounded-2xl border p-5 ${p.statut === 'PENDING' ? 'border-orange-500/30 bg-orange-500/5' : p.statut === 'VERIFIED' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${TIER_CONFIGS[p.tier].badge}`}>
                            {TIER_CONFIGS[p.tier].emoji} {p.tier}
                          </span>
                          <span className="text-white/50 text-xs">{p.gender} · {p.location}</span>
                          <span className="text-amber-400 text-xs font-semibold">
                            {p.montant.toLocaleString('fr-FR')} {p.devise}
                          </span>
                          <span className="text-white/30 text-xs">{p.methode}</span>
                        </div>
                        <p className="text-white/30 text-[10px] font-mono">{p.id}</p>
                        <p className="text-white/20 text-[10px]">
                          {new Date(p.date_creation).toLocaleString('fr-FR')}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${
                        p.statut === 'PENDING' ? 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                        : p.statut === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-red-500/20 text-red-300 border-red-500/30'
                      }`}>
                        {p.statut === 'PENDING' ? '⏳ En attente' : p.statut === 'VERIFIED' ? '✓ Vérifié' : '✗ Rejeté'}
                      </span>
                    </div>

                    {/* Screenshot */}
                    {p.proof_url && (
                      <a href={p.proof_url} target="_blank" rel="noopener noreferrer"
                        className="block rounded-xl border border-white/10 overflow-hidden mb-3 hover:border-amber-500/30 transition-colors">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.proof_url} alt="Justificatif" className="w-full max-h-48 object-contain bg-white/5" />
                        <p className="text-white/30 text-[10px] text-center py-1.5">Cliquer pour agrandir</p>
                      </a>
                    )}

                    {/* Actions */}
                    {p.statut === 'PENDING' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVerifierPaiement(p.id, 'VERIFIED')}
                          disabled={loadingId === p.id}
                          className="flex-1 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                        >
                          {loadingId === p.id ? '...' : '✅ Vérifier'}
                        </button>
                        <button
                          onClick={() => handleVerifierPaiement(p.id, 'REJECTED')}
                          disabled={loadingId === p.id}
                          className="flex-1 py-2 rounded-xl bg-red-500/10 text-red-300 border border-red-500/20 text-xs font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
                        >
                          ❌ Rejeter
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Onglet Candidatures */}
        {tab === 'candidatures' && (
          <div>
            <h2 className="text-xl font-serif font-light text-white mb-6">
              Candidatures
              {pendingCandidatures.length > 0 && (
                <span className="ml-3 text-sm text-amber-400">
                  {pendingCandidatures.length} en attente
                </span>
              )}
            </h2>

            {candidatures.length === 0 ? (
              <div className="text-center py-16 text-white/30">
                <div className="text-4xl mb-3">📝</div>
                <p>Aucune candidature pour le moment</p>
              </div>
            ) : (
              <div className="space-y-4">
                {[...pendingCandidatures, ...treatedCandidatures].map((c) => (
                  <div
                    key={c.id}
                    className={`rounded-2xl border p-5 ${
                      c.status === 'en_attente'
                        ? 'border-amber-500/30 bg-amber-500/5'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-white">{c.prenom}</span>
                          <span className="text-white/40 text-sm">{c.age} ans · {c.ville}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${TIER_CONFIGS[c.tier_souhaite].badge}`}>
                            {TIER_CONFIGS[c.tier_souhaite].emoji} {c.tier_souhaite}
                          </span>
                          <StatusBadge status={c.status} />
                          {!c.payment_proof_verified && (
                            <span className="text-xs px-2 py-0.5 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-300">
                              ⚠️ Paiement non vérifié
                            </span>
                          )}
                        </div>
                        <p className="text-white/40 text-xs">{c.profession}</p>
                        <p className="text-white/60 text-xs mt-2 line-clamp-2">{c.bio}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {c.valeurs.slice(0, 4).map((v) => (
                            <span key={v} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/30 border border-white/10">
                              {v}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Panel de décision */}
                    {c.status === 'en_attente' && (
                      <div className="mt-4 pt-4 border-t border-white/5">
                        {decisionId === c.id ? (
                          <div className="space-y-3">
                            {decisionError && (
                              <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-orange-300 text-xs">
                                ⚠️ {decisionError}
                              </div>
                            )}
                            <textarea
                              value={moderNotes}
                              onChange={(e) => setModerNotes(e.target.value)}
                              rows={2}
                              placeholder="Notes de modération (optionnel)..."
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs resize-none focus:outline-none focus:border-amber-500/40 placeholder-white/20"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDecision(c.id, 'approuve')}
                                disabled={loadingId === c.id}
                                className="flex-1 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                              >
                                {loadingId === c.id ? '...' : '✓ Approuver'}
                              </button>
                              <button
                                onClick={() => handleDecision(c.id, 'en_revision')}
                                disabled={loadingId === c.id}
                                className="flex-1 py-2 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-medium hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                              >
                                En révision
                              </button>
                              <button
                                onClick={() => handleDecision(c.id, 'refuse')}
                                disabled={loadingId === c.id}
                                className="flex-1 py-2 rounded-xl bg-red-500/10 text-red-300 border border-red-500/20 text-xs font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
                              >
                                ✗ Refuser
                              </button>
                            </div>
                            <button
                              onClick={() => { setDecisionId(null); setModerNotes('') }}
                              className="text-white/30 text-xs hover:text-white/50"
                            >
                              Annuler
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDecisionId(c.id)}
                            className="w-full py-2.5 rounded-xl border border-amber-500/30 text-amber-300 text-xs hover:bg-amber-500/10 transition-colors"
                          >
                            Traiter cette candidature
                          </button>
                        )}
                      </div>
                    )}

                    {c.moderateur_notes && (
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <p className="text-white/30 text-xs">Note : {c.moderateur_notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── QR Code block ────────────────────────────────────────────────────────────

function QrBlock({ qrPath, activateUrl, nom }: { qrPath: string; activateUrl: string; nom: string }) {
  const [enlarged, setEnlarged] = useState(false)

  return (
    <>
      <div className="shrink-0 flex flex-col items-center gap-2">
        <button
          onClick={() => setEnlarged(true)}
          title="Agrandir le QR code"
          className="w-20 h-20 rounded-xl border border-amber-500/20 bg-white p-1.5 hover:border-amber-500/50 transition-colors overflow-hidden"
        >
          <Image
            src={qrPath}
            alt={`QR ${nom}`}
            width={80}
            height={80}
            className="w-full h-full object-contain"
            onError={(e) => {
              // QR pas encore généré — affiche placeholder
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        </button>
        <a
          href={qrPath}
          download
          className="text-[10px] text-amber-400/70 hover:text-amber-400 transition-colors"
        >
          ↓ Télécharger
        </a>
      </div>

      {/* Modale agrandissement */}
      {enlarged && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setEnlarged(false)}
        >
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-black text-center text-sm font-semibold mb-4">{nom}</p>
            <Image src={qrPath} alt={`QR ${nom}`} width={300} height={300} className="w-full h-auto" />
            <div className="flex gap-2 mt-4">
              <a
                href={qrPath}
                download
                className="flex-1 py-2 rounded-xl bg-black text-white text-xs text-center font-medium hover:bg-gray-800 transition-colors"
              >
                ↓ Télécharger PNG
              </a>
              <button
                onClick={() => setEnlarged(false)}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-500 text-xs hover:bg-gray-50 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function QrUrlRow({ activateUrl }: { activateUrl: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(activateUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-white/25 text-[10px] truncate max-w-[220px]">{activateUrl}</span>
      <button
        onClick={copy}
        className="shrink-0 text-[10px] px-2 py-0.5 rounded-md border border-amber-500/20 text-amber-400/70 hover:text-amber-400 hover:border-amber-500/40 transition-colors"
      >
        {copied ? '✓ Copié' : 'Copier'}
      </button>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, string> = {
    en_attente: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    approuve: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    refuse: 'bg-red-500/20 text-red-300 border-red-500/30',
    en_revision: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  }
  const labels: Record<string, string> = {
    en_attente: 'En attente',
    approuve: 'Approuvé',
    refuse: 'Refusé',
    en_revision: 'En révision',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${configs[status] ?? 'border-white/10 text-white/30'}`}>
      {labels[status] ?? status}
    </span>
  )
}
