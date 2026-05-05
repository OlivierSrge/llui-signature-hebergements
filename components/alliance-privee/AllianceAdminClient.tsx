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
  togglePortraitActif,
} from '@/actions/alliance-privee'
import { fermerMatch, type MatchDoc } from '@/actions/alliance-privee-matching'
import MarkdownRenderer from '@/components/MarkdownRenderer'

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

// Type local portrait admin (plus souple que AlliancePortraitVerified)
interface PortraitAdmin {
  id: string
  prenom: string
  age: number
  ville: string
  profession: string
  gender?: string
  location?: string
  tier: AllianceCardTier
  actif?: boolean
  is_demo?: boolean
  photo_principale_floutee?: string
  photo_url?: string
  nombre_interets?: number
  nombre_vues?: number
  created_at?: string
}

interface Props {
  partners: AlliancePartner[]
  candidatures: AllianceApplication[]
  stats: AllianceStats
  paiements: AlliancePayment[]
  matchs?: MatchDoc[]
  portraits?: PortraitAdmin[]
}

type Tab = 'stats' | 'partenaires' | 'paiements' | 'candidatures' | 'matchs' | 'profils' | 'guide'

export default function AllianceAdminClient({ partners, candidatures, stats, paiements, matchs = [], portraits = [] }: Props) {
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
            {(['stats', 'profils', 'partenaires', 'paiements', 'candidatures', 'matchs', 'guide'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-colors ${
                  tab === t ? 'bg-amber-500/20 text-amber-300' : 'text-white/40 hover:text-white/60'
                }`}
              >
                {t === 'matchs' ? '💎 Matchs' : t === 'profils' ? '◈ Profils' : t === 'guide' ? '📖 Guide' : t}
                {t === 'profils' && portraits.length > 0 && (
                  <span className="ml-1.5 bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {portraits.length}
                  </span>
                )}
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
                {t === 'matchs' && matchs.length > 0 && (
                  <span className="ml-1.5 bg-emerald-500/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {matchs.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-8">
        {/* ─── Onglet Profils ───────────────────────────────────────── */}
        {tab === 'profils' && (
          <ProfilsAdminPanel portraits={portraits} />
        )}

        {/* ─── Onglet Guide Admin ─────────────────────────────────────── */}
        {tab === 'guide' && (
          <div className="pb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">📖 Guide Administrateur</h2>
              <a
                href="/admin/alliance-privee/guide-admin"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-amber-400/60 hover:text-amber-400 transition-colors"
              >
                Ouvrir en pleine page ↗
              </a>
            </div>
            <MarkdownRenderer filename="ALLIANCE_ADMIN.md" theme="admin" showTOC={true} />
          </div>
        )}

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

        {/* ─── Onglet Matchs & Conversations ───────────────────────── */}
        {tab === 'matchs' && (
          <div>
            <h2 className="text-xl font-serif font-light text-white mb-6">
              Matchs &amp; Conversations
              {matchs.length > 0 && (
                <span className="ml-3 text-sm text-emerald-400">{matchs.length} actif{matchs.length > 1 ? 's' : ''}</span>
              )}
            </h2>

            {matchs.length === 0 ? (
              <div className="text-center py-16 text-white/30">
                <div className="text-4xl mb-3">💎</div>
                <p>Aucun match pour le moment</p>
                <p className="text-xs mt-2 text-white/20">Les matchs apparaissent dès qu'il y a un intérêt mutuel entre deux membres.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {matchs.map((m) => (
                  <MatchAdminRow
                    key={m.id}
                    match={m}
                    onClose={async (id) => {
                      await fermerMatch(id)
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Match Admin Row ──────────────────────────────────────────────────────────

function MatchAdminRow({ match, onClose }: { match: MatchDoc; onClose: (id: string) => Promise<void> }) {
  const [closing, setClosing] = useState(false)
  const [closed, setClosed] = useState(match.status === 'CLOSED')

  const statusColors: Record<string, string> = {
    CHAT_ENABLED: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    ACTIVE: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    MEETING_SCHEDULED: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    CLOSED: 'text-white/30 bg-white/5 border-white/10',
  }

  async function handleClose() {
    if (!confirm('Fermer cette conversation ? Les deux membres n\'auront plus accès au chat.')) return
    setClosing(true)
    await onClose(match.id)
    setClosed(true)
    setClosing(false)
  }

  return (
    <div className={`border rounded-2xl p-5 ${closed ? 'border-white/10 opacity-50' : 'border-white/10 hover:border-emerald-500/20'} transition-all`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          {/* IDs membres */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-xs text-white/50 bg-white/5 px-2 py-1 rounded">
              A: {match.member_a_id.substring(0, 8)}…
            </span>
            <span className="text-amber-400">⇄</span>
            <span className="font-mono text-xs text-white/50 bg-white/5 px-2 py-1 rounded">
              B: {match.member_b_id.substring(0, 8)}…
            </span>
          </div>

          {/* Méta */}
          <div className="flex items-center gap-4 flex-wrap text-xs text-white/40">
            <span>💎 Compatibilité : <strong className="text-white/70">{match.compatibility_score}%</strong></span>
            <span>💬 {match.messages_count} message{match.messages_count !== 1 ? 's' : ''}</span>
            <span>📅 {new Date(match.date_matched).toLocaleDateString('fr-FR')}</span>
          </div>

          {/* Statut */}
          <span className={`inline-flex items-center text-xs px-2.5 py-0.5 rounded-full border ${statusColors[match.status] ?? 'text-white/30 border-white/10'}`}>
            {match.status === 'CHAT_ENABLED' ? '💬 Chat actif'
              : match.status === 'ACTIVE' ? '✓ Actif'
              : match.status === 'MEETING_SCHEDULED' ? '📅 RDV prévu'
              : '🔒 Fermé'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          <a
            href={`/alliance-privee/chat/${match.id}?demo=${match.member_a_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs border border-white/15 text-white/50 rounded-lg px-3 py-1.5 hover:border-white/30 hover:text-white/70 transition-all text-center"
          >
            👁 Voir chat
          </a>
          {!closed && match.status !== 'CLOSED' && (
            <button
              onClick={handleClose}
              disabled={closing}
              className="text-xs border border-red-500/30 text-red-400 rounded-lg px-3 py-1.5 hover:bg-red-500/10 transition-all disabled:opacity-50"
            >
              {closing ? '…' : '🔒 Fermer'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Profils Admin Panel ──────────────────────────────────────────────────────

function ProfilsAdminPanel({ portraits }: { portraits: PortraitAdmin[] }) {
  const [filterGender, setFilterGender] = useState<string>('TOUS')
  const [filterTier, setFilterTier] = useState<string>('TOUS')
  const [filterLocation, setFilterLocation] = useState<string>('TOUS')
  const [disabledIds, setDisabledIds] = useState<Set<string>>(new Set())
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const filtered = portraits.filter((p) => {
    if (filterGender !== 'TOUS' && (p.gender ?? 'HOMME') !== filterGender) return false
    if (filterTier !== 'TOUS' && p.tier !== filterTier) return false
    if (filterLocation !== 'TOUS' && (p.location ?? 'LOCAL') !== filterLocation) return false
    return true
  })

  async function handleToggleActif(p: PortraitAdmin) {
    setLoadingId(p.id)
    const nowActif = p.actif !== false && !disabledIds.has(p.id)
    await togglePortraitActif(p.id, !nowActif)
    setDisabledIds((prev) => {
      const next = new Set(prev)
      if (nowActif) next.add(p.id)
      else next.delete(p.id)
      return next
    })
    setLoadingId(null)
  }

  const tierColors: Record<string, string> = {
    PRESTIGE: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    EXCELLENCE: 'text-slate-300 border-slate-400/30 bg-slate-400/10',
    ELITE: 'text-purple-300 border-purple-400/30 bg-purple-500/10',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-xl font-serif font-light text-white">
          Portraits membres
          <span className="ml-3 text-sm text-amber-400">{portraits.length} total · {filtered.length} affichés</span>
        </h2>

        {/* Filtres */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/40"
          >
            <option value="TOUS">Genre : Tous</option>
            <option value="HOMME">Homme</option>
            <option value="FEMME">Femme</option>
          </select>

          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/40"
          >
            <option value="TOUS">Tier : Tous</option>
            <option value="PRESTIGE">Prestige</option>
            <option value="EXCELLENCE">Excellence</option>
            <option value="ELITE">Elite</option>
          </select>

          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/40"
          >
            <option value="TOUS">Localisation : Tous</option>
            <option value="DIASPORA">Diaspora</option>
            <option value="LOCAL">Local</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-white/30 border border-white/5 rounded-2xl">
          <p className="text-4xl mb-3">◈</p>
          <p>Aucun profil ne correspond aux filtres.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="text-left px-4 py-3 text-white/40 text-xs font-normal uppercase tracking-wider">Profil</th>
                <th className="text-left px-4 py-3 text-white/40 text-xs font-normal uppercase tracking-wider">Tier</th>
                <th className="text-left px-4 py-3 text-white/40 text-xs font-normal uppercase tracking-wider">Genre</th>
                <th className="text-left px-4 py-3 text-white/40 text-xs font-normal uppercase tracking-wider">Lieu</th>
                <th className="text-right px-4 py-3 text-white/40 text-xs font-normal uppercase tracking-wider">Intérêts</th>
                <th className="text-right px-4 py-3 text-white/40 text-xs font-normal uppercase tracking-wider">Vues</th>
                <th className="text-right px-4 py-3 text-white/40 text-xs font-normal uppercase tracking-wider">Statut</th>
                <th className="text-right px-4 py-3 text-white/40 text-xs font-normal uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((p) => {
                const isActif = p.actif !== false && !disabledIds.has(p.id)
                const photo = p.photo_principale_floutee ?? p.photo_url

                return (
                  <tr key={p.id} className={`hover:bg-white/[0.02] transition-colors ${!isActif ? 'opacity-40' : ''}`}>
                    {/* Profil */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full bg-white/5 flex-shrink-0 overflow-hidden flex items-center justify-center border border-white/10">
                          {photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={photo}
                              alt={p.prenom}
                              className="w-full h-full object-cover blur-[3px]"
                            />
                          ) : (
                            <span
                              className="text-sm font-semibold"
                              style={{ color: TIER_CONFIGS[p.tier]?.color ?? '#D4AF37' }}
                            >
                              {p.prenom.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-medium truncate">
                            {p.prenom}
                            {p.is_demo && (
                              <span className="ml-1.5 text-[9px] text-white/25 border border-white/10 rounded px-1">démo</span>
                            )}
                          </p>
                          <p className="text-white/40 text-xs">{p.age} ans · {p.profession.length > 25 ? p.profession.substring(0, 23) + '…' : p.profession}</p>
                        </div>
                      </div>
                    </td>

                    {/* Tier */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full border ${tierColors[p.tier] ?? ''}`}>
                        {TIER_CONFIGS[p.tier]?.emoji} {p.tier}
                      </span>
                    </td>

                    {/* Genre */}
                    <td className="px-4 py-3 text-white/60 text-xs">
                      {p.gender === 'FEMME' ? '👩 F' : '👨 H'}
                    </td>

                    {/* Localisation */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-white/50">
                        {p.location === 'DIASPORA' ? '✈️ ' : '📍 '}
                        {p.ville}
                      </span>
                    </td>

                    {/* Intérêts */}
                    <td className="px-4 py-3 text-right text-white/60 text-xs tabular-nums">
                      {p.nombre_interets ?? 0}
                    </td>

                    {/* Vues */}
                    <td className="px-4 py-3 text-right text-white/60 text-xs tabular-nums">
                      {p.nombre_vues ?? 0}
                    </td>

                    {/* Statut */}
                    <td className="px-4 py-3 text-right">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        isActif
                          ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                          : 'text-white/30 border-white/10 bg-white/5'
                      }`}>
                        {isActif ? '● Actif' : '○ Inactif'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/alliance-privee/dashboard?demo=${p.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] border border-white/15 text-white/50 rounded-lg px-2.5 py-1 hover:border-amber-500/30 hover:text-amber-400 transition-all"
                        >
                          Voir
                        </a>
                        <button
                          onClick={() => handleToggleActif(p)}
                          disabled={loadingId === p.id}
                          className={`text-[10px] border rounded-lg px-2.5 py-1 transition-all disabled:opacity-40 ${
                            isActif
                              ? 'border-red-500/20 text-red-400/70 hover:bg-red-500/10'
                              : 'border-emerald-500/20 text-emerald-400/70 hover:bg-emerald-500/10'
                          }`}
                        >
                          {loadingId === p.id ? '…' : isActif ? 'Désactiver' : 'Réactiver'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Résumé stats inline */}
      <div className="mt-5 flex flex-wrap gap-4 text-xs text-white/30">
        <span>Hommes : {portraits.filter((p) => (p.gender ?? 'HOMME') === 'HOMME').length}</span>
        <span>Femmes : {portraits.filter((p) => p.gender === 'FEMME').length}</span>
        <span>Diaspora : {portraits.filter((p) => p.location === 'DIASPORA').length}</span>
        <span>Local : {portraits.filter((p) => (p.location ?? 'LOCAL') === 'LOCAL').length}</span>
        <span>PRESTIGE : {portraits.filter((p) => p.tier === 'PRESTIGE').length}</span>
        <span>EXCELLENCE : {portraits.filter((p) => p.tier === 'EXCELLENCE').length}</span>
        <span>ELITE : {portraits.filter((p) => p.tier === 'ELITE').length}</span>
        <span>Démo : {portraits.filter((p) => p.is_demo).length}</span>
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
