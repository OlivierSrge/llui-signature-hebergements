#!/usr/bin/env node
// scripts/init-diane-charly.js
// Initialise le document Firestore pour le mariage de Diane & Charly
// Collection : portail_users / mariage_diane_charly_2026
//
// Usage : node scripts/init-diane-charly.js

const admin = require('firebase-admin')
const path = require('path')

try { require('dotenv').config({ path: path.resolve('.env.local') }) } catch { /* optional */ }

if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    admin.initializeApp({ credential: admin.credential.cert(sa) })
  } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    })
  } else {
    console.error('❌ Variables Firebase manquantes. Vérifiez .env.local')
    process.exit(1)
  }
}

const db = admin.firestore()

const DOC_ID = 'mariage_diane_charly_2026'

const data = {
  // Identité
  uid: DOC_ID,
  role: 'MARIÉ',
  noms_maries: 'Diane & Charly',
  code_promo: 'LLUI-DC-2026',
  statut: 'actif',

  // Événement
  date_mariage: '2026-12-19',
  lieu: 'Kribi, Cameroun',
  adresse_exacte: 'Plage de Kribi, face à l\'Atlantique, Kribi',
  coordinates: { lat: 2.9396, lng: 9.9086 },
  google_maps_url: 'https://maps.google.com/?q=2.9396,9.9086',
  plans_acces_url: 'https://maps.google.com/maps/dir/?api=1&destination=2.9396,9.9086',

  // Thème graphique couple
  theme: {
    principal: '#1B4F72',    // bleu océan profond
    secondaire: '#85C1E9',   // bleu ciel
    accent: '#C9A84C',       // champagne doré
    texte: '#0D2137',        // marine foncé
    fond: '#F0F8FF',         // blanc océan
    nom: 'ocean',
  },

  // Programme de la journée
  programme: [
    {
      heure: '10h00',
      titre: 'Cérémonie civile',
      description: 'En présence du maire et des familles',
      icone: '⚖️',
    },
    {
      heure: '12h30',
      titre: 'Cérémonie religieuse',
      description: 'Échange des vœux, face à l\'Atlantique',
      icone: '💍',
    },
    {
      heure: '15h00',
      titre: 'Cocktail & séance photo',
      description: 'Sur la plage, pieds dans le sable',
      icone: '🥂',
    },
    {
      heure: '18h00',
      titre: 'Dîner de gala',
      description: 'Gastronomie locale sous les étoiles',
      icone: '🍽️',
    },
    {
      heure: '21h00',
      titre: 'Soirée & première danse',
      description: 'Musique live, danse, joie partagée',
      icone: '✨',
    },
    {
      heure: '23h00',
      titre: 'Feux d\'artifice',
      description: 'Depuis le bord de mer',
      icone: '🎆',
    },
  ],

  // Message personnel des mariés
  message_faire_part: 'Notre amour méritait l\'Atlantique comme témoin. Nous avons choisi Kribi, là où les vagues murmurent les promesses que nous nous faisons. Venez célébrer avec nous ce jour qui nous appartient, à vous et à nous.',

  // Hébergements suggérés (visibles sur la page faire-part)
  hebergements_visibles: true,
  hebergements: [
    {
      nom: 'Hôtel Ilomba',
      type: 'Hôtel de charme',
      description: 'Vue mer, piscine, à 200m de la plage de cérémonie',
      telephone: '+237 690 000 001',
      prix_indicatif: '45 000 FCFA / nuit',
      maps_url: 'https://maps.google.com/?q=Kribi+Ilomba',
    },
    {
      nom: 'Résidence Les Bougainvilliers',
      type: 'Résidence de standing',
      description: 'Appartements climatisés, cuisine équipée, jardins tropicaux',
      telephone: '+237 690 000 002',
      prix_indicatif: '35 000 FCFA / nuit',
      maps_url: 'https://maps.google.com/?q=Kribi+Bougainvilliers',
    },
    {
      nom: 'Beach Lodge Kribi',
      type: 'Lodge pieds dans l\'eau',
      description: 'Bungalows sur pilotis, accès direct plage privée',
      telephone: '+237 690 000 003',
      prix_indicatif: '60 000 FCFA / nuit',
      maps_url: 'https://maps.google.com/?q=Kribi+Beach+Lodge',
    },
  ],
  contact_hebergements_whatsapp: '+237699000000', // Numéro Olivier

  // RSVP config
  rsvp_ouvert: true,
  rsvp_max_accompagnants: 3,
  rsvp_date_limite: '2026-11-30',

  // Métadonnées
  created_at: admin.firestore.FieldValue.serverTimestamp(),
  updated_at: admin.firestore.FieldValue.serverTimestamp(),
  created_by: 'init-diane-charly.js',
}

async function main() {
  console.log(`\n🌊 Initialisation mariage Diane & Charly`)
  console.log(`📋 Document : portail_users/${DOC_ID}\n`)

  const ref = db.collection('portail_users').doc(DOC_ID)
  const snap = await ref.get()

  if (snap.exists) {
    console.log('⚠️  Document existant — mise à jour (merge)...')
    await ref.set(data, { merge: true })
    console.log('✅ Mis à jour avec succès')
  } else {
    console.log('✨ Nouveau document — création...')
    await ref.set(data)
    console.log('✅ Créé avec succès')
  }

  console.log('\n📊 Données poussées :')
  console.log(`   Mariés      : ${data.noms_maries}`)
  console.log(`   Date        : ${data.date_mariage}`)
  console.log(`   Lieu        : ${data.lieu}`)
  console.log(`   Code promo  : ${data.code_promo}`)
  console.log(`   Programme   : ${data.programme.length} étapes`)
  console.log(`   Hébergements: ${data.hebergements.length}`)
  console.log(`   Thème       : ${data.theme.nom} (${data.theme.principal})`)
  console.log('\n🎉 Fait ! La page /faire-part/mariage_diane_charly_2026 est prête.\n')

  process.exit(0)
}

main().catch(err => {
  console.error('❌ Erreur :', err.message)
  process.exit(1)
})
