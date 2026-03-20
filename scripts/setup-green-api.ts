#!/usr/bin/env npx ts-node
// scripts/setup-green-api.ts
// Configuration automatique Green API pour L&Lui Signature
// Usage : npx ts-node scripts/setup-green-api.ts

import * as readline from 'readline'
import * as fs from 'fs'
import * as path from 'path'

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (q: string): Promise<string> => new Promise(res => rl.question(q, res))

async function testConnection(instanceId: string, token: string): Promise<boolean> {
  console.log('\n⏳ Test de connexion en cours…')
  try {
    const ctrl = new AbortController()
    const tid = setTimeout(() => ctrl.abort(), 8000)
    const res = await fetch(
      `https://api.green-api.com/waInstance${instanceId}/getStateInstance/${token}`,
      { signal: ctrl.signal }
    ).finally(() => clearTimeout(tid))
    if (!res.ok) {
      console.error(`❌ HTTP ${res.status} — vérifiez vos credentials`)
      return false
    }
    const json = await res.json() as { stateInstance?: string }
    if (json.stateInstance === 'authorized') {
      console.log('✅ Instance connectée — WhatsApp actif')
      return true
    }
    console.error(`❌ Instance non autorisée (état : ${json.stateInstance ?? 'inconnu'})`)
    console.error('   → Scannez le QR code depuis le Dashboard Green API')
    return false
  } catch (e) {
    console.error('❌ Erreur réseau :', e)
    return false
  }
}

async function main() {
  console.log(`
════════════════════════════════════════════════
  CONFIGURATION GREEN API — 3 étapes
════════════════════════════════════════════════

Étape 1 : Créer un compte GRATUIT sur
  https://console.green-api.com/register

Étape 2 : Créer une instance WhatsApp
  → Dashboard → "Create Instance" → "Developer"
  → Scanner le QR code avec votre WhatsApp
    (+237 693 407 964)

Étape 3 : Copier vos credentials :
  → Instance ID  (ex: 1101234567)
  → API Token    (ex: abcdef123456...)

Entrez vos credentials ci-dessous :
`)

  const instanceId = (await question('GREEN_API_INSTANCE_ID = ')).trim()
  const token = (await question('GREEN_API_TOKEN       = ')).trim()

  if (!instanceId || !token) {
    console.error('\n❌ Credentials vides — abandon')
    rl.close()
    process.exit(1)
  }

  const ok = await testConnection(instanceId, token)

  if (ok) {
    // Mettre à jour .env.local
    const envPath = path.join(process.cwd(), '.env.local')
    let content = ''
    try { content = fs.readFileSync(envPath, 'utf-8') } catch { /* nouveau fichier */ }

    const setVar = (src: string, key: string, value: string): string => {
      const regex = new RegExp(`^${key}=.*$`, 'm')
      return regex.test(src)
        ? src.replace(regex, `${key}=${value}`)
        : src + (src.endsWith('\n') ? '' : '\n') + `${key}=${value}\n`
    }

    content = setVar(content, 'GREEN_API_INSTANCE_ID', instanceId)
    content = setVar(content, 'GREEN_API_TOKEN', token)
    fs.writeFileSync(envPath, content)
    console.log(`\n✅ .env.local mis à jour`)
  }

  console.log(`
════════════════════════════════════════════════
  VARIABLES À AJOUTER DANS VERCEL
  Settings → Environment Variables
════════════════════════════════════════════════

  GREEN_API_INSTANCE_ID = ${instanceId}
  GREEN_API_TOKEN       = ${token}

  Également requises si pas encore configurées :
  ADMIN_PHONE_NUMBER    = +237693407964
  NEXT_PUBLIC_APP_URL   = https://llui-signature-hebergements.vercel.app

════════════════════════════════════════════════
  TEST MANUEL (une fois déployé sur Vercel)
════════════════════════════════════════════════

  GET /api/cron/rapport-hebdo
  → doit retourner { success: true }

  POST /api/portail/notif-whatsapp
  Body : { "uid": "[votre-uid]", "type": "BIENVENUE", "data": {} }
  → doit retourner { ok: true }

════════════════════════════════════════════════
${ok ? '✅ CONFIGURATION TERMINÉE' : '⚠️  Configurez les variables manuellement dans Vercel'}
`)

  rl.close()
}

main().catch(e => { console.error(e); process.exit(1) })
