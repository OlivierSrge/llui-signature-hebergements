'use server'

import { db } from '@/lib/firebase'
import { revalidatePath } from 'next/cache'

const DEFAULT_TEMPLATES = {
  template1_proposal: `Bonjour {nom_client} 👋\n\nVoici notre proposition pour votre séjour :\n🏡 *{produit}*\n📅 Dates : {dates}\n👥 Personnes : {personnes}\n💰 Total : *{montant} FCFA*\n\n⚠️ Cette réservation est soumise à confirmation après paiement.\n\n📍 Suivi en temps réel : {lien_suivi}\n\nCordialement,\nL&Lui Signature`,
  template2_payment: `Bonjour {nom_client},\n\nMerci pour votre intérêt ! Pour finaliser votre réservation *{code_reservation}*, veuillez effectuer le paiement via Orange Money :\n\n📱 Numéro : *{numero_paiement}*\n💰 Montant exact : *{montant} FCFA*\n📝 Objet : {code_reservation}\n\nUne fois le paiement effectué, envoyez-nous la capture d'écran.\n\nL&Lui Signature`,
  template3_confirmation: `✅ *Paiement confirmé !*\n\nBonjour {nom_client},\n\nNous avons bien reçu votre paiement pour la réservation *{code_reservation}*.\n\nVotre séjour est désormais *officiellement confirmé* ! Vous recevrez votre fiche d'accueil et QR Code sous peu.\n\nL&Lui Signature`,
  template4_fiche: `🌊 *Fiche d'accueil — L&Lui Signature – Kribi*\n\nBonjour {nom_client},\n\nVotre séjour du {date_arrivee} → {date_depart} à Kribi approche ! Nous sommes ravis de vous accueillir.\n\n📍 Votre hébergement : *{produit}*\n👥 {personnes} personne(s)\n🔑 Code réservation : *{code_reservation}*\n\nRetrouvez tous les détails de votre réservation et votre QR Code d'accès ici :\n👉 {lien_suivi}\n\n🎁 *Avantage Membre L&Lui Stars :*\nEn tant que membre {niveau_fidelite}, vous bénéficiez de {reduction_boutique} sur toute notre boutique en ligne.\n🛍️ Commander sur la boutique : http://l-et-lui-signature.com\n\nÀ très vite sous le soleil de Kribi !\nL'équipe L&Lui Signature 🌺`,
}

export async function getWhatsAppTemplates() {
  const doc = await db.collection('settings').doc('whatsappTemplates').get()
  if (!doc.exists) return DEFAULT_TEMPLATES
  return { ...DEFAULT_TEMPLATES, ...doc.data() }
}

export async function saveWhatsAppTemplates(templates: {
  template1_proposal: string
  template2_payment: string
  template3_confirmation: string
  template4_fiche: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection('settings').doc('whatsappTemplates').set({
      ...templates,
      updated_at: new Date().toISOString(),
    })
    revalidatePath('/admin/templates')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

