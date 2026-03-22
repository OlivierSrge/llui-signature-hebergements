// lib/syncBoutique.ts
// Logique de synchronisation commandes Google Sheets → Firestore
// Partagée entre /api/cron/sync-boutique et /api/admin/sync-maintenant

import { getDb } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'
import { sendWhatsApp } from '@/lib/whatsappNotif'

const GID_COMMANDES = '1138952486'

function parseCSVRow(line: string): string[] {
  const cols: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') { inQ = !inQ }
    else if (c === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
    else cur += c
  }
  cols.push(cur.trim())
  return cols
}

async function fetchCSV(sheetId: string, gid: string): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`Sheet ${gid} inaccessible (${res.status})`)
  const text = await res.text()
  const lines = text.split('\n').filter(l => l.trim())
  return lines.map(parseCSVRow)
}

export interface CommandeSyncResult {
  synced: number
  details: Record<string, { noms_maries: string; nb_commandes: number; montant_total: number; cagnotte_cash_ajoute: number }>
}

// Sync commandes (GID=1138952486) → root collection "transactions"
// Colonnes: A=Date B=Client_Nom C=Client_Tel D=Client_Email E=Produit
//           F=Prix_Original G=Code_U H=Affili I=Reduction J=Montant_Final L=Statut M=Notes
export async function syncCommandes(sheetId: string): Promise<CommandeSyncResult> {
  const db = getDb()
  const rows = await fetchCSV(sheetId, GID_COMMANDES)
  if (rows.length < 2) return { synced: 0, details: {} }

  let synced = 0
  const details: Record<string, { noms_maries: string; nb_commandes: number; montant_total: number; cagnotte_cash_ajoute: number }> = {}

  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i]
    const date         = cols[0]?.trim() || ''
    const clientNom    = cols[1]?.trim() || ''
    const clientTel    = cols[2]?.trim() || ''
    const clientEmail  = cols[3]?.trim() || ''
    const produit      = cols[4]?.trim() || ''
    const prixOriginal = parseFloat(cols[5]?.replace(/[^\d.]/g, '') || '0') || 0
    const codeU        = cols[6]?.trim().toUpperCase() || ''
    // cols[7] = Affili — ignoré
    const reduction    = parseFloat(cols[8]?.replace(/[^\d.]/g, '') || '0') || 0
    const montantFinal = parseFloat(cols[9]?.replace(/[^\d.]/g, '') || '0') || 0
    // cols[10] = col K — vide/ignoré
    const statut       = cols[11]?.trim() || ''
    const notes        = cols[12]?.trim() || ''

    if (!codeU || montantFinal <= 0) continue

    // Résoudre marie_uid depuis codes_promos
    const codeDoc = await db.collection('codes_promos').doc(codeU).get()
    if (!codeDoc.exists) continue
    const mariageUid = (codeDoc.data()?.mariage_uid as string) || ''
    const nomsMaries = (codeDoc.data()?.noms_maries as string) || mariageUid
    if (!mariageUid) continue

    // ID idempotent basé sur date + tel + produit + montant
    const txId = [date, clientTel, produit, montantFinal]
      .join('_').replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 60)

    // Vérifier si déjà importé dans root transactions
    const txRef = db.collection('transactions').doc(txId)
    const txSnap = await txRef.get()
    if (txSnap.exists) continue

    // Calcul commissions
    const revGeneres      = Math.floor(montantFinal / 10000)
    const cagnotteCash    = Math.round(revGeneres * 0.70 * 10000)
    const cagnotteCredits = Math.round(revGeneres * 0.30 * 10000)

    // Écrire dans root transactions (jamais dans Google Sheets)
    await txRef.set({
      type: 'BOUTIQUE',
      marie_uid: mariageUid,
      marie_code: codeU,
      date,
      client_nom: clientNom,
      client_tel: clientTel,
      client_email: clientEmail,
      produit,
      prix_original: prixOriginal,
      reduction,
      montant_final: montantFinal,
      statut,
      notes,
      rev_generes: revGeneres,
      cagnotte_cash: cagnotteCash,
      cagnotte_credits: cagnotteCredits,
      synced_at: FieldValue.serverTimestamp(),
    })

    // Créditer les wallets du marié
    const walletUpdate: Record<string, unknown> = {}
    if (cagnotteCash > 0)    walletUpdate['wallets.cash']             = FieldValue.increment(cagnotteCash)
    if (cagnotteCredits > 0) walletUpdate['wallets.credits_services'] = FieldValue.increment(cagnotteCredits)
    if (revGeneres > 0)      walletUpdate['rev_lifetime']             = FieldValue.increment(revGeneres)
    if (Object.keys(walletUpdate).length > 0) {
      await db.collection('portail_users').doc(mariageUid).update(walletUpdate)
    }

    // Update ca_total du code promo
    await db.collection('codes_promos').doc(codeU).update({
      ca_total: FieldValue.increment(montantFinal),
    })

    // Rapport
    if (!details[mariageUid]) details[mariageUid] = { noms_maries: nomsMaries, nb_commandes: 0, montant_total: 0, cagnotte_cash_ajoute: 0 }
    details[mariageUid].nb_commandes++
    details[mariageUid].montant_total += montantFinal
    details[mariageUid].cagnotte_cash_ajoute += cagnotteCash
    synced++
  }

  // Notifications WhatsApp cagnotte après sync complète
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://llui-signature-hebergements.vercel.app'
  for (const [marieUid, d] of Object.entries(details)) {
    if (d.cagnotte_cash_ajoute <= 0) continue
    try {
      // Lire le numéro WhatsApp et le nouveau total de cagnotte
      const marieSnap = await getDb().collection('portail_users').doc(marieUid).get()
      if (!marieSnap.exists) continue
      const marieData = marieSnap.data()!
      const tel = (marieData.whatsapp as string) || ''
      if (!tel) continue
      const nouvCagnotte = (marieData.wallets?.cash as number) ?? 0
      const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n))
      const msg = `🎉 Bonne nouvelle ${d.noms_maries} !\nVotre cagnotte L&Lui vient de s'enrichir de ${fmt(d.cagnotte_cash_ajoute)} FCFA grâce à un achat invité.\n💰 Total cagnotte : ${fmt(nouvCagnotte)} FCFA\nConnectez-vous pour voir le détail :\n${appUrl}/portail`
      await sendWhatsApp(tel, msg).catch(() => {})
    } catch { /* best-effort */ }
  }

  return { synced, details }
}
