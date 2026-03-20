// app/api/cron/sync-boutique/route.ts
// Cron quotidien — scrape letlui-signature.netlify.app → Firestore catalogue_boutique

import { NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase'
import { load } from 'cheerio'
import { Timestamp } from 'firebase-admin/firestore'

const BOUTIQUE_URL = 'https://letlui-signature.netlify.app'

type CategorieBoutique = 'PHOTO_VIDEO' | 'DECORATION' | 'TRAITEUR' | 'MUSIQUE' | 'COORDINATION' | 'AUTRE'

interface ProduitBrut {
  id: string
  nom: string
  prix: number
  description: string
  image_url: string
  url_fiche: string
  categorie: CategorieBoutique
  source: 'BOUTIQUE'
  actif: boolean
}

function slugify(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
}

function guessCategorie(nom: string): CategorieBoutique {
  const n = nom.toLowerCase()
  if (/photo|vid[eé]o|film|drone/.test(n)) return 'PHOTO_VIDEO'
  if (/d[eé]co|fleur|bouquet|lumière/.test(n)) return 'DECORATION'
  if (/traiteur|buffet|repas|cocktail/.test(n)) return 'TRAITEUR'
  if (/musique|dj|groupe|chorale|orchestre/.test(n)) return 'MUSIQUE'
  if (/coord|wedding|planner|organisation/.test(n)) return 'COORDINATION'
  return 'AUTRE'
}

function parsePrix(txt: string): number {
  const m = txt.replace(/[\s\u00a0]/g, '').match(/\d[\d,.]*/)
  if (!m) return 0
  return parseInt(m[0].replace(/[.,]/g, '').slice(0, 9), 10) || 0
}

function resolveUrl(href: string): string {
  if (!href) return ''
  if (href.startsWith('http')) return href
  return BOUTIQUE_URL + (href.startsWith('/') ? '' : '/') + href
}

async function scrapeProducts(): Promise<ProduitBrut[]> {
  const res = await fetch(BOUTIQUE_URL, { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  const $ = load(html)
  const produits: ProduitBrut[] = []
  const vus = new Set<string>()

  // Sélecteurs produits (du plus précis au plus large)
  const selectors = [
    '.product', '.product-item', '[class*="product"]',
    '.item', 'article', '.card',
  ]

  for (const sel of selectors) {
    if ($(sel).length === 0) continue
    $(sel).each((_, el) => {
      const nom = (
        $(el).find('h2,h3,h4,.product-title,.product-name,[class*="title"],[class*="name"]').first().text()
        || $(el).find('a').first().text()
      ).trim()
      if (!nom || nom.length < 3) return
      const id = slugify(nom)
      if (!id || vus.has(id)) return
      vus.add(id)

      const prixEl = $(el).find('[class*="price"],[class*="prix"]').first()
      const prix = parsePrix(prixEl.text() || $(el).find('span,p').filter((_, e) => /\d+/.test($(e).text())).first().text())

      const description = $(el).find('.description,[class*="desc"],p').not('[class*="price"]').first().text().trim().slice(0, 200)

      const imgEl = $(el).find('img').first()
      const image_url = resolveUrl(imgEl.attr('src') || imgEl.attr('data-src') || '')

      const href = $(el).find('a[href]').first().attr('href') || ''
      const url_fiche = resolveUrl(href)

      produits.push({ id, nom, prix, description, image_url, url_fiche, categorie: guessCategorie(nom), source: 'BOUTIQUE', actif: true })
    })
    if (produits.length > 0) break
  }

  // Fallback: liens de page produits
  if (produits.length === 0) {
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || ''
      const nom = $(el).text().trim()
      if (!nom || nom.length < 5 || !/produit|product|shop|boutique/i.test(href)) return
      const id = slugify(nom)
      if (!id || vus.has(id)) return
      vus.add(id)
      produits.push({ id, nom, prix: 0, description: '', image_url: '', url_fiche: resolveUrl(href), categorie: guessCategorie(nom), source: 'BOUTIQUE', actif: true })
    })
  }

  return produits
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const produits = await scrapeProducts()

    if (produits.length === 0) {
      console.error('[sync-boutique] fallback', { url: BOUTIQUE_URL, timestamp: new Date().toISOString() })
      return NextResponse.json({ synced: 0, fallback: true, errors: ['Aucun produit extrait'] })
    }

    const db = getDb()
    const col = db.collection('catalogue_boutique')
    const now = Timestamp.now()

    // Marquer tous les existants inactifs
    const existing = await col.where('source', '==', 'BOUTIQUE').get()
    const b1 = db.batch()
    existing.docs.forEach(d => b1.update(d.ref, { actif: false }))
    await b1.commit()

    // Écrire (upsert)
    const b2 = db.batch()
    for (const p of produits) {
      b2.set(col.doc(p.id), { ...p, synced_at: now }, { merge: true })
    }
    await b2.commit()

    const updated = existing.docs.filter(d => produits.some(p => p.id === d.id)).length
    return NextResponse.json({ synced: produits.length, updated, errors: [] })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    console.error('[sync-boutique] erreur', { error: msg, url: BOUTIQUE_URL, timestamp: new Date().toISOString() })
    return NextResponse.json({ synced: 0, fallback: true, errors: [msg] })
  }
}
