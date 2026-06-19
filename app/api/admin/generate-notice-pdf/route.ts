import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getStorageBucket } from '@/lib/firebase'
import { saveDocumentMeta } from '@/actions/documents'
import type { DocKey } from '@/actions/documents'

const ALLOWED_KEYS: DocKey[] = ['notice_partenaire', 'notice_client', 'notice_administrateur']

const KEY_TO_PATH: Record<DocKey, string> = {
  notice_partenaire: '/help/partenaire',
  notice_client: '/help/client',
  notice_administrateur: '/help/admin',
}

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  if (cookieStore.get('admin_session')?.value !== 'authenticated') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { key } = await req.json() as { key?: DocKey }
  if (!key || !ALLOWED_KEYS.includes(key)) {
    return NextResponse.json({ error: 'Clé invalide' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const pageUrl = `${appUrl}${KEY_TO_PATH[key]}`

  let browser: any
  try {
    // Chromium : prod Vercel via @sparticuz/chromium, dev via Chrome système
    const puppeteer = await import('puppeteer-core')

    let executablePath: string
    if (process.env.NODE_ENV === 'production') {
      const chromium = (await import('@sparticuz/chromium')).default
      executablePath = await chromium.executablePath()
    } else {
      // macOS — adapter si besoin
      const candidates = [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
      ]
      const fs = await import('fs')
      executablePath = candidates.find((p) => fs.existsSync(p)) ?? candidates[0]
    }

    browser = await puppeteer.default.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 1200, height: 900 })

    // Ajouter cookie admin pour les pages protégées si nécessaire
    await page.goto(pageUrl, { waitUntil: 'networkidle0', timeout: 30_000 })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
    })

    await browser.close()
    browser = null

    // Upload Firebase Storage
    const filename = `documents/notices/${key}.pdf`
    const bucket = getStorageBucket()
    const fileRef = bucket.file(filename)

    await fileRef.save(Buffer.from(pdfBuffer), {
      metadata: {
        contentType: 'application/pdf',
        cacheControl: 'public, max-age=3600',
      },
    })

    try {
      await fileRef.makePublic()
    } catch {
      // UAC bucket — ignore
    }

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`
    await saveDocumentMeta(key, publicUrl, pdfBuffer.byteLength)

    return NextResponse.json({ url: publicUrl })
  } catch (err: any) {
    if (browser) {
      try { await browser.close() } catch { /* ignore */ }
    }
    console.error('[generate-notice-pdf]', err)
    return NextResponse.json({ error: err.message ?? 'Erreur génération PDF' }, { status: 500 })
  }
}
