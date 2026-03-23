'use client'
// components/admin/SanteInvitesClient.tsx — #185 Espace santé invités

interface RSVPGuest {
  id: string
  prenom: string
  nom: string
  tel?: string
  allergies?: string
  pmr?: boolean
  presence?: string
  marie_uid: string
  noms_maries?: string
}

interface Props {
  guests: RSVPGuest[]
}

const URGENCES_KRIBI = [
  { nom: 'Hôpital de District de Kribi', tel: '+237 233 461 212', type: 'Urgences générales', emoji: '🏥' },
  { nom: 'Centre Médical Saint-Jean', tel: '+237 699 XXX XXX', type: 'Médecine générale', emoji: '🩺' },
  { nom: 'Pharmacie Centrale Kribi', tel: '+237 233 461 XXX', type: 'Pharmacie de garde', emoji: '💊' },
  { nom: 'SAMU Cameroun', tel: '119', type: 'Urgences nationales', emoji: '🚑' },
  { nom: 'Sapeurs-Pompiers', tel: '118', type: 'Secours & incendie', emoji: '🚒' },
  { nom: 'Dr. Mbarga Pierre (Kribi)', tel: '+237 677 XXX XXX', type: 'Médecin partenaire L&Lui', emoji: '👨‍⚕️' },
]

export default function SanteInvitesClient({ guests }: Props) {
  const allergiques = guests.filter(g => g.allergies && g.allergies.trim() !== '')
  const pmrGuests = guests.filter(g => g.pmr)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">🏥 Espace santé invités</h1>
        <p className="text-sm text-[#888] mt-1">Allergies, PMR et contacts urgences — données issues du formulaire RSVP</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Invités avec allergies', value: allergiques.length, color: '#C0392B', emoji: '⚠️' },
          { label: 'PMR déclarés', value: pmrGuests.length, color: '#5B8FBF', emoji: '♿' },
          { label: 'Total signalements', value: guests.length, color: '#C9A84C', emoji: '📋' },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-xl p-4 text-center" style={{ background: kpi.color + '10', border: `1px solid ${kpi.color}25` }}>
            <div className="text-2xl mb-1">{kpi.emoji}</div>
            <div className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="text-[10px] text-[#888] mt-0.5">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Allergies */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #C0392B25' }}>
        <div className="px-5 py-3" style={{ background: '#C0392B10' }}>
          <h2 className="font-bold text-[#C0392B]">⚠️ Invités avec allergies ({allergiques.length})</h2>
          <p className="text-xs text-[#888] mt-0.5">À communiquer impérativement au traiteur</p>
        </div>
        {allergiques.length === 0 ? (
          <div className="px-5 py-4 text-center text-sm text-[#AAA]">Aucune allergie déclarée pour l'instant</div>
        ) : (
          <div className="divide-y divide-[#F5F0E8]">
            {allergiques.map(g => (
              <div key={g.id} className="px-5 py-3 flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-[#1A1A1A] text-sm">{g.prenom} {g.nom}</p>
                  <p className="text-[10px] text-[#C9A84C]">Mariage de {g.noms_maries}</p>
                  <div className="mt-1.5 px-2 py-1 rounded-lg inline-block text-xs font-medium" style={{ background: '#C0392B10', color: '#C0392B' }}>
                    {g.allergies}
                  </div>
                </div>
                {g.tel && (
                  <a href={`tel:${g.tel}`} className="text-[10px] text-[#5B8FBF] whitespace-nowrap">{g.tel}</a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PMR */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #5B8FBF25' }}>
        <div className="px-5 py-3" style={{ background: '#5B8FBF10' }}>
          <h2 className="font-bold text-[#5B8FBF]">♿ Personnes à mobilité réduite ({pmrGuests.length})</h2>
          <p className="text-xs text-[#888] mt-0.5">Prévoir accès facilité, rampe et places réservées</p>
        </div>
        {pmrGuests.length === 0 ? (
          <div className="px-5 py-4 text-center text-sm text-[#AAA]">Aucun PMR déclaré pour l'instant</div>
        ) : (
          <div className="divide-y divide-[#F5F0E8]">
            {pmrGuests.map(g => (
              <div key={g.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[#1A1A1A] text-sm">{g.prenom} {g.nom}</p>
                  <p className="text-[10px] text-[#C9A84C]">Mariage de {g.noms_maries}</p>
                </div>
                {g.tel && <a href={`tel:${g.tel}`} className="text-[10px] text-[#5B8FBF]">{g.tel}</a>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Urgences Kribi */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #C9A84C25' }}>
        <div className="px-5 py-3" style={{ background: '#C9A84C10' }}>
          <h2 className="font-bold text-[#1A1A1A]">🚨 Contacts urgences Kribi</h2>
          <p className="text-xs text-[#888] mt-0.5">À distribuer à l'équipe le jour J</p>
        </div>
        <div className="divide-y divide-[#F5F0E8]">
          {URGENCES_KRIBI.map(u => (
            <div key={u.nom} className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">{u.emoji}</span>
                <div>
                  <p className="text-sm font-semibold text-[#1A1A1A]">{u.nom}</p>
                  <p className="text-[10px] text-[#888]">{u.type}</p>
                </div>
              </div>
              <a
                href={`tel:${u.tel}`}
                className="text-sm font-bold px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: '#C9A84C15', color: '#C9A84C' }}
              >
                {u.tel}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
