// app/portail/analytics/page.tsx
// Mes Invités — Guest Connect analytics — Server Component

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getDb } from '@/lib/firebase'

async function getInvitesData() {
  try {
    const cookieStore = cookies()
    const uid = cookieStore.get('portail_uid')?.value
    if (!uid) redirect('/portail/login')
    const db = getDb()
    const snap = await db.collection('portail_users').doc(uid).get()
    if (!snap.exists) redirect('/portail/login')
    const d = snap.data()!
    // Compatibilité descendante : nouveau (date_mariage, nb_invites_prevus, noms_maries)
    // et ancien (projet.date_evenement, projet.nombre_invites_prevu, projet.nom, nom)
    const prevus = d.nb_invites_prevus ?? d.nombre_invites_prevu ?? d.projet?.nombre_invites_prevu ?? 0
    const confirmes = d.invites_confirmes ?? 0
    const declines = d.invites_declines ?? 0
    const enAttente = Math.max(0, prevus - confirmes - declines)
    const pct = prevus > 0 ? Math.min(100, Math.round((confirmes / prevus) * 100)) : 0
    const nomEvenement = d.noms_maries ?? d.projet?.nom ?? d.nom ?? ''
    const dateTs = d.date_mariage ?? d.date_evenement ?? d.projet?.date_evenement
    const dateISO: string | null = dateTs?.toDate ? dateTs.toDate().toISOString() : (typeof dateTs === 'string' ? dateTs : null)
    return { prevus, confirmes, declines, enAttente, pct, nomEvenement, dateISO, uid }
  } catch {
    redirect('/portail/login')
  }
}

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-1">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

export default async function AnalyticsPage() {
  const data = await getInvitesData()
  const { prevus, confirmes, declines, enAttente, pct, nomEvenement, dateISO } = data

  const dateLabel = dateISO
    ? new Date(dateISO).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes Invités</h1>
        {nomEvenement && (
          <p className="text-sm text-gray-500 mt-0.5">
            {nomEvenement}{dateLabel ? ` — ${dateLabel}` : ''}
          </p>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Invités prévus" value={prevus} color="text-gray-800" />
        <KpiCard label="Confirmés ✅" value={confirmes} color="text-green-600" />
        <KpiCard label="Déclinés ❌" value={declines} color="text-red-500" />
        <KpiCard label="En attente ⏳" value={enAttente} color="text-amber-500" />
      </div>

      {/* Barre de progression */}
      <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <p className="font-semibold text-gray-800">Taux de confirmation</p>
          <p className="text-2xl font-bold text-[#C9A84C]">{pct}%</p>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#C9A84C] rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400">
          {confirmes} confirmé{confirmes > 1 ? 's' : ''} sur {prevus} invité{prevus > 1 ? 's' : ''} prévu{prevus > 1 ? 's' : ''}
        </p>
      </div>

      {/* Répartition visuelle */}
      {prevus > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
          <p className="font-semibold text-gray-800">Répartition</p>
          <div className="h-4 rounded-full overflow-hidden flex">
            {confirmes > 0 && (
              <div
                className="bg-green-500 h-full"
                style={{ width: `${Math.round((confirmes / prevus) * 100)}%` }}
                title={`Confirmés : ${confirmes}`}
              />
            )}
            {declines > 0 && (
              <div
                className="bg-red-400 h-full"
                style={{ width: `${Math.round((declines / prevus) * 100)}%` }}
                title={`Déclinés : ${declines}`}
              />
            )}
            {enAttente > 0 && (
              <div
                className="bg-amber-200 h-full flex-1"
                title={`En attente : ${enAttente}`}
              />
            )}
          </div>
          <div className="flex gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" />Confirmés</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-400 inline-block" />Déclinés</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-200 inline-block" />En attente</span>
          </div>
        </div>
      )}

      {/* Message si pas d'invités configurés */}
      {prevus === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
          <p className="text-amber-700 font-medium">Aucun nombre d&apos;invités défini</p>
          <p className="text-xs text-amber-500 mt-1">
            Configurez le nombre d&apos;invités prévus dans votre profil événement.
          </p>
        </div>
      )}
    </div>
  )
}
