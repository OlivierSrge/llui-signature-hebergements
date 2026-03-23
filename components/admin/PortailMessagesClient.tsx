'use client'
// components/admin/PortailMessagesClient.tsx — #18 Templates WhatsApp portail marié

import { useState } from 'react'

interface Template {
  id: string
  nom: string
  categorie: 'invites' | 'budget' | 'relance' | 'celebration'
  emoji: string
  corps: string
  variables: string[]
}

const TEMPLATES: Template[] = [
  {
    id: 'bienvenue_invite',
    nom: 'Bienvenue invité',
    categorie: 'invites',
    emoji: '🎉',
    corps: `Bonjour {prénom} ! 🎉\n\n{noms_maries} sont heureux de vous compter parmi leurs invités le {date}.\n\nRetrouvez toutes les informations :\n👉 {lien_fiche}\n\nVotre code privilège : *{code}*\n\nL&Lui Signature 💛`,
    variables: ['{prénom}', '{noms_maries}', '{date}', '{lien_fiche}', '{code}'],
  },
  {
    id: 'relance_silence',
    nom: 'Relance invité silencieux',
    categorie: 'relance',
    emoji: '💬',
    corps: `Bonjour {prénom} ! 😊\n\nLe mariage de {noms_maries} approche (le {date}).\n\nN'oubliez pas d'utiliser votre code *{code}* pour leur faire un cadeau :\n👉 {lien_boutique}\n\nMerci de votre soutien 💝`,
    variables: ['{prénom}', '{noms_maries}', '{date}', '{code}', '{lien_boutique}'],
  },
  {
    id: 'confirmation_versement',
    nom: 'Confirmation versement',
    categorie: 'budget',
    emoji: '💳',
    corps: `✅ Versement confirmé !\n\nBonjour {noms_maries},\n\nNous confirmons la réception de *{montant} FCFA* le {date_versement}.\n\nTotal versé : *{total_verse} FCFA*\nReste à payer : *{reste} FCFA*\n\nL&Lui Signature 💛`,
    variables: ['{noms_maries}', '{montant}', '{date_versement}', '{total_verse}', '{reste}'],
  },
  {
    id: 'rappel_solde',
    nom: 'Rappel solde restant',
    categorie: 'budget',
    emoji: '⏰',
    corps: `Bonjour {noms_maries} ! ⏰\n\nVotre mariage est dans *{jours} jours* ({date}).\n\nIl reste *{montant} FCFA* à régler.\n\nContactez-nous pour convenir d'un virement :\nL&Lui Signature 💛`,
    variables: ['{noms_maries}', '{jours}', '{date}', '{montant}'],
  },
  {
    id: 'felicitations_mariage',
    nom: 'Félicitations post-mariage',
    categorie: 'celebration',
    emoji: '🥂',
    corps: `Félicitations {noms_maries} ! 🥂\n\nQuel mariage magnifique ! 🌟\n\nPour prolonger la magie, partagez votre code *{code}* à vos amis :\n👉 {lien_boutique}\n\nMerci de nous avoir fait confiance 💛\nL&Lui Signature`,
    variables: ['{noms_maries}', '{code}', '{lien_boutique}'],
  },
  {
    id: 'carte_cadeau_invite',
    nom: 'Carte cadeau invité J+3',
    categorie: 'celebration',
    emoji: '🎁',
    corps: `Bonjour {prénom} ! 🎁\n\nMerci d'avoir célébré le mariage de {noms_maries} avec nous !\n\nOffrez-vous un souvenir de ce beau jour avec le code *{code}* (-10% sur toute la boutique) :\n👉 {lien_boutique}\n\nValable 30 jours 💛`,
    variables: ['{prénom}', '{noms_maries}', '{code}', '{lien_boutique}'],
  },
  {
    id: 'guide_kribi',
    nom: 'Guide Bienvenue Kribi',
    categorie: 'invites',
    emoji: '🌊',
    corps: `Bonjour {prénom} ! 🌊\n\nPour préparer votre venue au mariage de {noms_maries} à Kribi, voici votre guide pratique :\n\n📍 Lieu : {lieu}\n📅 Date : {date}\n\nTéléchargez le guide complet :\n👉 {lien_guide}\n\nA bientôt à Kribi ! 🌴`,
    variables: ['{prénom}', '{noms_maries}', '{lieu}', '{date}', '{lien_guide}'],
  },
  {
    id: 'save_the_date',
    nom: 'Save the Date',
    categorie: 'invites',
    emoji: '📅',
    corps: `📅 Save the Date !\n\n{noms_maries} vous invitent à leur mariage !\n\n🗓️ Le {date}\n📍 {lieu}\n\nDécouvrez le carton d'invitation :\n👉 {lien_faire_part}\n\nRéservez dès maintenant votre hébergement avec le code *{code}* 🏡`,
    variables: ['{noms_maries}', '{date}', '{lieu}', '{lien_faire_part}', '{code}'],
  },
]

