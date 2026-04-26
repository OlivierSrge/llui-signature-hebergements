// app/stars/notice/page.tsx — Notice du programme L&Lui Stars

import Link from 'next/link'

export const metadata = {
  title: 'Programme L&Lui Stars — Règles & Avantages',
  description: 'Découvrez comment fonctionne le programme de fidélité L&Lui Stars à Kribi.',
}

const GRADES = [
  {
    grade: 'START',
    emoji: '🌟',
    label: 'Membre',
    seuil: '0 Stars',
    remise: '2%',
    color: '#888888',
    bg: '#F5F0E8',
    text: '#1A1A1A',
  },
  {
    grade: 'BRONZE',
    emoji: '🥉',
    label: 'Bronze',
    seuil: '100 Stars',
    remise: '4%',
    color: '#CD7F32',
    bg: '#FFF5EC',
    text: '#3D1A00',
  },
  {
    grade: 'ARGENT',
    emoji: '🥈',
    label: 'Argent',
    seuil: '500 Stars',
    remise: '6%',
    color: '#A8A9AD',
    bg: '#F5F5F5',
    text: '#1A1A1A',
  },
  {
    grade: 'OR',
    emoji: '✦',
    label: 'Or',
    seuil: '2 000 Stars',
    remise: '8%',
    color: '#C9A84C',
    bg: '#FFFBF0',
    text: '#3D2800',
  },
  {
    grade: 'SAPHIR',
    emoji: '💎',
    label: 'Saphir',
    seuil: '5 000 Stars',
    remise: '10%',
    color: '#0F52BA',
    bg: '#F0F5FF',
    text: '#001A3D',
  },
  {
    grade: 'DIAMANT',
    emoji: '👑',
    label: 'Diamant',
    seuil: '10 000 Stars',
    remise: '15%',
    color: '#6C3483',
    bg: '#FAF5FF',
    text: '#1A1A1A',
  },
]

const ETAPES = [
  {
    num: '①',
    titre: 'Générez votre carte QR Stars',
    desc: 'Sur la page de votre code promo, saisissez votre prénom, nom et numéro WhatsApp. Votre carte personnelle s\'affiche instantanément.',
    emoji: '📱',
  },
  {
    num: '②',
    titre: 'Présentez votre QR au partenaire',
    desc: 'À la caisse, montrez votre carte QR Stars au commerçant. Il scanne avec son terminal ou son smartphone.',
    emoji: '🔍',
  },
  {
    num: '③',
    titre: 'Confirmez sur WhatsApp',
    desc: 'Vous recevez un lien WhatsApp. Cliquez pour valider la transaction et recevoir vos Stars. Valable 1 heure.',
    emoji: '✅',
  },
  {
    num: '④',
    titre: 'Montez en grade, gagnez plus',
    desc: 'Chaque visite augmente votre solde Stars. Plus vous accumulez, plus votre grade monte et vos avantages s\'améliorent.',
    emoji: '⭐',
  },
]

const REGLES = [
  'Les Stars sont valables sans limite de durée.',
  'Le QR Code personnel expire après 5 minutes (usage unique sécurisé).',
  'La remise fidélité s\'applique sur le montant de la transaction chez le partenaire.',
  'Les Stars sont créditées après confirmation de votre part via WhatsApp.',
  'Une transaction non confirmée dans l\'heure est annulée automatiquement.',
  'Les Stars ne sont pas échangeables contre de l\'argent.',
  'L\'accumulation de Stars est basée sur les montants nets après remise.',
  'L\'abus ou la fraude entraîne la suspension immédiate du compte.',
]

export default function StarsNoticePage() {
  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      {/* Header */}
      <div
        className="px-4 pt-10 pb-8 text-center"
        style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #4A0E8F 50%, #1A1A2E 100%)' }}
      >
        <p className="text-xs font-medium tracking-widest uppercase text-[#C9A84C] mb-2">
          L&Lui Signature · Kribi
        </p>
        <h1 className="text-2xl font-serif font-bold text-white mb-1">
          Programme L&amp;Lui Stars ⭐
        </h1>
        <p className="text-sm text-white/60 max-w-xs mx-auto">
          Le programme de fidélité exclusif pour les clients L&amp;Lui à Kribi
        </p>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-12 space-y-6 pt-6">

        {/* Comment ça marche */}
        <section className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-[#1A1A1A] mb-4">📋 Comment ça marche</h2>
          <div className="space-y-4">
            {ETAPES.map((e) => (
              <div key={e.num} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[#C9A84C] text-white text-sm font-bold flex items-center justify-center shrink-0">
                  {e.num}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1A1A1A]">{e.emoji} {e.titre}</p>
                  <p className="text-xs text-[#1A1A1A]/60 mt-0.5">{e.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Grades */}
        <section className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-[#1A1A1A] mb-4">🏆 Les 6 grades Stars</h2>
          <div className="space-y-2">
            {GRADES.map((g) => (
              <div
                key={g.grade}
                className="flex items-center gap-3 rounded-xl p-3"
                style={{ backgroundColor: g.bg, border: `1px solid ${g.color}33` }}
              >
                <span className="text-2xl w-8 text-center">{g.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: g.color !== '#888888' ? g.color : '#1A1A1A' }}>
                    {g.label}
                  </p>
                  <p className="text-xs text-[#1A1A1A]/50">À partir de {g.seuil}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold" style={{ color: g.color !== '#888888' ? g.color : '#1A1A1A' }}>
                    {g.remise}
                  </p>
                  <p className="text-[10px] text-[#1A1A1A]/40">de remise</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[#1A1A1A]/40 mt-3 text-center">
            * Remises minimales garanties. Certains partenaires proposent des avantages supplémentaires.
          </p>
        </section>

        {/* Avantages partenaires */}
        <section className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-[#1A1A1A] mb-3">🎁 Avantages exclusifs partenaires</h2>
          <p className="text-xs text-[#1A1A1A]/60 mb-3">
            En plus de votre remise fidélité, chaque partenaire L&amp;Lui Stars peut vous offrir
            des avantages exclusifs selon votre grade : cadeaux, services premium, accès VIP, etc.
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {['🎁 Cadeaux', '🍽️ Boissons', '🪑 Priorité', '💳 Remises', '🚗 Services', '✨ Expériences'].map((cat) => (
              <div key={cat} className="bg-[#F5F0E8]/60 rounded-xl p-2">
                <p className="text-xs text-[#1A1A1A]/60">{cat}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#C9A84C] font-semibold mt-3 text-center">
            Consultez la fiche de chaque partenaire pour voir ses avantages disponibles.
          </p>
        </section>

        {/* Règles */}
        <section className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-[#1A1A1A] mb-3">📜 Règles du programme</h2>
          <ul className="space-y-2">
            {REGLES.map((r, i) => (
              <li key={i} className="flex gap-2 text-xs text-[#1A1A1A]/70">
                <span className="text-[#C9A84C] shrink-0 mt-0.5">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Questions */}
        <section className="bg-[#1A1A1A] rounded-2xl p-5 text-center">
          <p className="text-white font-semibold text-sm mb-1">Des questions ?</p>
          <p className="text-white/50 text-xs mb-4">
            Contactez l&apos;équipe L&amp;Lui Signature via WhatsApp
          </p>
          <p className="text-[10px] text-white/30">
            L&amp;Lui Signature Hébergements · Kribi, Cameroun
          </p>
        </section>

        <div className="text-center">
          <Link href="/" className="text-xs text-[#C9A84C] hover:underline">
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  )
}
