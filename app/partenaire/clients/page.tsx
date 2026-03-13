export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { db } from '@/lib/firebase'
import Link from 'next/link'
import { ArrowLeft, Users, Phone, Mail, Calendar, ArrowRight, Search } from 'lucide-react'

interface ClientSummary {
  guestKey: string
  guest_first_name: string
  guest_last_name: string
  guest_phone: string
  guest_email: string
  totalSejours: number
  totalNuits: number
  totalDepense: number
  dernierSejour: string
  reservationIds: string[]
}

async function getPartnerClients(partnerId: string, search?: string): Promise<ClientSummary[]> {
  // Récupérer les logements du partenaire
  const accSnap = await db.collection('hebergements')
    .where('partner_id', '==', partnerId)
    .get()
  const accIds = accSnap.docs.map((d) => d.id)
  if (accIds.length === 0) return []

  // Récupérer toutes les réservations confirmées pour ces logements
  const chunks: string[][] = []
  for (let i = 0; i < accIds.length; i += 10) chunks.push(accIds.slice(i, i + 10))

  const reservations: any[] = []
  for (const chunk of chunks) {
    const s = await db.collection('reservations')
      .where('accommodation_id', 'in', chunk)
      .where('reservation_status', '==', 'confirmee')
      .get()
    s.docs.forEach((d) => reservations.push({ id: d.id, ...d.data() }))
  }

  // Grouper par client (téléphone ou email comme clé unique)
  const clientMap = new Map<string, ClientSummary>()
  for (const r of reservations) {
    const key = (r.guest_phone || r.guest_email || `${r.guest_first_name}_${r.guest_last_name}`).toLowerCase().trim()
    if (!key) continue

    if (!clientMap.has(key)) {
      clientMap.set(key, {
        guestKey: key,
        guest_first_name: r.guest_first_name || '',
        guest_last_name: r.guest_last_name || '',
        guest_phone: r.guest_phone || '',
        guest_email: r.guest_email || '',
        totalSejours: 0,
        totalNuits: 0,
        totalDepense: 0,
        dernierSejour: r.check_in || '',
        reservationIds: [],
      })
    }
    const c = clientMap.get(key)!
    c.totalSejours += 1
    c.totalNuits += Number(r.nights) || 0
    c.totalDepense += Number(r.total_price) || 0
    c.reservationIds.push(r.id)
    if ((r.check_in || '') > c.dernierSejour) c.dernierSejour = r.check_in
  }

  let clients = Array.from(clientMap.values())
    .sort((a, b) => b.totalSejours - a.totalSejours || b.dernierSejour.localeCompare(a.dernierSejour))

  if (search) {
    const q = search.toLowerCase()
    clients = clients.filter(
      (c) =>
        c.guest_first_name.toLowerCase().includes(q) ||
        c.guest_last_name.toLowerCase().includes(q) ||
        c.guest_phone.includes(q) ||
        c.guest_email.toLowerCase().includes(q)
    )
  }

  return clients
}

function getFideliteLabel(sejours: number): { label: string; color: string } {
  if (sejours >= 5) return { label: '⭐ Client fidèle', color: 'bg-gold-100 text-gold-700' }
  if (sejours >= 3) return { label: '🔄 Client régulier', color: 'bg-blue-100 text-blue-700' }
  return { label: 'Client', color: 'bg-beige-100 text-dark/50' }
}

export default async function PartnerClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const cookieStore = cookies()
  const partnerId = cookieStore.get('partner_session')?.value
  if (!partnerId) redirect('/partenaire')

  const sp = await searchParams
  const search = sp.q?.trim()
  const clients = await getPartnerClients(partnerId, search)

  const totalClients = clients.length
  const fideles = clients.filter((c) => c.totalSejours >= 3).length

  return (
    <div className="min-h-screen bg-beige-50">
      <header className="bg-white border-b border-beige-200 px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/partenaire/dashboard" className="p-2 rounded-xl hover:bg-beige-50 transition-colors text-dark/50 hover:text-dark">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="text-xs text-dark/40">Espace partenaire</p>
            <h1 className="font-serif text-xl font-semibold text-dark flex items-center gap-2">
              <Users size={18} className="text-gold-500" /> Mes clients
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Stats rapides */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-beige-200 p-4 text-center">
            <p className="text-2xl font-bold text-dark">{totalClients}</p>
            <p className="text-xs text-dark/50 mt-1">Clients uniques</p>
          </div>
          <div className="bg-white rounded-2xl border border-gold-200 p-4 text-center">
            <p className="text-2xl font-bold text-gold-600">{fideles}</p>
            <p className="text-xs text-dark/50 mt-1">Clients réguliers (3+ séjours)</p>
          </div>
        </div>

        {/* Barre de recherche */}
        <form method="GET" className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/40" />
            <input
              type="search"
              name="q"
              defaultValue={search || ''}
              placeholder="Rechercher un client (nom, téléphone, email)..."
              className="input-field pl-9 text-sm"
            />
          </div>
          <button type="submit" className="px-4 py-2.5 bg-dark text-white rounded-xl text-sm font-medium hover:bg-dark/80 transition-colors">
            Chercher
          </button>
        </form>

        {/* Liste clients */}
        {clients.length === 0 ? (
          <div className="bg-white rounded-2xl border border-beige-200 py-16 text-center text-dark/40">
            <Users size={32} className="mx-auto mb-3 opacity-30" />
            <p>{search ? 'Aucun client trouvé pour cette recherche' : 'Aucun client confirmé pour le moment'}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
            <div className="divide-y divide-beige-100">
              {clients.map((c) => {
                const fidelite = getFideliteLabel(c.totalSejours)
                return (
                  <div key={c.guestKey} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <p className="font-semibold text-dark">{c.guest_first_name} {c.guest_last_name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${fidelite.color}`}>
                            {fidelite.label}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-3 text-xs text-dark/50">
                          {c.guest_phone && (
                            <a
                              href={`https://wa.me/${c.guest_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Bonjour ${c.guest_first_name} !`)}`}
                              className="flex items-center gap-1.5 hover:text-green-600 transition-colors"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Phone size={11} className="text-green-500" />{c.guest_phone}
                            </a>
                          )}
                          {c.guest_email && (
                            <span className="flex items-center gap-1.5">
                              <Mail size={11} className="text-gold-500" />{c.guest_email}
                            </span>
                          )}
                          {c.dernierSejour && (
                            <span className="flex items-center gap-1.5">
                              <Calendar size={11} className="text-blue-400" />Dernier : {c.dernierSejour}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-gold-600 text-sm">{c.totalDepense.toLocaleString('fr-FR')} FCFA</p>
                        <p className="text-xs text-dark/40">{c.totalSejours} séjour{c.totalSejours > 1 ? 's' : ''} · {c.totalNuits} nuit{c.totalNuits > 1 ? 's' : ''}</p>
                      </div>
                    </div>

                    {/* Lien vers les réservations du client */}
                    {c.reservationIds.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {c.reservationIds.slice(0, 3).map((id) => (
                          <Link
                            key={id}
                            href={`/partenaire/reservations/${id}`}
                            className="text-xs text-gold-600 hover:underline flex items-center gap-0.5"
                          >
                            Résa #{id.slice(-6).toUpperCase()} <ArrowRight size={10} />
                          </Link>
                        ))}
                        {c.reservationIds.length > 3 && (
                          <span className="text-xs text-dark/30">+{c.reservationIds.length - 3} autres</span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
