// app/api/cron/sync-boutique/route.ts
// GET — Sync catalogue + commandes depuis Google Sheets → Firestore

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

// ÉTAPE B — Sync commandes (GID=1138952486)
// Colonnes: A=Date B=Client_Nom C=Client_Tel D=Client_Email E=Produit
//           F=Prix_Original G=Code_U H=Affili I=Reduction J=Montant_Final L=Statut M=Notes
async function syncCommandes(sheetId: string): Promise<number> {
  const db = getDb()
  const rows = await fetchCSV(sheetId, GID_COMMANDES)
  if (rows.length < 2) return 0

  let synced = 0
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i]
    const date       = cols[0] || ''
    const clientNom  = cols[1] || ''
    const clientTel  = cols[2] || ''
    const produit    = cols[4] || ''
    const codeU      = cols[6]?.trim().toUpperCase() || ''
    const montant    = parseFloat(cols[9]?.replace(/[^\d.]/g, '') || '0') || 0
    const statut     = cols[11]?.trim().toUpperCase() || ''
    const notes      = cols[12] || ''

    if (!codeU || !['CONFIRMÉ', 'CONFIRMEE', 'CONFIRMÉ', 'PAYÉ', 'PAYEE', 'PAYÉ', 'OK'].includes(statut)) continue
    if (montant <= 0) continue

    // Trouver mariage_uid via codes_promos
    const codeDoc = await db.collection('codes_promos').doc(codeU).get()
    if (!codeDoc.exists) continue
    const mariageUid: string = codeDoc.data()?.mariage_uid || ''
    if (!mariageUid) continue

    // ID idempotent basé sur date + tel + produit
    const txId = [date, clientTel, produit, montant]
      .join('_').replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 60)

    const txRef = db.collection('portail_users').doc(mariageUid)
      .collection('transactions').doc(txId)
    const txSnap = await txRef.get()
    if (txSnap.exists) continue // déjà importée

    // Créer transaction
    await txRef.set({
      id: txId, type: 'BOUTIQUE', source: 'sheets_commandes',
      status: 'COMPLETED', amount_ht: montant,
      code_promo: codeU, client_nom: clientNom, client_tel: clientTel,
      produit, notes,
      created_at: FieldValue.serverTimestamp(),
      date_commande: date,
    })

    // Update ca_total du code promo
    await db.collection('codes_promos').doc(codeU).update({
      ca_total: FieldValue.increment(montant),
    })

    // Update rev_lifetime du marié (1 REV = 10 000 FCFA)
    const rev = Math.floor(montant / 10000)
    if (rev > 0) {
      await db.collection('portail_users').doc(mariageUid).update({
        rev_lifetime: FieldValue.increment(rev),
      })
    }

    synced++
  }
  return synced
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
    const [produitsSynced, commandesSynced] = await Promise.all([
      syncCatalogue(SHEET_ID).catch(() => 0),
      syncCommandes(SHEET_ID).catch(() => 0),
    ])
    return NextResponse.json({
      success: true,
      produits_synced: produitsSynced,
      commandes_synced: commandesSynced,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[sync-boutique] erreur:', msg)
    return NextResponse.json({ success: false, error: msg })
  }
}
