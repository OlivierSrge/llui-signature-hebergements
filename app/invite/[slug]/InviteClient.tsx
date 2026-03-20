'use client'
// app/invite/[slug]/InviteClient.tsx — Affichage page publique invité

import { useEffect } from 'react'

const BOUTIQUE_URL = 'https://letlui-signature.netlify.app'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
}

interface Props {
  guestId: string; mariageUid: string; guestNom: string; slug: string
  nomsMaries: string; dateEvenement: string | null; lieu: string | null
  hebergements: { id: string; nom: string; prix_nuit: number; image_url?: string }[]
  produits: { id: string; nom: string; prix: number; url_fiche?: string; image_url?: string }[]
}

export default function InviteClient({ guestId, mariageUid, nomsMaries, dateEvenement, lieu, hebergements, produits }: Props) {
  // Stocker ref dans localStorage
  useEffect(() => {
    try {
      localStorage.setItem('llui_ref', JSON.stringify({ guest_id: guestId, mariage_uid: mariageUid }))
    } catch {}
  }, [guestId, mariageUid])

  const dateStr = dateEvenement ? new Date(dateEvenement).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null

  return (
    <div className="min-h-screen" style={{ background: '#1A1A1A', color: 'white' }}>
      {/* HERO */}
      <div className="text-center px-6 pt-12 pb-8">
        <p className="font-serif italic text-3xl mb-6" style={{ color: '#C9A84C' }}>L&Lui</p>
        <p className="text-white/60 text-sm mb-2">Vous êtes invité(e) au mariage de</p>
        <p className="font-serif italic text-2xl mb-3" style={{ color: '#C9A84C' }}>{nomsMaries}</p>
        {(dateStr || lieu) && (
          <p className="text-white/50 text-xs">{[dateStr, lieu].filter(Boolean).join(' · ')}</p>
        )}
      </div>

      {/* SECTION 1 — Hébergements */}
      {hebergements.length > 0 && (
        <section className="px-4 pb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4 text-center">Hébergements recommandés</p>
          <div className="space-y-3">
            {hebergements.map(h => (
              <div key={h.id} className="rounded-2xl overflow-hidden border border-white/10">
                {h.image_url && <img src={h.image_url} alt={h.nom} className="w-full h-36 object-cover" />}
                <div className="p-4 flex items-center justify-between" style={{ background: '#242424' }}>
                  <div>
                    <p className="font-semibold text-sm">{h.nom}</p>
                    {h.prix_nuit > 0 && <p className="text-xs text-white/50">{formatFCFA(h.prix_nuit)} / nuit</p>}
                  </div>
                  <a href={`${APP_URL}/reservation/${h.id}?ref=${guestId}&mariage=${mariageUid}`}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#1A1A1A]" style={{ background: '#C9A84C' }}>
                    Réserver
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 2 — Boutique */}
      <section className="px-4 pb-8" style={{ background: '#242424' }}>
        <div className="py-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4 text-center">Boutique mariage</p>
          {produits.length > 0 && (
            <div className="space-y-3 mb-4">
              {produits.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-2xl border border-white/10">
                  {p.image_url && <img src={p.image_url} alt={p.nom} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{p.nom}</p>
                    {p.prix > 0 && <p className="text-xs text-white/50">{formatFCFA(p.prix)}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <a href={`${BOUTIQUE_URL}?ref=${guestId}&mariage=${mariageUid}`} target="_blank" rel="noopener noreferrer"
            className="block w-full py-3 rounded-2xl text-sm font-semibold text-[#1A1A1A] text-center" style={{ background: '#C9A84C' }}>
            Découvrir la boutique →
          </a>
        </div>
      </section>

      {/* SECTION 3 — Rejoindre L&Lui */}
      <section className="px-4 py-8 text-center">
        <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Opportunité</p>
        <p className="font-serif italic text-xl mb-2" style={{ color: '#C9A84C' }}>Transformez votre présence</p>
        <p className="text-sm text-white/60 mb-5">en opportunité de revenus</p>
        <a href={`/inscription?ref=${mariageUid}`}
          className="inline-block px-8 py-3 rounded-2xl text-sm font-semibold border text-white" style={{ borderColor: '#C9A84C', color: '#C9A84C' }}>
          Rejoindre L&Lui Signature
        </a>
      </section>

      {/* FOOTER */}
      <footer className="px-4 py-6 text-center border-t border-white/10">
        <p className="font-serif italic text-lg mb-3" style={{ color: '#C9A84C' }}>L&Lui</p>
        <a href="https://wa.me/237693407964" className="text-xs text-white/40 hover:text-white/70">Contact WhatsApp</a>
      </footer>
    </div>
  )
}
