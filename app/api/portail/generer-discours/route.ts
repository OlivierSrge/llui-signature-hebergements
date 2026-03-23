// app/api/portail/generer-discours/route.ts — #121 Génération discours via Anthropic
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const {
      noms_maries, date_mariage, lieu,
      auteur, role, destinataire,
      anecdote, qualites, souhait,
      style, langue,
    } = await req.json()

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY manquante' }, { status: 500 })

    const client = new Anthropic({ apiKey })

    const styleDesc: Record<string, string> = {
      solennel: 'solennel et élégant, avec des formules nobles et formelles, digne d\'une cérémonie de prestige',
      emouvant: 'profondément émouvant, sincère et chaleureux, qui touche les cœurs et peut faire pleurer de joie',
      humoristique: 'drôle et décalé, avec des anecdotes amusantes, des jeux de mots et une touche d\'humour bienveillant',
    }

    const langueInstr = langue === 'en'
      ? 'Write the speech in English (formal British English for a prestigious wedding).'
      : 'Rédige le discours en français (français soutenu et élégant).'

    const prompt = `Tu es un expert en rédaction de discours de mariage pour des cérémonies de prestige en Afrique centrale.

${langueInstr}

Rédige un discours de mariage avec ces informations :
- Mariés : ${noms_maries}
- Date : ${date_mariage ? new Date(date_mariage).toLocaleDateString(langue === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
- Lieu : ${lieu}
- Auteur du discours : ${auteur} (${role})
- Destinataire(s) : ${destinataire}
- Anecdote ou souvenir à intégrer : ${anecdote || 'aucun spécifié'}
- Qualités des mariés à souligner : ${qualites || 'non spécifiées'}
- Souhait principal : ${souhait || 'bonheur et amour durable'}
- Style souhaité : ${styleDesc[style] || styleDesc.emouvant}

Retourne UNIQUEMENT un JSON valide :
{
  "titre": "Titre du discours",
  "intro": "Paragraphe d'introduction (2-3 phrases)",
  "corps": ["Paragraphe 1", "Paragraphe 2", "Paragraphe 3"],
  "conclusion": "Paragraphe de conclusion avec toast ou vœu final",
  "duree_estimee": "3-4 minutes",
  "conseils_orateur": "2-3 conseils pour bien délivrer ce discours"
}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'Réponse IA invalide' }, { status: 500 })

    const discours = JSON.parse(jsonMatch[0])
    return NextResponse.json({ ok: true, discours })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
