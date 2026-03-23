'use client'
// components/alumni/AlumniClient.tsx — #152 Réseau couples alumni

import { useState } from 'react'

interface Avantage {
  delai: string
  titre: string
  detail: string
  emoji: string
  color: string
}

interface Props {
  marie_uid: string
  noms_maries: string
  date_mariage: string
  whatsapp_groupe_url: string
  jours_depuis_mariage: number
  avantages: Avantage[]
}

const TEMOIGNAGES = [
  { noms: 'Sophie & Kévin M.', texte: 'Une année incroyable ! L&Lui nous a surpris avec un cadeau à notre anniversaire. La communauté alumni est vraiment chaleureuse.', note: 5 },
  { noms: 'Amina & Pierre T.', texte: 'Le groupe WhatsApp alumni m\'a donné plein de bons plans pour notre premier voyage d\'anniversaire à Kribi.', note: 5 },
  { noms: 'Laure & Serge B.', texte: 'J\'ai recommandé L&Lui à 3 couples de mes amis grâce au programme parrainage. Toujours aussi proches de nous !', note: 5 },
]

const AVANTAGES_ALUMNI = [
  { delai: 'Immédiat', emoji: '🎊', titre: 'Accès groupe WhatsApp alumni', detail: 'Rejoignez la communauté exclusive des couples L&Lui Signature', color: '#25D366' },
  { delai: 'J+30', emoji: '📸', titre: 'Album souvenir premium', detail: 'Accès illimité à votre galerie et téléchargement HD pendant 1 an', color: '#5B8FBF' },
  { delai: 'J+90', emoji: '💌', titre: 'Kit anniversaire 3 mois', detail: 'Email surprise avec un coupon cadeau L&Lui', color: '#9B7ED4' },
  { delai: 'J+180', emoji: '⭐', titre: 'Invitation soirée alumni', detail: 'Cocktail annuel privé pour tous les couples L&Lui Signature', color: '#C9A84C' },
  { delai: 'J+365', emoji: '🎁', titre: 'Surprise 1er anniversaire', detail: 'Cadeau livré à domicile + message personnalisé d\'Olivier', color: '#7C9A7E' },
  { delai: 'J+365+', emoji: '💎', titre: 'Alumni à vie', detail: 'Tarifs préférentiels sur tous les services L&Lui pour toujours', color: '#B9F2FF' },
]

function formatDate(iso: string) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return iso }
}

function getProgressColor(jours: number): string {
  if (jours >= 365) return '#7C9A7E'
  if (jours >= 180) return '#C9A84C'
  if (jours >= 90) return '#9B7ED4'
  return '#5B8FBF'
}

