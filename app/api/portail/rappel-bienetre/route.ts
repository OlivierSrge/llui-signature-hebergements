// app/api/portail/rappel-bienetre/route.ts — #184 Rappel WhatsApp bien-être mariée
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import { sendWhatsApp } from '@/lib/whatsappNotif'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { marie_uid, jours_restants } = await req.json()
    if (!marie_uid) return NextResponse.json({ error: 'marie_uid requis' }, { status: 400 })

    const db = getDb()
    const snap = await db.collection('portail_users').doc(marie_uid).get()
    if (!snap.exists) return NextResponse.json({ error: 'mariée non trouvée' }, { status: 404 })

    const d = snap.data()!
    const tel = d.phone || d.tel || d.telephone
    if (!tel) return NextResponse.json({ error: 'téléphone non configuré' }, { status: 400 })

    const jours = jours_restants ?? 0
    const prenom = (d.noms_maries as string)?.split(' ')[0] || 'Chère mariée'

    // Message selon le milestone le plus proche
    let conseils = ''
    if (jours >= 85) conseils = '🌿 *J-90* — Premier essayage robe, choisir coiffeuse et maquilleuse'
    else if (jours >= 55) conseils = '💅 *J-60* — Deuxième essayage, soin professionnel visage, nail art choisi'
    else if (jours >= 25) conseils = '✨ *J-30* — Test maquillage + coiffure définitifs, essayage final robe'
    else if (jours >= 12) conseils = '💇 *J-15* — Masques cheveux intensifs, hydratation corps quotidienne'
    else if (jours >= 5) conseils = '💆 *J-7* — Épilations, manucure/pédicure, masque hydratant visage'
    else if (jours >= 2) conseils = '🛁 *J-3* — Bain doux, préparer sac mariée, essayage accessoires'
    else if (jours >= 1) conseils = '👑 *J-1* — Repos absolu, masque nuit, tout prêt, au lit avant 22h 💛'
    else conseils = '🎊 *Jour J* — C\'est votre grand jour ! Vous êtes magnifique 💛'

    const message = `💫 *Rappel bien-être L&Lui Signature*\n\nBonjour ${prenom} !\n\nVous êtes à *J-${jours}* de votre mariage ✨\n\n${conseils}\n\n_Votre checklist complète est disponible dans votre portail marié._\n\n— L&Lui Signature 💛`

    await sendWhatsApp(tel, message)

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