const CATEGORIES: Record<string, { label: string; color: string }> = {
  invites:    { label: 'Invités',      color: '#3B82F6' },
  budget:     { label: 'Budget',       color: '#C9A84C' },
  relance:    { label: 'Relance',      color: '#C0392B' },
  celebration:{ label: 'Célébration', color: '#7C9A7E' },
}

function applyVariables(corps: string, values: Record<string, string>): string {
  let result = corps
  for (const [key, val] of Object.entries(values)) {
    result = result.replaceAll(key, val || key)
  }
  return result
}

export default function PortailMessagesClient() {
  const [selectedId, setSelectedId] = useState<string>(TEMPLATES[0].id)
  const [varValues, setVarValues] = useState<Record<string, string>>({})
  const [testPhone, setTestPhone] = useState('')
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState('')
  const [filterCat, setFilterCat] = useState<string | null>(null)

  const selected = TEMPLATES.find(t => t.id === selectedId) ?? TEMPLATES[0]
  const preview = applyVariables(selected.corps, varValues)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  async function handleSendTest() {
    if (!testPhone) { showToast('Entrez un numéro de test'); return }
    setSending(true)
    try {
      const res = await fetch('/api/admin/send-template-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone, message: preview }),
      })
      const d = await res.json()
      showToast(d.success ? '✅ Message envoyé !' : `❌ ${d.error ?? 'Erreur'}`)
    } catch {
      showToast('❌ Erreur réseau')
    } finally {
      setSending(false)
    }
  }

  const filtered = filterCat ? TEMPLATES.filter(t => t.categorie === filterCat) : TEMPLATES

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* En-tête */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-1">💬 Templates Messages Portail</h1>
        <p className="text-sm text-[#888]">Bibliothèque de messages réutilisables pour les mariés et leurs invités</p>
      </div>

      {/* Filtres catégories */}
      <div className="flex gap-2 flex-wrap mb-5">
        <button
          onClick={() => setFilterCat(null)}
          className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
          style={{ background: !filterCat ? '#1A1A1A' : '#F5F0E8', color: !filterCat ? 'white' : '#888' }}
        >
          Tous
        </button>
        {Object.entries(CATEGORIES).map(([key, { label, color }]) => (
          <button
            key={key}
            onClick={() => setFilterCat(key)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background: filterCat === key ? color : color + '22',
              color: filterCat === key ? 'white' : color,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Liste templates */}
        <div className="lg:col-span-1 space-y-2">
          {filtered.map(t => {
            const cat = CATEGORIES[t.categorie]
            return (
              <button
                key={t.id}
                onClick={() => { setSelectedId(t.id); setVarValues({}) }}
                className="w-full text-left rounded-xl p-3 border transition-all"
                style={{
                  border: selectedId === t.id ? '2px solid #C9A84C' : '1px solid #F5F0E8',
                  background: selectedId === t.id ? '#FFFDF5' : 'white',
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{t.emoji}</span>
                  <span className="text-sm font-semibold text-[#1A1A1A]">{t.nom}</span>
                </div>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: cat.color + '22', color: cat.color }}
                >
                  {cat.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Éditeur + preview */}
        <div className="lg:col-span-2 space-y-4">
          {/* Variables */}
          <div className="bg-white rounded-2xl p-4 border border-[#F5F0E8]">
            <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-3">Variables</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selected.variables.map(v => (
                <div key={v}>
                  <label className="text-[10px] text-[#888] block mb-0.5 font-mono">{v}</label>
                  <input
                    type="text"
                    placeholder={v.replace(/[{}]/g, '')}
                    value={varValues[v] ?? ''}
                    onChange={e => setVarValues(prev => ({ ...prev, [v]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#C9A84C]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Preview message */}
          <div className="bg-[#1A1A1A] rounded-2xl p-4">
            <p className="text-[10px] text-white/40 uppercase tracking-wide mb-3">Aperçu message WhatsApp</p>
            <div className="bg-[#2A2A2A] rounded-xl p-3">
              <pre className="text-white text-xs leading-relaxed whitespace-pre-wrap font-sans">{preview}</pre>
            </div>
            <p className="text-[10px] text-white/30 mt-2">{preview.length} caractères</p>
          </div>

          {/* Envoi test */}
          <div className="bg-white rounded-2xl p-4 border border-[#F5F0E8]">
            <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-3">Envoyer un message test</p>
            <div className="flex gap-2">
              <input
                type="tel"
                placeholder="+237 6XX XXX XXX"
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]"
              />
              <button
                onClick={handleSendTest}
                disabled={sending}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
                style={{ background: '#C9A84C' }}
              >
                {sending ? '…' : '📤 Envoyer'}
              </button>
            </div>
            <p className="text-[10px] text-[#AAA] mt-2">Le numéro doit avoir rejoint le sandbox Twilio</p>
          </div>

          {/* Copier */}
          <button
            onClick={() => { navigator.clipboard.writeText(preview); showToast('✅ Copié !') }}
            className="w-full py-2.5 rounded-xl text-sm font-semibold border border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C] hover:text-white transition-colors"
          >
            📋 Copier le message
          </button>
        </div>
      </div>
    </div>
  )
}
