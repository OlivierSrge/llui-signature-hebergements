'use client'
// components/mariage-mixte/MariageMixteClient.tsx — #194 Mariage mixte, démarches légales

import { useState } from 'react'

const ETAPES = [
  {
    num: 1, titre: 'Déclaration de mariage civil au Cameroun',
    detail: "Remettre les documents à l'état civil du lieu de mariage (Kribi) au moins 2 mois avant la date.",
    docs: ['Acte de naissance (apostillé si étranger)', 'Certificat de célibat/non-remariage', 'Pièce d\'identité valide', 'Justificatif de domicile', 'Certificat médical prénuptial'],
    delai: '2 mois avant',
    color: '#5B8FBF',
  },
  {
    num: 2, titre: 'Légalisation et apostille des documents étrangers',
    detail: "Les documents issus d'un pays étranger doivent être apostillés par les autorités de ce pays puis traduits par un traducteur assermenté.",
    docs: ['Acte de naissance apostillé', 'Traduction certifiée (FR ou EN)', 'Vérification auprès de l\'ambassade du Cameroun'],
    delai: '3 mois avant',
    color: '#9B7ED4',
  },
  {
    num: 3, titre: 'Transcription du mariage dans le pays étranger',
    detail: "Après la cérémonie au Cameroun, le mariage doit être transcrit dans le registre d'état civil du pays d'origine du conjoint étranger.",
    docs: ['Acte de mariage camerounais officiel', 'Traduction assermentée', 'Demande consulaire ou ambassade'],
    delai: 'Après le mariage',
    color: '#7C9A7E',
  },
  {
    num: 4, titre: 'Régime matrimonial',
    detail: "Choisir le régime matrimonial (communauté des biens, séparation de biens) devant notaire. Important pour les couples bi-nationaux.",
    docs: ['Consultation notariale obligatoire', 'Contrat de mariage optionnel', 'Choix du droit applicable'],
    delai: '1 mois avant',
    color: '#C9A84C',
  },
]

const TRADUCTEURS = [
  { nom: 'Cabinet Bilingual Translations', langues: 'FR / EN / DE', tel: '+237 699 XXX XXX', ville: 'Kribi', assermente: true },
  { nom: 'Me Nguemaho Traductions', langues: 'FR / EN / IT', tel: '+237 677 XXX XXX', ville: 'Kribi / Douala', assermente: true },
  { nom: 'Kribi Interpreting Services', langues: 'FR / EN', tel: '+237 655 XXX XXX', ville: 'Kribi', assermente: false },
]

const NOTAIRES = [
  { nom: 'Me Fomba Jean-Claude (Notaire)', specialite: 'Droit de la famille, contrats mariage', tel: '+237 233 461 XXX', ville: 'Kribi' },
  { nom: 'Etude Notariale Biyiti', specialite: 'Mariages internationaux, régimes matrimoniaux', tel: '+237 233 XXX XXX', ville: 'Kribi' },
  { nom: 'Cabinet Juridique du Littoral', specialite: 'Conseil juridique international', tel: '+237 699 XXX XXX', ville: 'Kribi / Douala' },
]

const FAQ = [
  { q: "Le mariage camerounais est-il reconnu en France / en Europe ?", r: "Oui, à condition d'avoir fait transcrit le mariage auprès du consulat/ambassade du pays concerné après la cérémonie au Cameroun. Prévoir 2 à 6 mois de délai." },
  { q: "Faut-il un interprète lors de la cérémonie civile ?", r: "Si l'un des époux ne comprend pas le français, un interprète assermenté doit être présent lors de la cérémonie civile. L'officier d'état civil l'exige." },
  { q: "Quelle langue utiliser pour les documents ?", r: "Le français est la langue officielle des actes d'état civil au Cameroun. Les documents en langue étrangère doivent être traduits en français par un traducteur assermenté." },
  { q: "Le conjoint étranger doit-il être présent au Cameroun ?", r: "Oui, les deux époux doivent être présents lors de la cérémonie civile. Une procuration peut être envisagée dans des cas exceptionnels (à confirmer avec un notaire)." },
  { q: "Peut-on se marier religieusement sans le civil ?", r: "Non. Au Cameroun, le mariage civil est un préalable obligatoire au mariage religieux. Le civil doit être conclu en premier." },
]

