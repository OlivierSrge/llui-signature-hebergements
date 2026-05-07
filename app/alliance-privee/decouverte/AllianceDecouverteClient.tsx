'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const ETAPES = [
  {
    num: '01',
    titre: 'Admission sur candidature',
    icon: '🎯',
    points: [
      'Paiement sécurisé (Revolut ou Orange Money)',
      'Portrait de Cœur à rédiger — vos valeurs, vos attentes',
      'Photos personnelles récentes',
      'Validation manuelle par notre équipe sous 48–72h',
    ],
    detail: 'Votre profil est examiné individuellement. Nous vérifions l\'authenticité de vos informations et la sincérité de votre démarche avant d\'ouvrir l\'accès.',
  },
  {
    num: '02',
    titre: 'Matching intelligent',
    icon: '💫',
    points: [
      'Vision géographique (Cameroun / Diaspora / Flexible)',
      'Niveau d\'engagement (Mariage / Relation sérieuse / …)',
      'Style de vie (Traditionnel / Moderne / Équilibre)',
      'Valeurs (Famille / Carrière / Spiritualité)',
      'Ambition (Entrepreneur / Cadre / Multiple)',
    ],
    detail: 'Notre algorithme analyse vos 5 Piliers de Vie et calcule un score de compatibilité 0–100% avec chaque membre. Seuls les profils à 40%+ vous sont présentés.',
  },
  {
    num: '03',
    titre: 'Intérêt mutuel',
    icon: '⭐',
    points: [
      'Vous marquez votre intérêt sur les profils qui vous attirent',
      'Si la personne marque aussi son intérêt : c\'est un match',
      'Le chat sécurisé s\'active automatiquement',
      'Photos révélées progressivement après le match',
    ],
    detail: 'Aucun match imposé. Vous restez maître de vos choix — mais chaque match est réciproque, ce qui garantit un premier contact de qualité.',
  },
  {
    num: '04',
    titre: 'Messagerie sécurisée',
    icon: '💬',
    points: [
      'Chat illimité avec vos matchs mutuels',
      'Sentinelle IA : détection automatique des coordonnées',
      'Pas d\'échange de numéros ou réseaux sociaux dans le chat',
      'Environnement respectueux garanti',
    ],
    detail: 'Notre Sentinelle IA analyse chaque message en temps réel et bloque automatiquement toute tentative d\'échange de coordonnées prématuré. Cela protège les deux parties.',
  },
  {
    num: '05',
    titre: 'Rendez-vous orchestré',
    icon: '🤝',
    points: [
      'Vous signalez à L&Lui votre souhait de rencontre',
      'Nos équipes proposent date, heure et lieu partenaire',
      'Coordonnées échangées seulement après confirmation des deux parties',
      'Suivi post-rendez-vous pour améliorer le service',
    ],
    detail: 'Le premier rendez-vous dans un cadre sécurisé, connu de L&Lui. Vous recevez le nom complet et le téléphone de votre match 24h avant.',
  },
]

const FORMULES = [
  {
    tier: 'PRESTIGE',
    emoji: '💎',
    label: 'Prestige',
    tagline: 'L\'essentiel pour commencer',
    duree: '6 mois',
    prix_eur: '150',
    prix_local_h: '50 000',
    prix_local_f: '10 000',
    avantages: [
      '10 intérêts actifs simultanés',
      'Chat sécurisé illimité',
      '1 rendez-vous officiel inclus',
      'Support Email (48h)',
    ],
    ideal: 'Découvrir le concept',
    recommended: false,
  },
  {
    tier: 'EXCELLENCE',
    emoji: '✨',
    label: 'Excellence',
    tagline: 'Le meilleur rapport valeur',
    duree: '12 mois',
    prix_eur: '250',
    prix_local_h: '100 000',
    prix_local_f: '25 000',
    avantages: [
      '20 intérêts actifs simultanés',
      'Chat sécurisé illimité',
      '2 rendez-vous officiels inclus',
      'Visibilité prioritaire dans les résultats',
      'Badge Excellence sur votre profil',
      'Support Email prioritaire (24h)',
    ],
    ideal: 'Recherche sérieuse',
    recommended: true,
  },
  {
    tier: 'ELITE',
    emoji: '👑',
    label: 'Élite',
    tagline: 'L\'expérience premium',
    duree: '12 mois',
    prix_eur: '500',
    prix_local_h: '200 000',
    prix_local_f: '50 000',
    avantages: [
      'Intérêts illimités',
      'Chat sécurisé illimité',
      '3 rendez-vous officiels inclus',
      'Visibilité maximale (top des résultats)',
      'Badge Élite prestigieux',
      'Support WhatsApp prioritaire',
      'Accès aux événements privés Alliance',
      'Accompagnement personnalisé',
    ],
    ideal: 'Leaders exigeants',
    recommended: false,
  },
]

