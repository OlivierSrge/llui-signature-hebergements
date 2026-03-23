// app/api/portail/generer-programme/route.ts — #120 Génération programme cérémonie via Anthropic
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { marie_uid } = await req.json()
    if (!marie_uid) return NextResponse.json({ error: 'marie_uid requis' }, { status: 400 })

    const db = getDb()
    const snap = await db.collection('portail_users').doc(marie_uid).get()
    if (!snap.exists) return NextResponse.json({ error: 'marié introuvable' }, { status: 404 })

    const d = snap.data()!
    const noms = (d.noms_maries as string) || 'Les Mariés'
    const dateRaw = d.date_mariage ?? d.projet?.date_evenement
    const dateISO: string = dateRaw?.toDate ? dateRaw.toDate().toISOString().slice(0, 10) : typeof dateRaw === 'string' ? dateRaw : ''
    const lieu = (d.lieu as string) || 'Kribi, Cameroun'
    const nbInvites: number = (d.nb_invites_prevus as number) ?? (d.nombre_invites_prevu as number) ?? 100
    const traditionnel = d.mariage_traditionnel ? 'Oui (dot + cérémonie coutumière)' : 'Non'
    const religion = (d.religion as string) || 'catholique'

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY non configurée' }, { status: 500 })

    const client = new Anthropic({ apiKey })

    const prompt = `Tu es un expert en organisation de mariages de luxe en Afrique centrale, spécialisé dans les mariages à Kribi (Cameroun).

Génère un programme de cérémonie de mariage complet et élégant en français pour :
- Noms des mariés : ${noms}
- Date : ${dateISO ? new Date(dateISO).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'à définir'}
- Lieu : ${lieu}
- Nombre d'invités : ${nbInvites}
- Mariage traditionnel (dot) : ${traditionnel}
- Cérémonie religieuse : ${religion}

Retourne UNIQUEMENT un JSON valide avec cette structure exacte :
{
  "titre": "Programme de mariage",
  "sous_titre": "sous-titre élégant",
  "etapes": [
    {
      "heure": "HH:MM",
      "titre": "Nom de l'étape",
      "description": "Description courte et élégante (1-2 phrases)",
      "emoji": "emoji approprié",
      "duree_min": 60
    }
  ],
  "mot_des_maries": "Un mot chaleureux des mariés pour leurs invités (3-4 phrases)",
  "dress_code": "indication du dress code",
  "contacts_urgence": [
    { "nom": "Nom", "role": "Rôle", "tel": "numéro" }
  ]
}

Le programme doit commencer vers 9h-10h et se terminer vers 2h du matin. Inclure : préparation, dot si applicable, cérémonie civile/religieuse, photos, cocktail, dîner, discours, gâteau, soirée dansante. Adapte les horaires à la culture camerounaise et au lieu de Kribi.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Extraire le JSON de la réponse
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'Réponse IA invalide' }, { status: 500 })

    const programme = JSON.parse(jsonMatch[0])

    // Sauvegarder dans Firestore
    await db.collection('portail_users').doc(marie_uid).update({
      programme_ceremonie: { ...programme, genere_le: new Date().toISOString() },
    })

    return NextResponse.json({ ok: true, programme })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
