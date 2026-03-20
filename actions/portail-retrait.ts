'use server'
// actions/portail-retrait.ts — Demande de retrait portail

import { cookies } from 'next/headers'
import { demanderRetrait } from '@/lib/walletsService'

export async function soumettreRetrait(
  montant: number,
  telephone_om: string,
  wallet_type: 'cash' | 'credits_services'
): Promise<{ success: boolean; demande_id?: string; error?: string }> {
  try {
    const uid = cookies().get('portail_uid')?.value
    if (!uid) return { success: false, error: 'Non connecté' }
    if (montant < 5_000) return { success: false, error: 'Montant minimum : 5 000 FCFA' }
    if (!/^\+237[0-9]{9}$/.test(telephone_om.replace(/\s/g, '')))
      return { success: false, error: 'Format requis : +237XXXXXXXXX' }
    const demande_id = await demanderRetrait(uid, montant, telephone_om.replace(/\s/g, ''), wallet_type)
    return { success: true, demande_id }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur serveur' }
  }
}
