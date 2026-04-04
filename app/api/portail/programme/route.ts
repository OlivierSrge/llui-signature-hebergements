// app/api/portail/programme/route.ts
// GET  — Retourne le programme personnalisé du marié (ou défaut si non encore configuré)
// PATCH — Sauvegarde le programme personnalisé dans portail_users/{uid}.programme_jour_j

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

export interface EtapeProgramme {
  id: string
  emoji: string
  titre: string
  description: string
  heure: string
  ordre: number
}

const PROGRAMME_DEFAUT: EtapeProgramme[] = [
  { id: '1', emoji: '💄', titre: 'Préparation de la mariée', description: 'Coiffure, maquillage, habillage', heure: '09:00', ordre: 0 },
  { id: '2', emoji: '🤵', titre: 'Préparation du marié', description: 'Habillage, photographies', heure: '10:30', ordre: 1 },
  { id: '3', emoji: '💍', titre: 'Cérémonie traditionnelle', description: 'Remise de la dot — famille réunie', heure: '11:00', ordre: 2 },
  { id: '4', emoji: '⛪', titre: 'Cérémonie civile / religieuse', description: 'Échange des vœux, signature des registres', heure: '13:00', ordre: 3 },
  { id: '5', emoji: '📸', titre: 'Séance photos officielle', description: 'Couple + famille + témoins', heure: '15:00', ordre: 4 },
  { id: '6', emoji: '🥂', titre: 'Accueil des invités — Cocktail', description: 'Apéritif et cocktail de bienvenue', heure: '16:00', ordre: 5 },
  { id: '7', emoji: '✨', titre: 'Entrée des mariés', description: 'Applaudissements, première danse', heure: '17:00', ordre: 6 },
  { id: '8', emoji: '🍛', titre: 'Dîner de mariage', description: 'Service des plats — spécialités Kribi', heure: '18:00', ordre: 7 },
  { id: '9', emoji: '🎤', titre: 'Discours et témoignages', description: 'Témoins, familles, surprise', heure: '20:00', ordre: 8 },
  { id: '10', emoji: '🎂', titre: 'Gâteau et première danse', description: 'Découpe du gâteau, ouverture du bal', heure: '21:00', ordre: 9 },
  { id: '11', emoji: '🎵', titre: 'Soirée dansante', description: 'DJ / orchestre — piste de danse ouverte', heure: '22:00', ordre: 10 },
  { id: '12', emoji: '🌙', titre: 'Fin de soirée', description: 'Raccompagnement des invités', heure: '02:00', ordre: 11 },
]

export async function GET() {
  try {
    const jar = await cookies()
    const uid = jar.get('portail_uid')?.value
    if (!uid) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const db = getDb()
    const snap = await db.collection('portail_users').doc(uid).get()
    if (!snap.exists) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

    const programme = snap.data()?.programme_jour_j
    if (Array.isArray(programme) && programme.length > 0) {
      return NextResponse.json({ programme, personnalise: true })
    }
    return NextResponse.json({ programme: PROGRAMME_DEFAUT, personnalise: false })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const jar = await cookies()
    const uid = jar.get('portail_uid')?.value
    if (!uid) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const programme: EtapeProgramme[] = body.programme
    if (!Array.isArray(programme)) {
      return NextResponse.json({ error: 'Format invalide : programme doit être un tableau' }, { status: 400 })
    }

    // Validation légère
    for (const e of programme) {
      if (!e.titre || !e.heure) {
        return NextResponse.json({ error: 'Chaque étape doit avoir un titre et une heure' }, { status: 400 })
      }
    }

    const db = getDb()
    await db.collection('portail_users').doc(uid).update({ programme_jour_j: programme })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
