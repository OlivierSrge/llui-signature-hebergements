// app/faire-part/[marie_uid]/page.tsx — Invitation numérique premium
// Espace émotionnel pur — ZÉRO commercial, ZÉRO boutique, ZÉRO MLM

import { getDb } from '@/lib/firebase'
import FairePartClient from '@/components/faire-part/FairePartClient'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface Props { params: { marie_uid: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const db = getDb()
    const snap = await db.collection('portail_users').doc(params.marie_uid).get()
    if (!snap.exists) return { title: 'Invitation — L&Lui Signature' }
    const d = snap.data()!
    const noms = (d.noms_maries as string) || 'Les Mariés'
    return {
      title: `Mariage de ${noms}`,
      description: `Vous êtes invités à célébrer le mariage de ${noms} à ${d.lieu ?? 'Kribi'}.`,
      openGraph: {
        title: `Mariage de ${noms}`,
        description: `Invitation au mariage de ${noms}`,
        type: 'website',
      },
    }
  } catch {
    return { title: 'Invitation — L&Lui Signature' }
  }
}

function toISO(raw: unknown): string {
  if (!raw) return ''
  if (typeof (raw as any)?.toDate === 'function') {
    return (raw as any).toDate().toISOString().slice(0, 10)
  }
  return typeof raw === 'string' ? raw : ''
}

async function getData(marie_uid: string) {
  try {
    const db = getDb()
    const snap = await db.collection('portail_users').doc(marie_uid).get()
    if (!snap.exists) return null
    const d = snap.data()!

    return {
      noms_maries: (d.noms_maries as string) || '',
      date_mariage: toISO(d.date_mariage ?? d.projet?.date_evenement),
      lieu: (d.lieu as string) || (d.projet?.lieu as string) || 'Kribi, Cameroun',
      adresse_exacte: (d.adresse_exacte as string) || '',
      google_maps_url: (d.google_maps_url as string) || '',
      plans_acces_url: (d.plans_acces_url as string) || '',
      message_faire_part: (d.message_faire_part as string) || '',
      theme: (d.theme as Record<string, string>) || null,
      programme: (d.programme as Array<{
        heure: string; titre: string; description: string; icone: string
      }>) || [],
      hebergements_visibles: (d.hebergements_visibles as boolean) ?? false,
      hebergements: (d.hebergements as Array<{
        nom: string; type: string; description: string;
        telephone: string; prix_indicatif: string; maps_url: string
      }>) || [],
      contact_hebergements_whatsapp: (d.contact_hebergements_whatsapp as string) || '',
      rsvp_ouvert: (d.rsvp_ouvert as boolean) ?? true,
      rsvp_max_accompagnants: (d.rsvp_max_accompagnants as number) ?? 2,
      rsvp_date_limite: (d.rsvp_date_limite as string) || '',
    }
  } catch {
    return null
  }
}

export default async function FairePartPage({ params }: Props) {
  const data = await getData(params.marie_uid)
  // Page générique si UID invalide — pas de 404 pour ne pas exposer l'arborescence
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D2137' }}>
        <div className="text-center px-8 py-12 rounded-3xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <p className="text-6xl mb-6">💍</p>
          <h1 className="text-2xl font-serif text-white mb-3">Invitation introuvable</h1>
          <p className="text-white/50 text-sm">Ce lien ne correspond à aucun faire-part actif.</p>
          <p className="text-white/30 text-xs mt-4">L&Lui Signature — Kribi, Cameroun</p>
        </div>
      </div>
    )
  }
  return <FairePartClient marie_uid={params.marie_uid} {...data} />
}
