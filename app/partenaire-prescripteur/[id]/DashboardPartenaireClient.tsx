'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { updateVitrine, actualiserStatsPartenaire } from '@/actions/codes-sessions'
import type { PrescripteurPartenaire } from '@/actions/codes-sessions'
import type { ParametresPlateforme } from '@/actions/parametres'
import StarTerminal from '@/components/StarTerminal'

function formatFCFA(n: number | undefined | null) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n ?? 0)) + ' FCFA'
}

function safeDate(val: unknown): Date | null {
  if (!val) return null
  if (typeof val === 'string') {
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : d
  }
  // Firestore Timestamp object
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    try { return (val as { toDate: () => Date }).toDate() } catch { return null }
  }
  return null
}

function countdown(expireAt: unknown): string {
  const d = safeDate(expireAt)
  if (!d) return '—'
  const ms = Math.max(0, d.getTime() - Date.now())
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return `${h}h ${String(m).padStart(2, '0')}min`
}

function jours(expireAt: unknown): number {
  const d = safeDate(expireAt)
  if (!d) return 0
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000))
}

function formatLocalDate(val: unknown): string {
  const d = safeDate(val)
  if (!d) return '—'
  return d.toLocaleDateString('fr-FR')
}

interface Transaction {
  id: string
  code?: string
  canal?: string
  montant_transaction_fcfa?: number
  commission_fcfa?: number
  statut?: string
  created_at?: unknown
  versee_at?: unknown
}

interface Props {
  partenaire: PrescripteurPartenaire
  codesActifs: Record<string, unknown>[]
  transactions: Record<string, unknown>[]
  commissionsDues: number
  commissionsVersees: number
  ventesEnCours?: number
  plateformeParams: ParametresPlateforme
  starsStats?: {
    totalCaStars: number
    soldeProvision: number
    clientsCount: number
  }
}

