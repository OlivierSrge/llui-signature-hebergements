'use server'

import { db } from '@/lib/firebase'
import { revalidatePath } from 'next/cache'

const DEFAULT_TEMPLATES = {
  template1_proposal: `Bonjour {nom_client} 👋\n\nVoici notre proposition pour votre séjour :\n🏡 *{produit}*\n📅 Dates : {dates}\n👥 Personnes : {personnes}\n💰 Total : *{montant} FCFA*\n\n⚠️ Cette réservation est soumise à confirmation après paiement.\n\n📍 Suivi en temps réel : {lien_suivi}\n\nCordialement,\nL&Lui Signature`,
  template2_payment: `Bonjour {nom_client},\n\nMerci pour votre intérêt ! Pour finaliser votre réservation *{code_reservation}*, veuillez effectuer le paiement via Orange Money :\n\n📱 Numéro : *{numero_paiement}*\n💰 Montant exact : *{montant} FCFA*\n📝 Objet : {code_reservation}\n\nUne fois le paiement effectué, envoyez-nous la capture d'écran.\n\nL&Lui Signature`,
  template3_confirmation: `✅ *Paiement confirmé !*\n\nBonjour {nom_client},\n\nNous avons bien reçu votre paiement pour la réservation *{code_reservation}*.\n\nVotre séjour est désormais *officiellement confirmé* ! Vous recevrez votre fiche d'accueil et QR Code sous peu.\n\nL&Lui Signature`,
  template4_fiche: `🏡 *Fiche d'accueil — L&Lui Signature*\n\nBonjour {nom_client},\n\n*{produit}*\n📅 Arrivée : {dates}\n👥 {personnes} personne(s)\n🎫 Code : *{code_reservation}*\n\nVotre QR Code ci-joint valide votre arrivée sur place.\n\n📍 Suivi : {lien_suivi}\n\nExcellent séjour !\nL&Lui Signature`,
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

export function previewTemplate(template: string, vars: Record<string, string> = {}): string {
  const defaults: Record<string, string> = {
    nom_client: 'Jean Dupont',
    produit: 'Villa Bord de Mer — Kribi',
    dates: '15/03/2026 → 20/03/2026 (5 nuits)',
    personnes: '4',
    montant: '350 000',
    code_reservation: 'LLS-2026-AB12C',
    numero_paiement: '693407964',
    partenaire: 'L&Lui Signature',
    lien_suivi: 'https://llui-signature.cm/suivi/abc123',
  }
  const merged = { ...defaults, ...vars }
  return template
    .replace(/\{nom_client\}/g, merged.nom_client)
    .replace(/\{produit\}/g, merged.produit)
    .replace(/\{dates\}/g, merged.dates)
    .replace(/\{personnes\}/g, merged.personnes)
    .replace(/\{montant\}/g, merged.montant)
    .replace(/\{code_reservation\}/g, merged.code_reservation)
    .replace(/\{numero_paiement\}/g, merged.numero_paiement)
    .replace(/\{partenaire\}/g, merged.partenaire)
    .replace(/\{lien_suivi\}/g, merged.lien_suivi)
}