export default function MariageMixteClient() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [openEtape, setOpenEtape] = useState<number | null>(1)

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: '#FAF6EE' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#C9A84C] mb-2">L&LUI SIGNATURE</p>
          <h1 className="text-2xl font-serif text-[#1A1A1A]">Mariage mixte au Cameroun 🌍</h1>
          <p className="text-sm text-[#888] mt-1">Guide complet des démarches légales et annuaire des partenaires</p>
        </div>

        {/* Étapes légales */}
        <div className="mb-6">
          <p className="text-xs font-bold text-[#888] uppercase tracking-wide mb-3">📋 Démarches étape par étape</p>
          <div className="space-y-3">
            {ETAPES.map(e => (
              <div key={e.num} className="rounded-2xl overflow-hidden bg-white" style={{ border: `1px solid ${e.color}22` }}>
                <button
                  onClick={() => setOpenEtape(openEtape === e.num ? null : e.num)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white" style={{ background: e.color }}>
                    {e.num}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#1A1A1A]">{e.titre}</p>
                    <p className="text-[10px] font-bold mt-0.5" style={{ color: e.color }}>⏱ {e.delai}</p>
                  </div>
                  <span className="text-[#AAA] text-sm">{openEtape === e.num ? '▲' : '▼'}</span>
                </button>
                {openEtape === e.num && (
                  <div className="px-4 pb-4 pt-1">
                    <p className="text-xs text-[#666] mb-3 leading-relaxed">{e.detail}</p>
                    <p className="text-[10px] font-bold text-[#888] uppercase mb-2">Documents requis :</p>
                    <div className="space-y-1">
                      {e.docs.map(d => (
                        <p key={d} className="text-xs text-[#1A1A1A] flex items-start gap-2">
                          <span style={{ color: e.color }}>→</span>{d}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Traducteurs */}
        <div className="mb-6">
          <p className="text-xs font-bold text-[#888] uppercase tracking-wide mb-3">🌐 Traducteurs assermentés partenaires</p>
          <div className="space-y-2">
            {TRADUCTEURS.map(t => (
              <div key={t.nom} className="bg-white rounded-xl p-3 flex items-center justify-between" style={{ border: '1px solid #F5F0E8' }}>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#1A1A1A]">{t.nom}</p>
                    {t.assermente && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#7C9A7E15', color: '#7C9A7E' }}>Assermenté</span>}
                  </div>
                  <p className="text-[10px] text-[#888]">{t.langues} · {t.ville}</p>
                </div>
                <a href={`tel:${t.tel}`} className="text-[10px] text-[#C9A84C] font-medium">{t.tel}</a>
              </div>
            ))}
          </div>
        </div>

        {/* Notaires */}
        <div className="mb-6">
          <p className="text-xs font-bold text-[#888] uppercase tracking-wide mb-3">⚖️ Notaires partenaires Kribi</p>
          <div className="space-y-2">
            {NOTAIRES.map(n => (
              <div key={n.nom} className="bg-white rounded-xl p-3" style={{ border: '1px solid #F5F0E8' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A]">{n.nom}</p>
                    <p className="text-[10px] text-[#C9A84C]">{n.specialite}</p>
                    <p className="text-[10px] text-[#888]">{n.ville}</p>
                  </div>
                  <a href={`tel:${n.tel}`} className="text-[10px] text-[#C9A84C] font-medium">{n.tel}</a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div>
          <p className="text-xs font-bold text-[#888] uppercase tracking-wide mb-3">❓ Questions fréquentes</p>
          <div className="space-y-2">
            {FAQ.map((f, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #F5F0E8' }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left gap-3">
                  <p className="text-sm font-semibold text-[#1A1A1A] flex-1">{f.q}</p>
                  <span className="text-[#AAA] text-sm flex-shrink-0">{openFaq === i ? '▲' : '▼'}</span>
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-3">
                    <p className="text-xs text-[#666] leading-relaxed">{f.r}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA Contact */}
        <div className="mt-6 rounded-2xl p-5 text-center" style={{ background: 'linear-gradient(135deg, #1A1A1A, #2D2D2D)' }}>
          <p className="text-white font-semibold mb-1">Besoin d'accompagnement personnalisé ?</p>
          <p className="text-[#888] text-xs mb-4">L'équipe L&Lui vous guide dans toutes les démarches</p>
          <a href="https://wa.me/237693407964?text=Bonjour,%20je%20souhaire%20organiser%20un%20mariage%20mixte%20au%20Cameroun"
            target="_blank" rel="noopener noreferrer"
            className="inline-block px-6 py-3 rounded-2xl font-bold text-sm" style={{ background: '#25D366', color: 'white' }}>
            💬 Contacter L&Lui sur WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}