export default function DashboardPartenaireClient({ partenaire, codesActifs, transactions, commissionsDues, commissionsVersees, ventesEnCours = 0, plateformeParams, starsStats }: Props) {
  const [tick, setTick] = useState(0)
  const [activeTab, setActiveTab] = useState<'stats' | 'vitrine' | 'forfait' | 'stars'>('stats')
  const [refreshing, setRefreshing] = useState(false)
  const [localStats, setLocalStats] = useState({
    total_ca_boutique_fcfa: partenaire.total_ca_boutique_fcfa ?? 0,
    total_ca_hebergements_fcfa: partenaire.total_ca_hebergements_fcfa ?? 0,
    total_utilisations: partenaire.total_utilisations ?? 0,
    total_clients_uniques: partenaire.total_clients_uniques ?? 0,
    total_commissions_fcfa: partenaire.total_commissions_fcfa ?? 0,
  })

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60000)
    return () => clearInterval(t)
  }, [])
  void tick

  const forfaitExpire = jours(partenaire.forfait_expire_at)
  const totalCa = localStats.total_ca_hebergements_fcfa + localStats.total_ca_boutique_fcfa
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'
  const qrUrl = `${appUrl}/promo/${partenaire.uid}`
  const msgWa = encodeURIComponent(`🏨 Mon QR Code L&Lui Signature\n${partenaire.nom_etablissement}\nScannez pour obtenir votre code séjour !\n→ ${qrUrl}`)
  const txList = transactions as unknown as Transaction[]

  async function handleActualiserStats() {
    setRefreshing(true)
    console.log('[dashboard] actualiserStats →', partenaire.uid)
    try {
      const res = await actualiserStatsPartenaire(partenaire.uid)
      if (res.success && res.stats) {
        setLocalStats({
          total_ca_boutique_fcfa: res.stats.total_ca_boutique_fcfa ?? 0,
          total_ca_hebergements_fcfa: res.stats.total_ca_hebergements_fcfa ?? 0,
          total_utilisations: res.stats.total_utilisations ?? 0,
          total_clients_uniques: res.stats.total_clients_uniques ?? 0,
          total_commissions_fcfa: res.stats.total_commissions_fcfa ?? 0,
        })
        toast.success('Statistiques mises à jour ✅')
        console.log('[dashboard] stats updated:', res.stats)
      } else {
        toast.error(res.error ?? 'Erreur lors de la mise à jour')
        console.error('[dashboard] actualiserStats error:', res.error)
      }
    } catch (e) {
      toast.error('Erreur réseau')
      console.error('[dashboard] actualiserStats exception:', e)
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] px-4 py-6 max-w-lg mx-auto space-y-4">
      {/* Entête */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          {/* Photo / avatar partenaire */}
          <div className="flex-shrink-0 w-14 h-14 rounded-2xl overflow-hidden bg-[#F5F0E8] flex items-center justify-center">
            {partenaire.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={partenaire.photoUrl}
                alt={partenaire.nom_etablissement}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <span className="text-2xl">🏨</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#C9A84C] font-semibold uppercase tracking-widest mb-0.5">Prescripteur L&Lui Signature</p>
            <h1 className="text-xl font-serif font-bold text-[#1A1A1A] truncate">{partenaire.nom_etablissement}</h1>
            <p className="text-sm text-[#1A1A1A]/60 truncate">{partenaire.type}{partenaire.adresse ? ` · ${partenaire.adresse}` : ''}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
            partenaire.forfait_statut === 'actif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
          }`}>
            {partenaire.forfait_statut === 'actif' ? '✅ Forfait actif' : '🔴 Forfait expiré'}
          </span>
          {partenaire.forfait_expire_at && (
            <span className="text-xs text-[#1A1A1A]/50">
              expire {formatLocalDate(partenaire.forfait_expire_at)} · dans {forfaitExpire} jours
            </span>
          )}
        </div>
      </div>

      {/* Navigation onglets */}
      <div className="flex gap-1 bg-white rounded-2xl p-1.5 shadow-sm overflow-x-auto">
        {([['stats', '📊 Stats'], ['stars', '⭐ Stars'], ['vitrine', '🖼️ Vitrine'], ['forfait', '🔑 Forfait']] as const).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 min-w-[72px] py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'bg-[#C9A84C] text-white'
                : 'text-[#1A1A1A]/60 hover:text-[#1A1A1A]'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ─── Onglet Vitrine ─────────────────────────────────── */}
      {activeTab === 'vitrine' && (
        <VitrineTab partenaire={partenaire} params={plateformeParams} />
      )}

      {/* ─── Onglet Forfait ──────────────────────────────────── */}
      {activeTab === 'forfait' && (
        <ForfaitTab partenaire={partenaire} params={plateformeParams} />
      )}

      {/* ─── Onglet Stars ───────────────────────────────────── */}
      {activeTab === 'stars' && (() => {
        const now = Date.now()
        const firstCode = codesActifs.find((c) => {
          const d = safeDate(c.expire_at)
          return d !== null && d.getTime() > now
        })
        const codeSession = firstCode ? (firstCode.code as string) : null
        const soldeProvision = starsStats?.soldeProvision ?? partenaire.solde_provision ?? 0

        return (
          <div className="space-y-4">

            {/* Stats Stars */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="text-sm font-semibold text-[#1A1A1A] mb-3">⭐ Programme L&Lui Stars</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#F5F0E8]/60 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-[#C9A84C]">{starsStats?.clientsCount ?? 0}</p>
                  <p className="text-xs text-[#1A1A1A]/60 mt-0.5">Clients fidélisés</p>
                </div>
                <div className="bg-[#F5F0E8]/60 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-[#C9A84C]">{formatFCFA(starsStats?.totalCaStars ?? partenaire.total_ca_stars_fcfa ?? 0)}</p>
                  <p className="text-xs text-[#1A1A1A]/60 mt-0.5">CA Stars total</p>
                </div>
              </div>
              <div className="mt-3 flex justify-between text-sm">
                <span className="text-[#1A1A1A]/60">Provision disponible</span>
                <span className={`font-bold ${soldeProvision > 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatFCFA(soldeProvision)}
                </span>
              </div>
            </div>

            {/* Terminal d'encaissement */}
            {codeSession ? (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">💳</span>
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A]">Encaisser une transaction Stars</p>
                    <p className="text-xs text-[#1A1A1A]/50">Code actif : {codeSession.slice(0, 3)} {codeSession.slice(3)}</p>
                  </div>
                </div>
                <StarTerminal
                  codeSession={codeSession}
                  partnerId={partenaire.uid}
                  soldeProvision={soldeProvision}
                  params={plateformeParams}
                />
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
                <p className="text-2xl mb-2">⚠️</p>
                <p className="text-sm font-semibold text-[#1A1A1A]">Aucun code actif</p>
                <p className="text-xs text-[#1A1A1A]/50 mt-1">Générez un code depuis votre QR code pour encaisser des Stars.</p>
              </div>
            )}

          </div>
        )
      })()}

      {/* ─── Onglet Stats ────────────────────────────────────── */}
      {activeTab === 'stats' && <>

      {/* Bouton Actualiser */}
      <button
        onClick={handleActualiserStats}
        disabled={refreshing}
        className="w-full py-2.5 bg-white text-[#C9A84C] border border-[#C9A84C]/30 text-sm font-semibold rounded-2xl shadow-sm disabled:opacity-50 hover:bg-[#F5F0E8] transition-colors flex items-center justify-center gap-2"
      >
        {refreshing ? (
          <><span className="animate-spin inline-block w-4 h-4 border-2 border-[#C9A84C] border-t-transparent rounded-full" /> Actualisation…</>
        ) : (
          '🔄 Actualiser mes statistiques'
        )}
      </button>

      {/* Stats */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <p className="text-sm font-semibold text-[#1A1A1A] mb-3">📊 Statistiques globales</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Scans QR', val: partenaire.total_scans ?? 0 },
            { label: 'Codes générés', val: partenaire.total_codes_generes ?? 0 },
            { label: 'Utilisations', val: localStats.total_utilisations },
            { label: 'Clients uniques', val: localStats.total_clients_uniques },
          ].map(({ label, val }) => (
            <div key={label} className="bg-[#F5F0E8]/60 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-[#C9A84C]">{val}</p>
              <p className="text-xs text-[#1A1A1A]/60 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-[#1A1A1A]/60">CA Hébergements</span>
            <span className="font-medium">{formatFCFA(localStats.total_ca_hebergements_fcfa)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#1A1A1A]/60">CA Boutique</span>
            <span className="font-medium">{formatFCFA(localStats.total_ca_boutique_fcfa)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold border-t border-[#F5F0E8] pt-1.5">
            <span>CA Total</span>
            <span className="text-[#C9A84C]">{formatFCFA(totalCa)}</span>
          </div>
          {ventesEnCours > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-[#1A1A1A]/60">Ventes en cours</span>
              <span className="font-medium text-[#1A1A1A]/50">{formatFCFA(ventesEnCours)} ⏳</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-[#1A1A1A]/60">Commissions dues</span>
            <span className="font-medium text-[#C9A84C]">{formatFCFA(commissionsDues)} ✅</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#1A1A1A]/60">Versées</span>
            <span className="font-medium text-green-600">{formatFCFA(commissionsVersees)} 💰</span>
          </div>
        </div>
      </div>

      {/* QR Code */}
      <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
        <p className="text-sm font-semibold text-[#1A1A1A] mb-3">📱 Mon QR Code</p>
        <div className="bg-[#F5F0E8] rounded-xl p-4 mb-3 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}&bgcolor=FFFFFF&color=1A1A1A&margin=10`}
            alt="QR Code prescripteur"
            width={200}
            height={200}
            className="rounded-lg"
          />
        </div>
        <div className="flex gap-2 justify-center">
          <a href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrUrl)}&bgcolor=FFFFFF&color=1A1A1A&margin=10`}
            download="qr-llui.png"
            className="flex-1 py-2 bg-[#F5F0E8] text-[#1A1A1A] text-xs font-medium rounded-xl text-center">
            ⬇️ PNG
          </a>
          <a href={`https://wa.me/?text=${msgWa}`} target="_blank" rel="noreferrer"
            className="flex-1 py-2 bg-green-500 text-white text-xs font-medium rounded-xl text-center">
            📤 WhatsApp
          </a>
        </div>
      </div>

      {/* Codes actifs — filtrés : expire_at > maintenant */}
      {(() => {
        const now = Date.now()
        const codesValides = codesActifs.filter((c) => {
          const d = safeDate(c.expire_at)
          return d !== null && d.getTime() > now
        })
        if (codesValides.length === 0) return null
        return (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-sm font-semibold text-[#1A1A1A] mb-3">📋 Codes actifs en ce moment</p>
            <div className="space-y-2">
              {codesValides.map((c) => {
                const code = (c.code as string) ?? '——'
                const nb = (c.nb_utilisations as number) ?? 0
                const max = (c.max_utilisations as number) ?? 5
                const exp = c.expire_at
                return (
                  <div key={code} className="flex items-center justify-between bg-[#F5F0E8]/60 rounded-xl px-4 py-3">
                    <div>
                      <p className="font-mono font-bold text-[#C9A84C] text-lg tracking-widest">
                        {code.length >= 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code}
                      </p>
                      <p className="text-xs text-[#1A1A1A]/50">⏱ Expire dans {countdown(exp)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#1A1A1A]">{nb}/{max}</p>
                      <p className="text-xs text-[#1A1A1A]/50">utilisations</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Transactions */}
      {txList.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-[#1A1A1A] mb-3">💰 Dernières transactions</p>
          <div className="space-y-2">
            {txList.slice(0, 10).map((t) => (
              <div key={t.id} className="bg-[#F5F0E8]/40 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-xs font-mono text-[#1A1A1A]/60">
                    {t.code ? `Code ${t.code}` : '—'} — {t.canal === 'hebergement' ? 'Hébergement' : 'Boutique'}
                  </p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    t.statut === 'versee'
                      ? 'bg-green-100 text-green-700'
                      : t.statut === 'en_attente'
                        ? 'bg-[#F5F0E8] text-[#8B6914]'
                        : 'bg-gray-100 text-gray-500'
                  }`}>
                    {t.statut === 'versee'
                      ? `💰 Versée ${t.versee_at ? formatLocalDate(t.versee_at) : ''}`
                      : t.statut === 'en_attente'
                        ? '✅ Commission validée'
                        : '⏳ Vente en cours'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#1A1A1A]/70">{formatFCFA(t.montant_transaction_fcfa)}</span>
                  <span className="font-semibold text-[#C9A84C]">Com. {formatFCFA(t.commission_fcfa)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      </> /* fin onglet stats */}
    </div>
  )
}

// ─── Composant Forfait Tab ────────────────────────────────────

function ForfaitTab({ partenaire, params }: { partenaire: PrescripteurPartenaire; params: ParametresPlateforme }) {
  const isPremium = partenaire.subscriptionLevel === 'premium'
  const forfaitJours = jours(partenaire.forfait_expire_at)
  const forfaitActif = partenaire.forfait_statut === 'actif'
  const expiresSoon = forfaitActif && forfaitJours <= 30

  const forfaitMensuel = params.forfait_prescripteur_mensuel_fcfa ?? 25000
  const forfaitAnnuel = params.forfait_prescripteur_annuel_fcfa ?? 250000
  const premiumMensuel = params.premium_prix_mensuel_fcfa ?? 10000
  const premiumAnnuel = params.premium_prix_annuel_fcfa ?? 100000
  const nbImages = params.premium_nb_images ?? 5
  const premiumExpireAt = partenaire.premium_expire_at
  const premiumJours = premiumExpireAt ? jours(premiumExpireAt) : 0

  const msgRenew = encodeURIComponent(
    `Bonjour Olivier, je souhaite renouveler mon forfait L&Lui Signature pour ${partenaire.nom_etablissement}. Mon ID partenaire : ${partenaire.uid}`
  )
  const msgUpgrade = encodeURIComponent(
    `Bonjour Olivier, je souhaite passer en abonnement Premium pour ma vitrine L&Lui (${partenaire.nom_etablissement}). Mon ID : ${partenaire.uid}`
  )

  return (
    <div className="space-y-4">

      {/* Statut forfait */}
      <div className={`rounded-2xl p-5 shadow-sm ${
        forfaitActif && !expiresSoon
          ? 'bg-white'
          : expiresSoon
            ? 'bg-amber-50 border border-amber-200'
            : 'bg-red-50 border border-red-200'
      }`}>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#C9A84C] mb-1">Mon forfait</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xl font-serif font-bold text-[#1A1A1A]">
              {forfaitActif ? '✅ Actif' : '🔴 Expiré'}
            </p>
            <p className="text-sm text-[#1A1A1A]/60 mt-0.5 capitalize">
              Forfait {partenaire.forfait_type ?? 'annuel'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-[#C9A84C]">{forfaitActif ? forfaitJours : 0}</p>
            <p className="text-xs text-[#1A1A1A]/50">jours restants</p>
          </div>
        </div>
        <div className="mt-3 space-y-1">
          {partenaire.forfait_debut && (
            <div className="flex justify-between text-xs text-[#1A1A1A]/60">
              <span>Début</span>
              <span>{formatLocalDate(partenaire.forfait_debut)}</span>
            </div>
          )}
          {partenaire.forfait_expire_at && (
            <div className="flex justify-between text-xs text-[#1A1A1A]/60">
              <span>Expiration</span>
              <span className={expiresSoon ? 'text-amber-600 font-semibold' : ''}>
                {formatLocalDate(partenaire.forfait_expire_at)}
                {expiresSoon && ' ⚠️'}
              </span>
            </div>
          )}
          {partenaire.forfait_montant_fcfa !== undefined && (
            <div className="flex justify-between text-xs text-[#1A1A1A]/60">
              <span>Montant</span>
              <span>{formatFCFA(partenaire.forfait_montant_fcfa)}</span>
            </div>
          )}
        </div>
        {expiresSoon && (
          <p className="mt-2 text-xs text-amber-700 bg-amber-100 rounded-lg px-3 py-1.5">
            Votre forfait expire dans moins de 30 jours. Renouvelez pour continuer à utiliser vos QR codes.
          </p>
        )}
        {!forfaitActif && (
          <p className="mt-2 text-xs text-red-700 bg-red-100 rounded-lg px-3 py-1.5">
            Votre forfait est expiré. Contactez Olivier pour le renouveler et réactiver votre QR code.
          </p>
        )}
      </div>

      {/* Renouveler */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <p className="text-sm font-semibold text-[#1A1A1A] mb-1">🔄 Renouveler mon forfait</p>
        <p className="text-xs text-[#1A1A1A]/50 mb-3">
          Accès complet QR code, dashboard et commissions boutique
        </p>
        <div className="flex gap-2 mb-3">
          <div className="flex-1 bg-[#F5F0E8] rounded-xl p-3 text-center">
            <p className="text-base font-bold text-[#C9A84C]">{formatFCFA(forfaitMensuel)}</p>
            <p className="text-[10px] text-[#1A1A1A]/50 mt-0.5">/ mois</p>
          </div>
          <div className="flex-1 bg-[#C9A84C]/10 rounded-xl p-3 text-center border border-[#C9A84C]/30">
            <p className="text-base font-bold text-[#C9A84C]">{formatFCFA(forfaitAnnuel)}</p>
            <p className="text-[10px] text-[#1A1A1A]/50 mt-0.5">/ an — économisez 2 mois</p>
          </div>
        </div>
        <a
          href={`https://wa.me/237693407964?text=${msgRenew}`}
          target="_blank" rel="noreferrer"
          className="block text-center py-2.5 bg-[#C9A84C] text-white text-sm font-bold rounded-xl hover:bg-[#b8963e] transition-colors"
        >
          Contacter Olivier pour renouveler →
        </a>
      </div>

      {/* Niveau vitrine */}
      <div className={`rounded-2xl p-5 shadow-sm ${isPremium ? 'bg-gradient-to-br from-[#C9A84C] to-[#8B6914]' : 'bg-white'}`}>
        <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${isPremium ? 'text-white/70' : 'text-[#C9A84C]'}`}>
          Niveau vitrine
        </p>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-xl font-serif font-bold ${isPremium ? 'text-white' : 'text-[#1A1A1A]'}`}>
              {isPremium ? '⭐ Premium' : '🔓 Free'}
            </p>
            <p className={`text-xs mt-1 ${isPremium ? 'text-white/80' : 'text-[#1A1A1A]/50'}`}>
              {isPremium
                ? `${nbImages} visuels publicitaires · Carrousel · Pleine visibilité`
                : 'Image enseigne uniquement'}
            </p>
          </div>
          {isPremium && <span className="text-3xl">🏆</span>}
        </div>
        {isPremium && premiumExpireAt && (
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs text-white/70">
              <span>Abonnement Premium valide jusqu&apos;au</span>
              <span className="font-semibold text-white">{formatLocalDate(premiumExpireAt)}</span>
            </div>
            <div className="flex justify-between text-xs text-white/70">
              <span>Jours restants</span>
              <span className={`font-semibold ${premiumJours <= 30 ? 'text-yellow-200' : 'text-white'}`}>
                {premiumJours} jours{premiumJours <= 30 ? ' ⚠️' : ''}
              </span>
            </div>
          </div>
        )}
        {!isPremium && (
          <div className="mt-4">
            <div className="flex gap-2 mb-3">
              <div className="flex-1 bg-[#F5F0E8] rounded-xl p-2.5 text-center">
                <p className="text-sm font-bold text-[#C9A84C]">{formatFCFA(premiumMensuel)}</p>
                <p className="text-[10px] text-[#1A1A1A]/50 mt-0.5">/ mois</p>
              </div>
              <div className="flex-1 bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-xl p-2.5 text-center">
                <p className="text-sm font-bold text-[#C9A84C]">{formatFCFA(premiumAnnuel)}</p>
                <p className="text-[10px] text-[#1A1A1A]/50 mt-0.5">/ an</p>
              </div>
            </div>
            <ul className="space-y-1 mb-3">
              {[
                `${nbImages} visuels publicitaires en carrousel`,
                'Plats du jour, promos, événements',
                'Visible par tous vos clients L&Lui',
              ].map((item) => (
                <li key={item} className="text-xs text-[#1A1A1A]/60 flex items-start gap-2">
                  <span className="text-[#C9A84C]">✓</span> {item}
                </li>
              ))}
            </ul>
            <a
              href={`https://wa.me/237693407964?text=${msgUpgrade}`}
              target="_blank" rel="noreferrer"
              className="block text-center py-2.5 bg-[#1A1A1A] text-white text-sm font-bold rounded-xl hover:bg-[#333] transition-colors"
            >
              Passer en Premium →
            </a>
          </div>
        )}
      </div>

    </div>
  )
}

// ─── Composant Vitrine Tab ────────────────────────────────────

const INTERVAL_PRESETS = [3, 5, 6, 8, 10, 15]

function VitrineTab({ partenaire, params }: { partenaire: PrescripteurPartenaire; params: ParametresPlateforme }) {
  const isPremium = partenaire.subscriptionLevel === 'premium'
  const nbImages = params.premium_nb_images ?? 5
  const premiumMensuel = params.premium_prix_mensuel_fcfa ?? 10000
  const premiumAnnuel = params.premium_prix_annuel_fcfa ?? 100000
  const [defaultImage, setDefaultImage] = useState(partenaire.defaultImage ?? '')
  const [slots, setSlots] = useState<string[]>(() => {
    const imgs = partenaire.carouselImages ?? []
    return [...imgs, ...Array(nbImages).fill('')].slice(0, nbImages)
  })
  const [intervalSec, setIntervalSec] = useState<number>(partenaire.carousel_interval_sec ?? 6)
  const [saving, setSaving] = useState(false)
  const [carouselIdx, setCarouselIdx] = useState(0)

  // Images à afficher dans l'aperçu
  const previewImages = isPremium
    ? slots.filter((s) => s.trim() !== '')
    : defaultImage ? [defaultImage] : []

  async function handleSave() {
    setSaving(true)
    const res = await updateVitrine(partenaire.uid, {
      defaultImage,
      carouselImages: isPremium ? slots : undefined,
      carousel_interval_sec: isPremium ? intervalSec : undefined,
    })
    setSaving(false)
    if (res.success) toast.success('Vitrine mise à jour ✅')
    else toast.error(res.error ?? 'Erreur')
  }

  return (
    <div className="space-y-4">

      {/* Badge abonnement */}
      <div className={`rounded-2xl p-5 shadow-sm ${isPremium ? 'bg-gradient-to-br from-[#C9A84C] to-[#8B6914]' : 'bg-white'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${isPremium ? 'text-white/70' : 'text-[#C9A84C]'}`}>
              Mon abonnement
            </p>
            <p className={`text-xl font-serif font-bold ${isPremium ? 'text-white' : 'text-[#1A1A1A]'}`}>
              {isPremium ? '⭐ Premium' : '🔓 Free'}
            </p>
            <p className={`text-xs mt-1 ${isPremium ? 'text-white/80' : 'text-[#1A1A1A]/50'}`}>
              {isPremium
                ? `${nbImages} visuels publicitaires · Transitions fluides · Pleine visibilité`
                : 'Image enseigne uniquement · Passez Premium pour diffuser vos pubs'}
            </p>
          </div>
          {!isPremium && (
            <div className="text-right">
              <p className="text-xs text-[#C9A84C] font-semibold">Contactez Olivier</p>
              <a href="https://wa.me/237693407964" target="_blank" rel="noreferrer"
                className="mt-1 inline-block px-3 py-1.5 bg-[#C9A84C] text-white text-xs font-bold rounded-xl">
                Passer Premium →
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Aperçu Carrousel */}
      {previewImages.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <p className="text-xs font-semibold text-[#1A1A1A]/60 px-5 pt-4 mb-3">Aperçu carrousel</p>
          <div className="relative aspect-video bg-[#F5F0E8] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImages[carouselIdx] || ''}
              alt="Aperçu"
              className="w-full h-full object-cover transition-all duration-500"
              onError={(e) => { (e.target as HTMLImageElement).src = '' }}
            />
            {previewImages.length > 1 && (
              <>
                <button onClick={() => setCarouselIdx((i) => (i - 1 + previewImages.length) % previewImages.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 text-white rounded-full text-sm flex items-center justify-center">
                  ‹
                </button>
                <button onClick={() => setCarouselIdx((i) => (i + 1) % previewImages.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 text-white rounded-full text-sm flex items-center justify-center">
                  ›
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {previewImages.map((_, i) => (
                    <button key={i} onClick={() => setCarouselIdx(i)}
                      className={`w-2 h-2 rounded-full transition-all ${i === carouselIdx ? 'bg-white scale-125' : 'bg-white/50'}`} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Image enseigne (tous niveaux) */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <p className="text-sm font-semibold text-[#1A1A1A] mb-1">🏪 Image de l&apos;enseigne</p>
        <p className="text-xs text-[#1A1A1A]/50 mb-3">Affichée en mode Free et comme image de secours en Premium</p>
        <input
          type="url"
          value={defaultImage}
          onChange={(e) => setDefaultImage(e.target.value)}
          placeholder="https://... (URL de votre logo ou photo d'enseigne)"
          className="w-full border border-[#F5F0E8] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]"
        />
        {defaultImage && (
          <div className="mt-2 h-24 bg-[#F5F0E8] rounded-xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={defaultImage} alt="Enseigne" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* Slots Premium */}
      {isPremium && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-[#1A1A1A] mb-1">🖼️ Mes visuels publicitaires</p>
          <p className="text-xs text-[#1A1A1A]/50 mb-4">{nbImages} emplacement{nbImages > 1 ? 's' : ''} · Plats du jour, promotions, événements</p>
          <div className="space-y-3">
            {slots.map((url, i) => (
              <div key={i} className="flex gap-2 items-center">
                <div className={`w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-colors ${url ? 'border-[#C9A84C]' : 'border-dashed border-[#F5F0E8]'} bg-[#F5F0E8]`}>
                  {url
                    ? /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={url} alt={`Slot ${i + 1}`} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-[#C9A84C]/40 text-xl">+</div>
                  }
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-[#1A1A1A]/40 mb-1">Image {i + 1}</p>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => {
                      const next = [...slots]
                      next[i] = e.target.value
                      setSlots(next)
                      if (e.target.value) setCarouselIdx(i)
                    }}
                    placeholder="https://... URL de l'image"
                    className="w-full border border-[#F5F0E8] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#C9A84C]"
                  />
                </div>
                {url && (
                  <button onClick={() => { const n = [...slots]; n[i] = ''; setSlots(n) }}
                    className="text-red-400 hover:text-red-600 text-lg flex-shrink-0">
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ⏱ Durée d'affichage carrousel — Premium uniquement */}
      {isPremium && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">⏱</span>
            <p className="text-sm font-semibold text-[#1A1A1A]">Durée d&apos;affichage par image</p>
          </div>
          <p className="text-xs text-[#1A1A1A]/50 mb-4">
            Chaque image reste visible {intervalSec} seconde{intervalSec > 1 ? 's' : ''} avant de passer à la suivante.
          </p>
          {/* Boutons de présélection */}
          <div className="flex flex-wrap gap-2 mb-4">
            {INTERVAL_PRESETS.map((s) => (
              <button
                key={s}
                onClick={() => setIntervalSec(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  intervalSec === s
                    ? 'bg-[#C9A84C] text-white shadow-sm'
                    : 'bg-[#F5F0E8] text-[#1A1A1A]/60 hover:bg-[#C9A84C]/20 hover:text-[#C9A84C]'
                }`}>
                {s}s
              </button>
            ))}
          </div>
          {/* Slider */}
          <div className="space-y-2">
            <input
              type="range"
              min={3} max={30} step={1}
              value={intervalSec}
              onChange={(e) => setIntervalSec(Number(e.target.value))}
              className="w-full accent-[#C9A84C]"
            />
            <div className="flex justify-between text-[10px] text-[#1A1A1A]/40">
              <span>3s (rapide)</span>
              <span className="font-bold text-[#C9A84C] text-xs">{intervalSec}s</span>
              <span>30s (lent)</span>
            </div>
          </div>
        </div>
      )}

      {/* Message promo Free */}
      {!isPremium && (
        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#333] rounded-2xl p-5 shadow-sm">
          <p className="text-white font-serif font-bold text-base mb-2">⭐ Passez Premium</p>
          <div className="flex gap-2 mb-3">
            <div className="flex-1 bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-sm font-bold text-[#C9A84C]">{formatFCFA(premiumMensuel)}</p>
              <p className="text-[10px] text-white/50 mt-0.5">/ mois</p>
            </div>
            <div className="flex-1 bg-[#C9A84C]/20 border border-[#C9A84C]/40 rounded-xl p-2.5 text-center">
              <p className="text-sm font-bold text-[#C9A84C]">{formatFCFA(premiumAnnuel)}</p>
              <p className="text-[10px] text-white/50 mt-0.5">/ an</p>
            </div>
          </div>
          <ul className="space-y-1.5 mb-4">
            {[
              `${nbImages} visuels publicitaires dans le carrousel`,
              'Transitions fluides et indicateurs de navigation',
              'Plats du jour, promos, événements en temps réel',
              'Visible par tous vos clients L&Lui',
            ].map((item) => (
              <li key={item} className="text-xs text-white/70 flex items-start gap-2">
                <span className="text-[#C9A84C] mt-0.5">✓</span> {item}
              </li>
            ))}
          </ul>
          <a href={`https://wa.me/237693407964?text=${encodeURIComponent(`Bonjour Olivier, je souhaite passer en abonnement Premium pour ma vitrine L&Lui (${partenaire.nom_etablissement}). Mon ID : ${partenaire.uid}`)}`}
            target="_blank" rel="noreferrer"
            className="block text-center py-2.5 bg-[#C9A84C] text-white text-sm font-bold rounded-xl hover:bg-[#b8963e] transition-colors">
            Contacter Olivier sur WhatsApp →
          </a>
        </div>
      )}

      {/* Bouton enregistrer */}
      <button onClick={handleSave} disabled={saving}
        className="w-full py-3 bg-[#C9A84C] text-white font-bold rounded-2xl disabled:opacity-60 hover:bg-[#b8963e] transition-colors shadow-sm">
        {saving ? 'Enregistrement...' : '💾 Enregistrer ma vitrine'}
      </button>
    </div>
  )
}
