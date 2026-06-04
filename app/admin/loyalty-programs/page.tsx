export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getAllLoyaltyPrograms } from '@/actions/loyalty'

export default async function AdminLoyaltyProgramsPage() {
  const { programs = [] } = await getAllLoyaltyPrograms()

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-serif text-[#C9A84C]">
            🎫 Programmes de fidélité
          </h1>
          <Link
            href="/admin/loyalty-programs/create"
            className="bg-[#C9A84C] hover:bg-[#D4AF37] text-black font-semibold px-5 py-2.5 rounded-lg transition"
          >
            + Créer un programme
          </Link>
        </div>

        {programs.length === 0 ? (
          <div className="bg-[#1A1A1A] border border-[#C9A84C]/20 rounded-xl p-12 text-center text-[#F5F0E8]/50">
            Aucun programme créé pour le moment.
          </div>
        ) : (
          <div className="space-y-4">
            {programs.map((p) => (
              <div
                key={p.program_id}
                className="bg-[#1A1A1A] border border-[#C9A84C]/20 rounded-xl p-5 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="text-[#F5F0E8] font-semibold">{p.nom}</p>
                  <p className="text-[#F5F0E8]/50 text-sm mt-0.5">{p.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <span className="text-[#C9A84C]">
                      {p.prix_fcfa.toLocaleString('fr-FR')} FCFA
                    </span>
                    <span className="text-[#F5F0E8]/40">·</span>
                    <span className="text-[#F5F0E8]/60">
                      L&Lui {p.commission_lui_percent}% / Partenaire {p.commission_partner_percent}%
                    </span>
                    <span className="text-[#F5F0E8]/40">·</span>
                    <span className={`font-medium ${
                      p.statut === 'ACTIVE' ? 'text-green-400' :
                      p.statut === 'PAUSED' ? 'text-yellow-400' : 'text-gray-400'
                    }`}>
                      {p.statut}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-[#F5F0E8]/40 text-xs">
                    {p.niveaux?.length ?? 0} niveaux
                  </span>
                  <Link
                    href={`/admin/loyalty-programs/${p.program_id}/configure`}
                    className="bg-[#C9A84C]/10 hover:bg-[#C9A84C]/20 border border-[#C9A84C]/30 text-[#C9A84C] text-xs font-medium px-3 py-1.5 rounded-lg transition"
                  >
                    ⚙️ Configurer
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
