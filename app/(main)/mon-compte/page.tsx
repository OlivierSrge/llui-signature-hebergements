export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { db } from '@/lib/firebase'
import Link from 'next/link'
import { ExternalLink, Star, ShoppingBag, Home, Calendar, Gift } from 'lucide-react'
import type { LoyaltyClient } from '@/lib/types'
import { NIVEAUX, NIVEAUX_ORDER, getProgressToNextLevel } from '@/lib/loyalty'
import { formatDate } from '@/lib/utils'
import MonCompteCopyButton from '@/components/MonCompteCopyButton'
import MonCompteMemberCard from '@/components/MonCompteMemberCard'
import MonCompteAuth from '@/components/MonCompteAuth'
import { LogoutButton, ChangePinForm } from '@/components/MonCompteActions'

async function getClientFromSession(): Promise<LoyaltyClient | null> {
  const jar = await cookies()
  const clientId = jar.get('client_session')?.value
  if (!clientId) return null
  const doc = await db.collection('clients').doc(clientId).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as LoyaltyClient
}

export const metadata = { title: 'Mon compte — L&Lui Stars' }

export default async function MonComptePage() {
  const client = await getClientFromSession()
  return (
    <div className="pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 text-center">
          <p className="text-gold-600 text-sm font-medium tracking-widest uppercase mb-1">Programme fidélité</p>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-dark">L&Lui Stars ✨</h1>
          {!client && (
            <p className="text-dark/50 mt-2 text-sm max-w-md mx-auto">
              Connectez-vous avec votre email et votre code PIN pour accéder à vos avantages fidélité.
            </p>
          )}
          <div className="gold-divider mt-3" />
        </div>
        {!client && (
          <>
            <MonCompteAuth />
            <NiveauxPresentation />
          </>
        )}
        {client && <ClientProfile client={client} />}
      </div>
    </div>
  )
}

