export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { getDb } from '@/lib/firebase'
import PrestatairesClient from '@/components/prestataires/PrestatairesClient'

export const metadata: Metadata = {
  title: 'Prestataires certifiés à Kribi | L&Lui Signature',
  description: 'Photographes, DJ, décorateurs, guides et prestataires de services sélectionnés et certifiés par L&Lui Signature à Kribi.',
}

async function getPrestataires() {
  try {
    const db = getDb()
    const snap = await db.collection('prestataires').where('statut', '==', 'actif').get()
    return snap.docs
      .map((d) => {
        const data = d.data()
        return {
          id: d.id,
          nom: data.nom ?? '',
          slogan: data.slogan ?? '',
          categorie: data.categorie ?? '',
          contact: data.contact ?? {},
          services: data.services ?? [],
          portfolio: data.portfolio ?? [],
          photo_principale: data.photo_principale ?? '',
          logo_url: data.logo_url ?? '',
          note_moyenne: data.note_moyenne ?? 0,
          nb_avis: data.nb_avis ?? 0,
          certifie: data.certifie ?? false,
          mis_en_avant: data.mis_en_avant ?? false,
          ordre_affichage: data.ordre_affichage ?? 99,
        }
      })
      .sort((a, b) => {
        if (a.mis_en_avant && !b.mis_en_avant) return -1
        if (!a.mis_en_avant && b.mis_en_avant) return 1
        if (a.certifie && !b.certifie) return -1
        if (!a.certifie && b.certifie) return 1
        return a.ordre_affichage - b.ordre_affichage
      })
  } catch {
    return []
  }
}

export default async function PrestatairesPage() {
  const prestataires = await getPrestataires()
  const nbCertifies = prestataires.filter((p) => p.certifie).length

  return (
    <div className="min-h-screen" style={{ background: '#F5F0E8' }}>
      {/* ── En-tête ── */}
      <section className="px-4 pt-12 pb-8 text-center" style={{ background: '#1A1A1A' }}>
        <div className="max-w-xl mx-auto">
          <Link href="/" className="text-[#C9A84C] font-serif text-base font-semibold tracking-wide block mb-6">
            L&amp;Lui Signature
          </Link>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-3">
            Les meilleurs prestataires<br />
            <em className="text-[#C9A84C] not-italic">de Kribi</em>
          </h1>
          <p className="text-white/50 text-sm mb-5">
            Sélectionnés et certifiés par L&amp;Lui Signature
          </p>
          {nbCertifies > 0 && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium" style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.3)' }}>
              <ShieldCheck size={14} />
              {nbCertifies} prestataire{nbCertifies > 1 ? 's' : ''} certifié{nbCertifies > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </section>

      {/* ── Grille avec filtres ── */}
      <PrestatairesClient prestataires={prestataires} />

      {/* ── CTA rejoindre ── */}
      <section className="px-4 py-12 text-center border-t border-[#1A1A1A]/8">
        <p className="text-[#1A1A1A]/50 text-sm mb-4">
          Vous êtes prestataire à Kribi ?
        </p>
        <Link
          href="/rejoindre-reseau"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80"
          style={{ background: '#1A1A1A', color: '#C9A84C' }}
        >
          Rejoindre notre réseau certifié →
        </Link>
      </section>
    </div>
  )
}
