#!/usr/bin/env node
/**
 * Génère les icônes PNG provisoires pour la PWA L&Lui
 * Fond or #C9A84C avec initiales "LL" en blanc
 */

const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
const outputDir = path.join(__dirname, '..', 'public', 'icons')

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

async function generateIcon(size) {
  const fontSize = Math.round(size * 0.38)
  const letterSpacing = Math.round(size * 0.02)

  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="#C9A84C"/>
      <text
        x="50%"
        y="54%"
        dominant-baseline="middle"
        text-anchor="middle"
        font-family="Georgia, serif"
        font-size="${fontSize}"
        font-weight="bold"
        fill="white"
        letter-spacing="${letterSpacing}"
      >LL</text>
    </svg>
  `

  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(outputDir, `icon-${size}x${size}.png`))

  console.log(`✅ icon-${size}x${size}.png`)
}

async function main() {
  console.log('Génération des icônes PWA L&Lui...\n')
  for (const size of sizes) {
    await generateIcon(size)
  }
  console.log('\n✅ Toutes les icônes générées dans public/icons/')
}

main().catch(console.error)
