'use client'
// components/discours/DiscoursClient.tsx — #121 Rédacteur discours & textes IA

import { useState } from 'react'

interface Props {
  marie_uid: string
  noms_maries: string
  date_mariage: string
  lieu: string
}

interface Discours {
  titre: string
  intro: string
  corps: string[]
  conclusion: string
  duree_estimee: string
  conseils_orateur: string
}

const STYLES = [
  { key: 'solennel', label: 'Solennel', emoji: '🎩', desc: 'Noble et formel, digne d\'une grande cérémonie' },
  { key: 'emouvant', label: 'Émouvant', emoji: '💛', desc: 'Sincère et chaleureux, qui touche les cœurs' },
  { key: 'humoristique', label: 'Humoristique', emoji: '😄', desc: 'Drôle et bienveillant, avec des anecdotes amusantes' },
]

const ROLES = ['Père de la mariée', 'Mère de la mariée', 'Père du marié', 'Mère du marié', 'Témoin', 'Ami(e) proche', 'Frère / Sœur', 'Oncle / Tante', 'Collègue', 'Autre']

export default function DiscoursClient({ marie_uid, noms_maries, date_mariage, lieu }: Props) {
  const [step, setStep] = useState<'form' | 'result'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [discours, setDiscours] = useState<Discours | null>(null)
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({
    auteur: '',
    role: 'Témoin',
    destinataire: noms_maries,
    anecdote: '',
    qualites: '',
    souhait: '',
    style: 'emouvant',
    langue: 'fr',
  })

  async function generer() {
    if (!form.auteur) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/portail/generer-discours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, noms_maries, date_mariage, lieu }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erreur'); return }
      setDiscours(data.discours)
      setStep('result')
    } catch { setError('Erreur réseau') }
    finally { setLoading(false) }
  }

  async function copier() {
    if (!discours) return
    const texte = [
      discours.titre,
      '',
      discours.intro,
      '',
      ...discours.corps,
      '',
      discours.conclusion,
    ].join('\n')
    await navigator.clipboard.writeText(texte).catch(() => null)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function exporterPDF() {
    if (!discours) return
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ format: 'a4', unit: 'mm' })
    const gold: [number, number, number] = [201, 168, 76]
    const dark: [number, number, number] = [26, 26, 26]
    const grey: [number, number, number] = [80, 80, 80]
    const W = 210
    // Header
    doc.setFillColor(...dark)
    doc.rect(0, 0, W, 40, 'F')
    doc.setTextColor(...gold)
    doc.setFontSize(9)
    doc.text('L&LUI SIGNATURE — DISCOURS DE MARIAGE', W / 2, 14, { align: 'center' })
    doc.setFontSize(18)
    doc.setFont('times', 'italic')
    doc.text(discours.titre, W / 2, 26, { align: 'center' })
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(180, 180, 180)
    doc.text(`${noms_maries} · ${lieu}`, W / 2, 34, { align: 'center' })
    // Corps
    let y = 52
    doc.setTextColor(...dark)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'italic')
    const introLines = doc.splitTextToSize(discours.intro, W - 40)
    doc.text(introLines, 20, y)
    y += introLines.length * 6 + 8
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    for (const para of discours.corps) {
      if (y > 260) { doc.addPage(); y = 20 }
      const lines = doc.splitTextToSize(para, W - 40)
      doc.setTextColor(...dark)
      doc.text(lines, 20, y)
      y += lines.length * 6 + 8
    }
    if (y > 260) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bolditalic')
    doc.setTextColor(...gold)
    const concLines = doc.splitTextToSize(discours.conclusion, W - 40)
    doc.text(concLines, 20, y)
    y += concLines.length * 6 + 12
    // Conseils
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...grey)
    doc.text(`⏱ Durée estimée : ${discours.duree_estimee}`, 20, y)
    y += 8
    const conseilLines = doc.splitTextToSize(`💡 Conseils : ${discours.conseils_orateur}`, W - 40)
    doc.text(conseilLines, 20, y)
    doc.save(`discours-mariage-${noms_maries.replace(/\s+/g, '-').toLowerCase()}.pdf`)
  }

  if (step === 'result' && discours) return (
    <div className="min-h-screen px-4 py-8" style={{ background: '#FAF6EE' }}>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#C9A84C] mb-1">DISCOURS GÉNÉRÉ ✨</p>
          <h1 className="text-xl font-serif text-[#1A1A1A]">{discours.titre}</h1>
          <p className="text-xs text-[#888] mt-1">⏱ {discours.duree_estimee} · {STYLES.find(s => s.key === form.style)?.emoji} Style {form.style}</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm p-6 space-y-4" style={{ border: '1px solid #F5F0E8' }}>
          <p className="text-sm text-[#666] italic leading-relaxed border-l-4 pl-4" style={{ borderColor: '#C9A84C' }}>{discours.intro}</p>
          {discours.corps.map((para, i) => (
            <p key={i} className="text-sm text-[#1A1A1A] leading-relaxed">{para}</p>
          ))}
          <p className="text-sm font-semibold text-[#C9A84C] italic leading-relaxed">{discours.conclusion}</p>
        </div>

        {discours.conseils_orateur && (
          <div className="mt-4 p-4 rounded-2xl" style={{ background: '#C9A84C08', border: '1px solid #C9A84C20' }}>
            <p className="text-xs font-bold text-[#C9A84C] mb-1">💡 Conseils pour l'orateur</p>
            <p className="text-xs text-[#666]">{discours.conseils_orateur}</p>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2">
          <div className="flex gap-2">
            <button onClick={copier} className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-all"
              style={{ background: copied ? '#7C9A7E' : '#C9A84C18', color: copied ? 'white' : '#C9A84C', border: '1px solid #C9A84C30' }}>
              {copied ? '✅ Copié !' : '📋 Copier le texte'}
            </button>
            <button onClick={exporterPDF} className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-all"
              style={{ background: '#1A1A1A', color: '#C9A84C' }}>
              📄 Exporter PDF
            </button>
          </div>
          <button onClick={() => setStep('form')} className="w-full py-2.5 rounded-2xl text-sm text-[#888]"
            style={{ background: '#F5F0E8' }}>
            🔄 Modifier et régénérer
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: '#FAF6EE' }}>
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#C9A84C] mb-2">RÉDACTEUR IA</p>
          <h1 className="text-2xl font-serif text-[#1A1A1A]">Votre discours de mariage</h1>
          <p className="text-sm text-[#888] mt-1">Personnalisé par l'IA pour {noms_maries}</p>
        </div>

        <div className="space-y-4">
          {/* Style */}
          <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: '1px solid #F5F0E8' }}>
            <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-3">Ton du discours</p>
            <div className="grid grid-cols-3 gap-2">
              {STYLES.map(s => (
                <button key={s.key} onClick={() => setForm(f => ({ ...f, style: s.key }))}
                  className="p-3 rounded-xl text-center transition-all"
                  style={{ background: form.style === s.key ? '#1A1A1A' : '#F5F0E8', border: `1px solid ${form.style === s.key ? '#C9A84C' : 'transparent'}` }}>
                  <div className="text-xl mb-1">{s.emoji}</div>
                  <p className="text-xs font-bold" style={{ color: form.style === s.key ? '#C9A84C' : '#1A1A1A' }}>{s.label}</p>
                  <p className="text-[9px] mt-0.5" style={{ color: form.style === s.key ? '#888' : '#AAA' }}>{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Langue */}
          <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: '1px solid #F5F0E8' }}>
            <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-3">Langue</p>
            <div className="flex gap-2">
              {[{ key: 'fr', label: '🇫🇷 Français' }, { key: 'en', label: '🇬🇧 English' }].map(l => (
                <button key={l.key} onClick={() => setForm(f => ({ ...f, langue: l.key }))}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: form.langue === l.key ? '#1A1A1A' : '#F5F0E8', color: form.langue === l.key ? '#C9A84C' : '#888' }}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Infos orateur */}
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3" style={{ border: '1px solid #F5F0E8' }}>
            <p className="text-xs font-semibold text-[#888] uppercase tracking-wide">L'orateur</p>
            <div>
              <label className="text-[10px] text-[#888] block mb-1">Votre prénom / nom *</label>
              <input required value={form.auteur} onChange={e => setForm(f => ({ ...f, auteur: e.target.value }))}
                placeholder="Ex : Jean-Pierre Mbarga"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]" />
            </div>
            <div>
              <label className="text-[10px] text-[#888] block mb-1">Votre rôle</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]">
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* Contenu personnalisé */}
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3" style={{ border: '1px solid #F5F0E8' }}>
            <p className="text-xs font-semibold text-[#888] uppercase tracking-wide">Personnalisation</p>
            <div>
              <label className="text-[10px] text-[#888] block mb-1">Une anecdote ou souvenir à intégrer</label>
              <textarea rows={2} value={form.anecdote} onChange={e => setForm(f => ({ ...f, anecdote: e.target.value }))}
                placeholder="Ex : Le jour où on s'est rencontrés au lac Municipal…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#C9A84C]" />
            </div>
            <div>
              <label className="text-[10px] text-[#888] block mb-1">Qualités des mariés à souligner</label>
              <input value={form.qualites} onChange={e => setForm(f => ({ ...f, qualites: e.target.value }))}
                placeholder="Ex : généreux, drôle, ambitieux, attentionné…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]" />
            </div>
            <div>
              <label className="text-[10px] text-[#888] block mb-1">Votre souhait principal pour eux</label>
              <input value={form.souhait} onChange={e => setForm(f => ({ ...f, souhait: e.target.value }))}
                placeholder="Ex : une vie remplie de bonheur et de projets…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]" />
            </div>
          </div>

          {error && <p className="text-xs text-red-500 text-center">{error}</p>}

          <button onClick={generer} disabled={loading || !form.auteur}
            className="w-full py-4 rounded-2xl font-bold text-white text-sm disabled:opacity-50"
            style={{ background: 'linear-gradient(90deg, #C9A84C, #E8C87A)' }}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Rédaction en cours…
              </span>
            ) : '✨ Générer mon discours'}
          </button>
          <p className="text-center text-[10px] text-[#AAA]">Powered by Claude Sonnet · environ 10 secondes</p>
        </div>
      </div>
    </div>
  )
}
