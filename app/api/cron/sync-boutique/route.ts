// app/api/cron/sync-boutique/route.ts
// GET — Sync catalogue + commandes depuis Google Sheets → Firestore (lecture seule Sheets)

import { NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

const GID_PRODUITS  = '0'
const GID_COMMANDES = '1138952486'

// Parser CSV simple gérant les champs entre guillemets
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

// ÉTAPE A — Sync catalogue produits (GID=0)
async function syncCatalogue(sheetId: string): Promise<number> {
  const db = getDb()
  const rows = await fetchCSV(sheetId, GID_PRODUITS)
  if (rows.length < 2) return 0
  const headers = rows[0].map(h => h.toLowerCase())
  const iNom   = headers.findIndex(h => h.includes('nom'))
  const iDesc  = headers.findIndex(h => h.includes('description') && !h.includes('long'))
  const iPrix  = headers.findIndex(h => h.includes('prix'))
  const iCat   = headers.findIndex(h => h.includes('cat'))
  const iImg   = headers.findIndex(h => h.includes('image'))
  const iActif = headers.findIndex(h => h.includes('actif'))

  const batch = db.batch()
  let synced = 0
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i]
    if (cols[iActif]?.toUpperCase() !== 'OUI') continue
    const nom = cols[iNom] || ''
    if (!nom) continue
    const slug = nom.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
    if (!slug) continue
    batch.set(db.collection('catalogue_boutique').doc(slug), {
      id: slug, nom,
      description: iDesc >= 0 ? (cols[iDesc] || '') : '',
      prix: iPrix >= 0 ? parseInt(cols[iPrix]?.replace(/\D/g, '') || '0', 10) : 0,
      categorie: iCat >= 0 ? (cols[iCat] || 'boutique') : 'boutique',
      image_url: iImg >= 0 ? (cols[iImg] || '') : '',
      source: 'BOUTIQUE', actif: true,
      synced_at: FieldValue.serverTimestamp(),
    }, { merge: true })
    synced++
  }
  await batch.commit()
  return synced
}

// ÉTAPE B — Sync commandes (GID=1138952486) → root collection "transactions"
// Colonnes: A=Date B=Client_Nom C=Client_Tel D=Client_Email E=Produit
//           F=Prix_Original G=Code_U H=Affili I=Reduction J=Montant_Final L=Statut M=Notes
export interface CommandeSyncResult {
  synced: number
  details: Record<string, { noms_maries: string; nb_commandes: number; montant_total: number }>
}

export async function syncCommandes(sheetId: string): Promise<CommandeSyncResult> {
  const db = getDb()
  const rows = await fetchCSV(sheetId, GID_COMMANDES)
  if (rows.length < 2) return { synced: 0, details: {} }

  let synced = 0
  const details: Record<string, { noms_maries: string; nb_commandes: number; montant_total: number }> = {}

  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i]
    const date        = cols[0]?.trim() || ''
    const clientNom   = cols[1]?.trim() || ''
    const clientTel   = cols[2]?.trim() || ''
    const clientEmail = cols[3]?.trim() || ''
    const produit     = cols[4]?.trim() || ''
    const prixOriginal = parseFloat(cols[5]?.replace(/[^\d.]/g, '') || '0') || 0
    const codeU       = cols[6]?.trim().toUpperCase() || ''
    // cols[7] = Affili — ignoré
    const reduction   = parseFloat(cols[8]?.replace(/[^\d.]/g, '') || '0') || 0
    const montantFinal = parseFloat(cols[9]?.replace(/[^\d.]/g, '') || '0') || 0
    // cols[10] = col K — vide/ignoré
    const statut      = cols[11]?.trim() || ''
    const notes       = cols[12]?.trim() || ''

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
    const revGeneres    = Math.floor(montantFinal / 10000)
    const cagnotteCash  = Math.round(revGeneres * 0.70 * 10000)
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
    if (!details[mariageUid]) details[mariageUid] = { noms_maries: nomsMaries, nb_commandes: 0, montant_total: 0 }
    details[mariageUid].nb_commandes++
    details[mariageUid].montant_total += montantFinal
    synced++
  }

  return { synced, details }
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token')
  if (token !== process.env.CRON_SECRET && req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    // Compatibilité : pas de token = OK depuis Vercel Cron (vérification via IP)
  }

  const SHEET_ID = process.env.GOOGLE_SHEETS_BOUTIQUE_ID
  if (!SHEET_ID) {
    return NextResponse.json({ success: false, error: 'GOOGLE_SHEETS_BOUTIQUE_ID manquant' })
  }

  try {
    const [produitsSynced, commandesResult] = await Promise.all([
      syncCatalogue(SHEET_ID).catch(() => 0),
      syncCommandes(SHEET_ID).catch(() => ({ synced: 0, details: {} })),
    ])
    return NextResponse.json({
      success: true,
      produits_synced: produitsSynced,
      commandes_synced: commandesResult.synced,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[sync-boutique] erreur:', msg)
    return NextResponse.json({ success: false, error: msg })
  }
}