const GARANTIES = [
  { icon: '🔒', titre: 'Discrétion absolue', texte: 'Vos données ne sont jamais partagées. Nom complet visible uniquement après rendez-vous validé.' },
  { icon: '✅', titre: 'Profils vérifiés', texte: 'Chaque candidature est examinée manuellement. Les faux profils sont exclus avant même l\'activation.' },
  { icon: '🛡', titre: 'Respect garanti', texte: 'La Sentinelle IA bloque automatiquement tout contenu inapproprié en temps réel.' },
  { icon: '🏆', titre: 'Qualité des rencontres', texte: 'Matchs basés sur compatibilité réelle mesurée sur 5 dimensions, pas uniquement sur des photos.' },
]

export default function AllianceDecouverteClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pid = searchParams.get('pid') ?? ''
  const gender = searchParams.get('gender') ?? ''

  function handleContinue() {
    if (!pid || !gender) return
    router.push(`/alliance-privee/tiers?pid=${pid}&gender=${gender}`)
  }

  return (
    <div className="bg-[#0A0A0A] text-white">

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[#C9A84C]/4 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto px-5 pt-16 pb-14 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#C9A84C]/25 bg-[#C9A84C]/8 text-[#C9A84C] text-xs tracking-widest uppercase mb-7">
            <span>✦</span><span>Alliance Privée</span><span>✦</span>
          </div>
          <h1
            className="text-4xl sm:text-5xl font-light text-white mb-5 leading-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Le club de rencontre<br />
            <span className="text-[#C9A84C]">le plus sélectif</span><br />
            du Cameroun
          </h1>
          <p className="text-white/50 text-base leading-relaxed max-w-xl mx-auto mb-8">
            Alliance Privée réunit la diaspora camerounaise et les élites locales dans un cercle très fermé
            où chaque rencontre est orchestrée avec discrétion et professionnalisme.
          </p>
          <p className="text-white/35 text-sm leading-relaxed max-w-lg mx-auto">
            Fini les applications impersonnelles. Ici, chaque profil est validé par un humain,
            chaque match est calculé selon vos valeurs profondes, et chaque rencontre est organisée par nos soins.
          </p>
        </div>
      </section>

      {/* ── COMMENT ÇA FONCTIONNE ────────────────────────────────── */}
      <section className="bg-[#0E0E0E] py-16">
        <div className="max-w-3xl mx-auto px-5">
          <div className="text-center mb-12">
            <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-3">Le parcours</p>
            <h2
              className="text-2xl font-light text-white"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Comment ça fonctionne
            </h2>
          </div>

          <div className="space-y-6">
            {ETAPES.map((e, i) => (
              <div
                key={e.num}
                className="flex gap-5 p-5 rounded-2xl border border-white/5 bg-[#0A0A0A] hover:border-[#C9A84C]/15 transition-colors"
              >
                {/* Numéro */}
                <div className="shrink-0 pt-0.5">
                  <div className="w-10 h-10 rounded-full border border-[#C9A84C]/20 bg-[#C9A84C]/5 flex flex-col items-center justify-center">
                    <span className="text-[#C9A84C] text-lg leading-none">{e.icon}</span>
                  </div>
                </div>
                {/* Contenu */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[#C9A84C]/40 text-[10px] font-mono tracking-widest">{e.num}</span>
                    <h3 className="text-white font-semibold text-sm">{e.titre}</h3>
                  </div>
                  <p className="text-white/40 text-xs leading-relaxed mb-3">{e.detail}</p>
                  <ul className="space-y-1">
                    {e.points.map((p, j) => (
                      <li key={j} className="flex items-start gap-2 text-xs text-white/55">
                        <span className="text-[#C9A84C]/50 mt-0.5 shrink-0">✦</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LES FORMULES ─────────────────────────────────────────── */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-5">
          <div className="text-center mb-12">
            <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-3">Tarification</p>
            <h2
              className="text-2xl font-light text-white mb-3"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Les trois formules
            </h2>
            <p className="text-white/30 text-sm">Vous choisirez votre formule à l&apos;étape suivante</p>
          </div>

          <div className="space-y-4">
            {FORMULES.map((f) => (
              <div
                key={f.tier}
                className={`relative rounded-2xl border p-6 ${
                  f.recommended
                    ? 'border-[#C9A84C]/40 bg-[#C9A84C]/4'
                    : 'border-white/8 bg-[#0E0E0E]'
                }`}
              >
                {f.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[#C9A84C] text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      Recommandé
                    </span>
                  </div>
                )}

                {/* En-tête */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{f.emoji}</span>
                      <span className={`font-semibold text-base ${f.recommended ? 'text-[#C9A84C]' : 'text-white'}`}>
                        {f.label}
                      </span>
                      <span className="text-white/20 text-xs border border-white/10 rounded px-2 py-0.5">
                        {f.duree}
                      </span>
                    </div>
                    <p className="text-white/40 text-xs">{f.tagline}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`font-semibold text-xl ${f.recommended ? 'text-[#C9A84C]' : 'text-white/80'}`}>
                      {f.prix_eur}€
                    </div>
                    <div className="text-white/25 text-[10px] leading-tight mt-0.5">
                      H local : {f.prix_local_h} FCFA<br />
                      F locale : {f.prix_local_f} FCFA
                    </div>
                  </div>
                </div>

                {/* Avantages */}
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 mb-4">
                  {f.avantages.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-white/55">
                      <span className="text-[#C9A84C]/60 shrink-0 mt-0.5">✓</span>
                      {a}
                    </li>
                  ))}
                </ul>

                <p className="text-white/25 text-[10px]">Idéal pour : <span className="text-[#C9A84C]/50">{f.ideal}</span></p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CE QUI EST INCLUS (TOUTES FORMULES) ──────────────────── */}
      <section className="bg-[#0E0E0E] py-14">
        <div className="max-w-3xl mx-auto px-5">
          <div className="text-center mb-10">
            <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-3">Inclus partout</p>
            <h2
              className="text-2xl font-light text-white"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Ce que vous obtenez dans toutes les formules
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              'Validation manuelle de votre profil',
              'Algorithme de matching — 5 Piliers',
              'Photos floutées jusqu\'au match mutuel',
              'Chat sécurisé avec Sentinelle IA',
              'Organisation du 1er rendez-vous officiel',
              '15 lieux partenaires premium au Cameroun',
              'Confidentialité absolue des données',
              'Carte membre digitale',
              'Support client dédié',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5 p-3 rounded-xl bg-[#C9A84C]/3 border border-[#C9A84C]/8">
                <span className="text-[#C9A84C] text-xs mt-0.5 shrink-0">✓</span>
                <span className="text-white/55 text-xs leading-relaxed">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GARANTIES ────────────────────────────────────────────── */}
      <section className="py-14">
        <div className="max-w-3xl mx-auto px-5">
          <div className="text-center mb-10">
            <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-3">Nos engagements</p>
            <h2
              className="text-2xl font-light text-white"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Vos garanties
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {GARANTIES.map((g) => (
              <div key={g.titre} className="p-5 rounded-2xl border border-white/5 bg-[#0E0E0E]">
                <div className="text-2xl mb-3">{g.icon}</div>
                <h3 className="text-white font-semibold text-sm mb-2">{g.titre}</h3>
                <p className="text-white/40 text-xs leading-relaxed">{g.texte}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────── */}
      <section className="bg-[#0E0E0E] py-16">
        <div className="max-w-md mx-auto px-5 text-center">
          <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-4">Prêt à rejoindre ?</p>
          <h2
            className="text-2xl font-light text-white mb-3"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Commencer mon inscription
          </h2>
          <p className="text-white/30 text-sm mb-8">
            Vous choisirez votre formule à l&apos;étape suivante.<br />
            Candidature examinée sous 48h. Discrétion absolue.
          </p>
          <button
            onClick={handleContinue}
            disabled={!pid || !gender}
            className={`w-full py-4 rounded-2xl font-semibold text-sm tracking-wide transition-all ${
              pid && gender
                ? 'bg-[#C9A84C] text-black hover:bg-[#B8963C] shadow-lg shadow-[#C9A84C]/15'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            }`}
          >
            Continuer mon inscription →
          </button>
          <p className="text-white/15 text-[10px] mt-4">
            En continuant, vous accéderez au choix de la formule puis à la Charte Alliance Privée.
          </p>
        </div>
      </section>

    </div>
  )
}
