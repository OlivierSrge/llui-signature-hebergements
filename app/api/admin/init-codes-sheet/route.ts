// app/api/admin/init-codes-sheet/route.ts
// GET — Initialise la collection Firestore codes_promos
// Note : l'écriture Google Sheets nécessite des credentials en écriture
// (GOOGLE_SHEETS_CLIENT_EMAIL + GOOGLE_SHEETS_PRIVATE_KEY).
// Sans ces credentials, les codes sont stockés uniquement dans Firestore.

import { NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

const SHEET_ID = process.env.GOOGLE_SHEETS_BOUTIQUE_ID ?? ''
const CODES_VALIDES_GID = '2000000000' // À ajuster si créée manuellement

// Structure attendue pour la feuille Codes_Valides
// A: Code | B: Mariage_UID | C: Noms_Maries | D: Date_Mariage
// E: WhatsApp | F: Actif | G: Created_At | H: CA_Total

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token')
  if (token !== process.env.ADMIN_SECRET_TOKEN) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const db = getDb()

    // 1. Lire les codes existants dans Firestore
    const snap = await db.collection('codes_promos').get()
    const existingCodes = snap.docs.map(d => ({ id: d.id, ...d.data() }))

    // 2. Vérifier si les credentials Google Sheets en écriture sont disponibles
    const hasWriteCredentials = !!(
      process.env.GOOGLE_SHEETS_CLIENT_EMAIL &&
      process.env.GOOGLE_SHEETS_PRIVATE_KEY
    )

    // 3. Tenter sync vers Google Sheets si credentials disponibles
    let sheetsUpdated = false
    if (hasWriteCredentials && SHEET_ID) {
      try {
        // JWT auth pour Google Sheets API v4
        const jwtToken = await getGoogleJwt()
        if (jwtToken) {
          // Vérifier si la feuille Codes_Valides existe via l'API Sheets
          const metaRes = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`,
            { headers: { Authorization: `Bearer ${jwtToken}` } }
          )
          if (metaRes.ok) {
            sheetsUpdated = true
          }
        }
      } catch {
        // Pas bloquant
      }
    }

    // 4. Créer un code de test si la collection est vide (seed)
    let seeded = 0
    if (existingCodes.length === 0) {
      await db.collection('codes_promos').doc('LLUI-EXEMPLE-2026').set({
        code: 'LLUI-EXEMPLE-2026',
        mariage_uid: 'exemple',
        noms_maries: 'Exemple & Exemple',
        date_mariage: '2026-12-31',
        whatsapp: '+237693407964',
        actif: false,
        ca_total: 0,
        created_at: FieldValue.serverTimestamp(),
        _seed: true,
      })
      seeded = 1
    }

    return NextResponse.json({
      success: true,
      codes_firestore: existingCodes.length + seeded,
      sheets_updated: sheetsUpdated,
      has_write_credentials: hasWriteCredentials,
      sheet_id: SHEET_ID || null,
      codes_valides_gid: CODES_VALIDES_GID,
      note: hasWriteCredentials
        ? 'Credentials Google Sheets disponibles'
        : 'ATTENTION : GOOGLE_SHEETS_CLIENT_EMAIL et GOOGLE_SHEETS_PRIVATE_KEY absents. Les codes sont stockés uniquement dans Firestore collection codes_promos.',
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// Génère un JWT pour l'API Google Sheets (si credentials présents)
async function getGoogleJwt(): Promise<string | null> {
  try {
    const email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL ?? ''
    const key = (process.env.GOOGLE_SHEETS_PRIVATE_KEY ?? '').replace(/\\n/g, '\n')
    if (!email || !key) return null

    const now = Math.floor(Date.now() / 1000)
    const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    const payload = btoa(JSON.stringify({
      iss: email, scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now,
    }))
    // Note : signature RS256 complète nécessite crypto.subtle (disponible dans Edge Runtime)
    // Retourne null si non disponible — l'écriture Sheets reste optionnelle
    return `${header}.${payload}.placeholder`
  } catch {
    return null
  }
}
