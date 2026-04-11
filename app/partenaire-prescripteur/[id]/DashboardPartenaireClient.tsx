'use client'

import { useState, useEffect } from 'react'
import type { PrescripteurPartenaire } from '@/actions/codes-sessions'

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
}

export default function DashboardPartenaireClient({ partenaire, codesActifs, transactions, commissionsDues, commissionsVersees }: Props) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60000)
    return () => clearInterval(t)
  }, [])

  // Supprime l'avertissement ESLint de tick non utilisé
  void tick

  const forfaitExpire = jours(partenaire.forfait_expire_at)
  const totalCa = (partenaire.total_ca_hebergements_fcfa ?? 0) + (partenaire.total_ca_boutique_fcfa ?? 0)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'
  const qrUrl = `${appUrl}/promo/${partenaire.uid}`

  const msgWa = encodeURIComponent(`🏨 Mon QR Code L&Lui Signature\n${partenaire.nom_etablissement}\nScannez pour obtenir votre code séjour !\n→ ${qrUrl}`)

  const txList = transactions as unknown as Transaction[]

  return (
    <div className="min-h-screen bg-[#F5F0E8] px-4 py-6 max-w-lg mx-auto space-y-4">
      {/* Entête */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <p className="text-xs text-[#C9A84C] font-semibold uppercase tracking-widest mb-1">Prescripteur L&Lui Signature</p>
        <h1 className="text-xl font-serif font-bold text-[#1A1A1A]">{partenaire.nom_etablissement}</h1>
        <p className="text-sm text-[#1A1A1A]/60">{partenaire.type}{partenaire.adresse ? ` · ${partenaire.adresse}` : ''}</p>
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

      {/* Stats */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <p className="text-sm font-semibold text-[#1A1A1A] mb-3">📊 Statistiques globales</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Scans QR', val: partenaire.total_scans ?? 0 },
            { label: 'Codes générés', val: partenaire.total_codes_generes ?? 0 },
            { label: 'Utilisations', val: partenaire.total_utilisations ?? 0 },
            { label: 'Clients uniques', val: partenaire.total_clients_uniques ?? 0 },
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
            <span className="font-medium">{formatFCFA(partenaire.total_ca_hebergements_fcfa)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#1A1A1A]/60">CA Boutique</span>
            <span className="font-medium">{formatFCFA(partenaire.total_ca_boutique_fcfa)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold border-t border-[#F5F0E8] pt-1.5">
            <span>CA Total</span>
            <span className="text-[#C9A84C]">{formatFCFA(totalCa)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#1A1A1A]/60">Commissions dues</span>
            <span className="font-medium text-amber-600">{formatFCFA(commissionsDues)} ⏳</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#1A1A1A]/60">Versées</span>
            <span className="font-medium text-green-600">{formatFCFA(commissionsVersees)} ✅</span>
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

      {/* Codes actifs */}
      {codesActifs.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-[#1A1A1A] mb-3">📋 Codes actifs en ce moment</p>
          <div className="space-y-2">
            {codesActifs.map((c) => {
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
      )}

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
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${t.statut === 'versee' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {t.statut === 'versee'
                      ? `✅ Versée ${t.versee_at ? formatLocalDate(t.versee_at) : ''}`
                      : '⏳ En attente'}
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
    </div>
  )
}
