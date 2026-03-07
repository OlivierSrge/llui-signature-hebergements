export const dynamic = 'force-dynamic'

import { db } from '@/lib/firebase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Star, ShoppingBag, Calendar, Phone, Mail,
  Hash, Gift, Award, MessageCircle,
} from 'lucide-react'
import type { LoyaltyClient } from '@/lib/types'
import { NIVEAUX, getProgressToNextLevel } from '@/lib/loyalty'
import { formatPrice, formatDate } from '@/lib/utils'
import BoutiqueAchatForm from '@/components/admin/BoutiqueAchatForm'

async function getClient(id: string): Promise<LoyaltyClient | null> {
  const doc = await db.collection('clients').doc(id).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as LoyaltyClient
}

async function getClientReservations(email: string) {
  const snap = await db.collection('reservations')
    .where('guest_email', '==', email)
    .get()
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a: any, b: any) => b.created_at?.localeCompare(a.created_at) || 0) as any[]
}

export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const client = await getClient(id)
  if (!client) notFound()

  const reservations = await getClientReservations(client.email)
  const niveau = NIVEAUX[client.niveau || 'novice']
  const { next, progressPercent, sejoursToNext } = getProgressToNextLevel(client.totalSejours)

  function formatPhone(phone: string): string {
    const cleaned = (phone || '').replace(/\D/g, '')
    return cleaned.startsWith('237') ? cleaned : `237${cleaned}`
  }

  const waPhone = client.phone ? formatPhone(client.phone) : null
  const waMsg = encodeURIComponent(`Bonjour ${client.firstName}, votre niveau L&Lui Stars est ${niveau.label} ${niveau.emoji}. Profitez de vos avantages sur letlui-signature.netlify.app avec le code : ${client.boutiquePromoCode}`)

  return (
    <div className="p-6 sm:p-8 pt-6 lg:pt-8 mt-14 lg:mt-0 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/clients" className="p-2 rounded-xl border border-beige-200 hover:bg-beige-50 text-dark/50 hover:text-dark">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-semibold text-dark">
            {client.firstName} {client.lastName}
          </h1>
          <p className="text-dark/50 text-sm">Code : {client.memberCode}</p>
        </div>
        {waPhone && (
          <a
            href={`https://wa.me/${waPhone}?text=${waMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-2 px-3 py-2 rounded-xl text-white text-xs font-medium"
            style={{ background: '#25D366' }}
          >
            <MessageCircle size={13} /> WhatsApp
          </a>
        )}
      </div>

      {/* Profil + Niveau */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Carte profil */}
        <div className="lg:col-span-1 space-y-4">
          {/* Badge niveau */}
          <div
            className="rounded-2xl p-5 border"
            style={{ background: niveau.bgColor, borderColor: niveau.borderColor }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
                style={{ background: `${niveau.color}20`, color: niveau.color }}
              >
                {client.firstName?.[0]}{client.lastName?.[0]}
              </div>
              <div>
                <p className="font-bold text-dark">{client.firstName} {client.lastName}</p>
                <p className="text-sm font-semibold" style={{ color: niveau.color }}>
                  {niveau.emoji} {niveau.label}
                </p>
              </div>
            </div>

            {/* Progress */}
            {next && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-dark/50 mb-1.5">
                  <span>{niveau.label}</span>
                  <span>{next.label} ({sejoursToNext} séjour{(sejoursToNext ?? 0) > 1 ? 's' : ''})</span>
                </div>
                <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${progressPercent}%`, background: niveau.color }}
                  />
                </div>
                <p className="text-xs text-dark/40 mt-1 text-right">{progressPercent}%</p>
              </div>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-dark/70">
                <Calendar size={13} /> Membre depuis {client.joinedAt ? formatDate(client.joinedAt, 'MMMM yyyy') : '—'}
              </div>
              {client.birthDate && (
                <div className="flex items-center gap-2 text-dark/70">
                  <Gift size={13} /> Né(e) le {formatDate(client.birthDate)}
                </div>
              )}
              <div className="flex items-center gap-2 text-dark/70">
                <Mail size={13} /> {client.email}
              </div>
              {client.phone && (
                <div className="flex items-center gap-2 text-dark/70">
                  <Phone size={13} /> {client.phone}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-2xl border border-beige-200 p-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xl font-bold text-dark">{client.totalSejours}</p>
              <p className="text-xs text-dark/40">Séjours</p>
            </div>
            <div>
              <p className="text-xl font-bold text-dark">{client.totalPoints || 0}</p>
              <p className="text-xs text-dark/40">Points</p>
            </div>
            <div>
              <p className="text-xl font-bold" style={{ color: niveau.color }}>{client.boutiqueDiscount}%</p>
              <p className="text-xs text-dark/40">Boutique</p>
            </div>
          </div>

          {/* Code promo boutique */}
          <div className="bg-white rounded-2xl border border-beige-200 p-4">
            <p className="text-xs font-medium text-dark/50 mb-2">Code promo boutique</p>
            <p className="font-mono font-bold text-lg text-dark tracking-widest">{client.boutiquePromoCode}</p>
            <p className="text-xs text-dark/40 mt-1">Valable sur letlui-signature.netlify.app</p>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Achat boutique */}
          <div className="bg-white rounded-2xl border border-beige-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-dark flex items-center gap-2 text-sm">
                <ShoppingBag size={15} className="text-green-600" /> Achats boutique
                <span className="text-xs text-dark/40 font-normal">
                  — {client.boutiquePointsEarned || 0} pts gagnés · {(client.boutiqueAchats || []).length} achat(s)
                </span>
              </h2>
            </div>

            <BoutiqueAchatForm clientId={client.id} />

            {(client.boutiqueAchats || []).length > 0 && (
              <div className="mt-4 divide-y divide-beige-100">
                {[...(client.boutiqueAchats || [])].reverse().map((achat) => (
                  <div key={achat.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-dark">{formatPrice(achat.montant)}</p>
                      {achat.articles && <p className="text-xs text-dark/50 truncate">{achat.articles}</p>}
                      <p className="text-xs text-dark/40">{achat.date ? formatDate(achat.date) : '—'}</p>
                    </div>
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full flex-shrink-0">
                      +{achat.points} pts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Réservations */}
          <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-beige-200">
              <h2 className="font-semibold text-dark flex items-center gap-2 text-sm">
                <Calendar size={15} className="text-gold-500" /> Historique des séjours ({reservations.length})
              </h2>
            </div>
            {reservations.length === 0 ? (
              <div className="py-8 text-center text-dark/40 text-sm">Aucune réservation</div>
            ) : (
              <div className="divide-y divide-beige-100">
                {reservations.slice(0, 10).map((res: any) => (
                  <Link
                    key={res.id}
                    href={`/admin/reservations/${res.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-beige-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-dark">{res.accommodation?.name || res.accommodation_id}</p>
                      <p className="text-xs text-dark/40">
                        {res.check_in && formatDate(res.check_in, 'dd/MM/yyyy')} → {res.check_out && formatDate(res.check_out, 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-dark">{formatPrice(res.total_price)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${res.reservation_status === 'confirmee' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {res.reservation_status === 'confirmee' ? 'Confirmée' : res.reservation_status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Avantages actifs */}
          <div className="bg-white rounded-2xl border border-beige-200 p-5">
            <h2 className="font-semibold text-dark flex items-center gap-2 text-sm mb-4">
              <Award size={15} className="text-gold-500" /> Avantages actifs — niveau {niveau.label}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Hébergements', items: niveau.benefits.hebergements, color: '#1565C0' },
                { label: 'Boutique', items: niveau.benefits.boutique, color: '#2E7D32' },
                { label: 'Événementiel', items: niveau.benefits.evenementiel, color: '#7B1FA2' },
                ...(niveau.benefits.exclusifs ? [{ label: 'Exclusifs', items: niveau.benefits.exclusifs, color: '#B8860B' }] : []),
              ].map((section) => (
                <div key={section.label}>
                  <p className="text-xs font-semibold mb-2" style={{ color: section.color }}>{section.label}</p>
                  <ul className="space-y-1">
                    {section.items.map((item) => (
                      <li key={item} className="flex items-start gap-1.5 text-xs text-dark/70">
                        <span className="mt-0.5 flex-shrink-0" style={{ color: section.color }}>✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