export default function AlumniClient({ noms_maries, date_mariage, whatsapp_groupe_url, jours_depuis_mariage, avantages }: Props) {
  const [tab, setTab] = useState<'avantages' | 'communaute' | 'temoignages'>('avantages')
  const [joinedWA, setJoinedWA] = useState(false)

  const pct = Math.min(100, Math.round((jours_depuis_mariage / 365) * 100))
  const progressColor = getProgressColor(jours_depuis_mariage)

  // Prochain avantage
  const prochainAvantage = AVANTAGES_ALUMNI.find(a => {
    const j = parseInt(a.delai.replace('J+', '').replace('+', '')) || 0
    return jours_depuis_mariage < j
  })

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: '#FAF6EE' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#C9A84C] mb-2">L&LUI SIGNATURE</p>
          <h1 className="text-2xl font-serif text-[#1A1A1A]">{noms_maries}</h1>
          <p className="text-sm text-[#888] mt-1">✨ Mariés le {formatDate(date_mariage)}</p>
        </div>

        {/* Timeline anniversaire */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm" style={{ border: '1px solid #F5F0E8' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-[#888] uppercase tracking-wide">🗓️ Votre 1ère année</p>
            <span className="text-sm font-bold" style={{ color: progressColor }}>{jours_depuis_mariage} jours</span>
          </div>
          <div className="bg-[#F5F0E8] rounded-full h-2 mb-3">
            <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: progressColor }} />
          </div>
          <div className="flex justify-between text-[9px] text-[#AAA]">
            <span>Jour J</span>
            <span>J+90</span>
            <span>J+180</span>
            <span>J+365 🎂</span>
          </div>
          {prochainAvantage && jours_depuis_mariage < 365 && (
            <div className="mt-3 rounded-xl p-2.5" style={{ background: '#C9A84C10', border: '1px solid #C9A84C20' }}>
              <p className="text-[10px] text-[#888]">Prochain avantage ({prochainAvantage.delai})</p>
              <p className="text-sm font-semibold text-[#1A1A1A]">{prochainAvantage.emoji} {prochainAvantage.titre}</p>
            </div>
          )}
          {jours_depuis_mariage >= 365 && (
            <div className="mt-3 rounded-xl p-2.5 text-center" style={{ background: '#7C9A7E15', border: '1px solid #7C9A7E30' }}>
              <p className="text-sm font-bold text-[#7C9A7E]">🎂 Félicitations pour votre 1er anniversaire !</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-white rounded-2xl p-1" style={{ border: '1px solid #F5F0E8' }}>
          {([['avantages', '🎁 Avantages'], ['communaute', '💬 Communauté'], ['temoignages', '⭐ Témoignages']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
              style={{ background: tab === key ? '#1A1A1A' : 'transparent', color: tab === key ? 'white' : '#888' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Tab: Avantages */}
        {tab === 'avantages' && (
          <div className="space-y-2">
            {AVANTAGES_ALUMNI.map(a => {
              const jAvantage = parseInt(a.delai.replace('J+', '').replace('+', '')) || 0
              const atteint = jours_depuis_mariage >= jAvantage
              return (
                <div key={a.titre} className="bg-white rounded-xl p-3 flex items-start gap-3" style={{ border: `1px solid ${a.color}22`, opacity: atteint ? 1 : 0.65 }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg" style={{ background: `${a.color}15` }}>
                    {a.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-[#1A1A1A]">{a.titre}</p>
                      {atteint && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#7C9A7E15', color: '#7C9A7E' }}>Débloqué ✓</span>}
                    </div>
                    <p className="text-[10px] text-[#888]">{a.detail}</p>
                    <p className="text-[9px] font-bold mt-1" style={{ color: a.color }}>{a.delai}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Tab: Communauté */}
        {tab === 'communaute' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 text-center" style={{ border: '1px solid #F5F0E8' }}>
              <div className="text-4xl mb-3">💬</div>
              <h2 className="text-lg font-serif text-[#1A1A1A] mb-2">Groupe WhatsApp Alumni</h2>
              <p className="text-xs text-[#888] mb-4 leading-relaxed">
                Rejoignez la communauté privée des couples L&Lui Signature. Échanges, bons plans, sorties et surprises entre alumni.
              </p>
              {joinedWA ? (
                <p className="text-sm font-bold text-[#7C9A7E]">✅ Vous avez rejoint le groupe !</p>
              ) : (
                <a href={whatsapp_groupe_url} target="_blank" rel="noopener noreferrer"
                  onClick={() => setJoinedWA(true)}
                  className="inline-block px-6 py-3 rounded-2xl font-bold text-sm"
                  style={{ background: '#25D366', color: 'white' }}>
                  💬 Rejoindre le groupe WhatsApp
                </a>
              )}
            </div>

            <div className="space-y-2">
              {[
                { emoji: '🎉', titre: 'Soirée alumni annuelle', detail: 'Cocktail privé pour tous les couples — invitation envoyée à J+180' },
                { emoji: '💡', titre: 'Bons plans partagés', detail: 'Restaurants, voyages, prestataires recommandés par la communauté' },
                { emoji: '🤝', titre: 'Entraide & parrainage', detail: 'Recommandez L&Lui et gagnez 50 000 FCFA par filleul signé' },
                { emoji: '📸', titre: 'Concours photo anniversaire', detail: 'Partagez vos photos J+1 an et gagnez un week-end Kribi' },
              ].map(i => (
                <div key={i.titre} className="bg-white rounded-xl p-3 flex items-start gap-3" style={{ border: '1px solid #F5F0E8' }}>
                  <span className="text-xl flex-shrink-0">{i.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A]">{i.titre}</p>
                    <p className="text-[10px] text-[#888]">{i.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Témoignages */}
        {tab === 'temoignages' && (
          <div className="space-y-3">
            {TEMOIGNAGES.map(t => (
              <div key={t.noms} className="bg-white rounded-xl p-4" style={{ border: '1px solid #F5F0E8' }}>
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: t.note }).map((_, i) => (
                    <span key={i} className="text-[#C9A84C] text-sm">★</span>
                  ))}
                </div>
                <p className="text-xs text-[#666] leading-relaxed italic mb-2">"{t.texte}"</p>
                <p className="text-[10px] font-bold text-[#888]">— {t.noms}</p>
              </div>
            ))}

            <div className="rounded-2xl p-5 text-center" style={{ background: 'linear-gradient(135deg, #1A1A1A, #2D2D2D)' }}>
              <p className="text-white font-semibold mb-1">Partagez votre expérience</p>
              <p className="text-[#888] text-xs mb-4">Votre témoignage aide d'autres couples à nous faire confiance</p>
              <a href="https://wa.me/237693407964?text=Bonjour%20Olivier%2C%20je%20souhaite%20laisser%20un%20t%C3%A9moignage%20sur%20mon%20mariage%20L%26Lui"
                target="_blank" rel="noopener noreferrer"
                className="inline-block px-6 py-3 rounded-2xl font-bold text-sm"
                style={{ background: '#C9A84C', color: 'white' }}>
                ✍️ Laisser un témoignage
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