function ClientProfile({ client }: { client: LoyaltyClient }) {
  const niveau = NIVEAUX[client.niveau || 'novice']
  const { next, progressPercent, sejoursToNext } = getProgressToNextLevel(client.totalSejours)
  const hasPermanentPin = !!client.accessPinPermanent

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-6 border" style={{ background: niveau.bgColor, borderColor: niveau.borderColor }}>
        <div className="flex justify-end gap-2 mb-4">
          <ChangePinForm hasPermanentPin={hasPermanentPin} />
          <LogoutButton />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0" style={{ background: `${niveau.color}20`, color: niveau.color }}>
            {client.firstName?.[0]}{client.lastName?.[0]}
          </div>
          <div className="flex-1">
            <h2 className="font-serif text-xl font-semibold text-dark">{client.firstName} {client.lastName}</h2>
            <p className="text-sm font-semibold" style={{ color: niveau.color }}>{niveau.emoji} Niveau {niveau.label}</p>
            <p className="text-xs text-dark/40">Code membre : {client.memberCode}</p>
          </div>
          <MonCompteMemberCard client={client} />
        </div>
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white/70 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-dark">{client.totalSejours}</p>
            <p className="text-xs text-dark/50">Séjours</p>
          </div>
          <div className="bg-white/70 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-dark">{client.totalPoints || 0}</p>
            <p className="text-xs text-dark/50">Points</p>
          </div>
          <div className="bg-white/70 rounded-xl p-3 text-center">
            <p className="text-xl font-bold" style={{ color: niveau.color }}>{client.boutiqueDiscount}%</p>
            <p className="text-xs text-dark/50">Boutique</p>
          </div>
        </div>
        {next && (
          <div>
            <div className="flex items-center justify-between text-xs text-dark/60 mb-1.5">
              <span className="font-medium">{niveau.label}</span>
              <span>{sejoursToNext} séjour{(sejoursToNext ?? 0) > 1 ? 's' : ''} pour atteindre {next.label}</span>
            </div>
            <div className="w-full h-3 bg-white/60 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${progressPercent}%`, background: niveau.color }} />
            </div>
            <p className="text-xs text-dark/40 mt-1">Progression : {progressPercent}%</p>
            <div className="mt-3 bg-white/50 rounded-xl p-3">
              <p className="text-xs font-semibold text-dark/70 mb-2">Niveau {next.label} {next.emoji} — À débloquer :</p>
              <ul className="space-y-1">
                {[...next.benefits.hebergements.slice(0, 2), ...next.benefits.boutique.slice(0, 1)].map((b) => (
                  <li key={b} className="text-xs text-dark/60 flex items-start gap-1.5">
                    <span className="text-gold-500 flex-shrink-0 mt-0.5">→</span> {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {!next && (
          <div className="mt-3 bg-white/50 rounded-xl p-3 text-center">
            <p className="text-sm font-semibold" style={{ color: niveau.color }}>Vous avez atteint le niveau maximum 👑</p>
            <p className="text-xs text-dark/50 mt-1">Tous les avantages L&Lui Stars sont débloqués</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-beige-200 p-6">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingBag size={16} className="text-green-600" />
          <h3 className="font-semibold text-dark">Votre code promo boutique</h3>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex-1">
            <p className="font-mono text-2xl font-bold text-dark tracking-widest">{client.boutiquePromoCode}</p>
            <p className="text-xs text-dark/50 mt-1">
              Valable sur{' '}
              <a href="https://letlui-signature.netlify.app" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline font-medium">
                letlui-signature.netlify.app <ExternalLink size={10} className="inline" />
              </a>
            </p>
            <p className="text-xs text-dark/40 mt-0.5">Réduction boutique : {niveau.boutiqueDiscount}% sur tous les articles</p>
          </div>
          <MonCompteCopyButton text={client.boutiquePromoCode} />
        </div>
        {(client.boutiqueAchats || []).length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-dark/50 mb-2">Historique achats boutique</p>
            <div className="space-y-2">
              {[...(client.boutiqueAchats || [])].reverse().slice(0, 5).map((achat) => (
                <div key={achat.id} className="flex items-center justify-between text-sm text-dark/70">
                  <span>{achat.date ? formatDate(achat.date, 'dd/MM/yyyy') : '—'}{achat.articles ? ` — ${achat.articles}` : ''}</span>
                  <span className="text-green-600 font-semibold flex-shrink-0 ml-2">+{achat.points} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-beige-200 p-6">
        <h3 className="font-semibold text-dark mb-5 flex items-center gap-2">
          <Star size={16} className="text-gold-500" /> Tous vos avantages actifs
        </h3>
        <div className="space-y-5">
          {[
            { label: 'Hébergements', icon: Home, items: niveau.benefits.hebergements, color: '#1565C0', bg: '#E3F2FD' },
            { label: 'Boutique L&Lui', icon: ShoppingBag, items: niveau.benefits.boutique, color: '#2E7D32', bg: '#E8F5E9' },
            { label: 'Événementiel', icon: Calendar, items: niveau.benefits.evenementiel, color: '#7B1FA2', bg: '#F3E5F5' },
            ...(niveau.benefits.exclusifs ? [{ label: 'Avantages exclusifs', icon: Gift, items: niveau.benefits.exclusifs, color: '#B8860B', bg: '#FFF8DC' }] : []),
          ].map(({ label, icon: Icon, items, color, bg }) => (
            <div key={label} className="rounded-xl p-4" style={{ background: bg }}>
              <p className="text-sm font-semibold flex items-center gap-2 mb-3" style={{ color }}>
                <Icon size={14} /> {label}
              </p>
              <ul className="space-y-1.5">
                {items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-dark/75">
                    <span className="flex-shrink-0 mt-0.5 font-bold" style={{ color }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-beige-200 p-5 text-center">
        <p className="text-sm text-dark/60 mb-3">
          Vos coordonnées seront automatiquement pré-remplies lors de votre prochaine réservation.
        </p>
        <Link href="/" className="btn-outline-gold">Choisir un hébergement</Link>
      </div>
    </div>
  )
}

function NiveauxPresentation() {
  return (
    <div className="space-y-4 mt-8">
      <h2 className="font-serif text-2xl font-semibold text-dark text-center mb-2">Les niveaux L&Lui Stars</h2>
      <p className="text-dark/50 text-sm text-center mb-6">
        Chaque séjour vous rapproche d&apos;avantages exclusifs en hébergements ET en boutique.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {NIVEAUX_ORDER.map((niveauId) => {
          const n = NIVEAUX[niveauId]
          return (
            <div key={niveauId} className="rounded-2xl border p-5" style={{ background: n.bgColor, borderColor: n.borderColor }}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{n.emoji}</span>
                <div>
                  <p className="font-bold text-dark">{n.label}</p>
                  <p className="text-xs" style={{ color: n.color }}>
                    {n.maxSejours ? `${n.minSejours} à ${n.maxSejours} séjours` : `${n.minSejours}+ séjours`}
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-lg font-bold" style={{ color: n.color }}>-{n.boutiqueDiscount}%</p>
                  <p className="text-xs text-dark/40">boutique</p>
                </div>
              </div>
              <ul className="space-y-1">
                {n.benefits.hebergements.slice(0, 2).map((b) => (
                  <li key={b} className="text-xs text-dark/60 flex items-start gap-1.5">
                    <span style={{ color: n.color }} className="flex-shrink-0">✓</span> {b}
                  </li>
                ))}
                {n.benefits.boutique.slice(0, 1).map((b) => (
                  <li key={b} className="text-xs text-dark/60 flex items-start gap-1.5">
                    <span style={{ color: n.color }} className="flex-shrink-0">✓</span> {b}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
