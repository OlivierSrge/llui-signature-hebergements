'use client'
// components/admin/portail/GestionMaries.tsx — Card création espace marié

import { useState } from 'react'

interface CreationResult {
  success?: boolean
  uid?: string
  code_promo?: string
  whatsapp_sent?: boolean
  error?: string
}

export default function GestionMaries() {
  const [form, setForm] = useState({ noms_maries: '', whatsapp: '', date_mariage: '', lieu: '' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CreationResult | null>(null)

  async function creer() {
    if (!form.noms_maries || !form.whatsapp || !form.date_mariage || !form.lieu) {
      setResult({ error: 'Tous les champs sont requis' }); return
    }
    setLoading(true); setResult(null)
    try {
      const res = await fetch('/api/admin/creer-espace-marie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      setResult(data)
      if (data.success) setForm({ noms_maries: '', whatsapp: '', date_mariage: '', lieu: '' })
    } catch {
      setResult({ error: 'Erreur réseau' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-6 border-2 border-[#C9A84C] shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center text-xl">💍</div>
        <div>
          <h2 className="font-bold text-[#1A1A1A] text-lg">Créer un espace marié</h2>
          <p className="text-xs text-[#1A1A1A]/50">UID + code promo + WhatsApp auto</p>
        </div>
      </div>
      <div className="space-y-2 mb-3">
        {(['noms_maries', 'whatsapp', 'lieu'] as const).map(field => (
          <input key={field}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]"
            placeholder={field === 'noms_maries' ? 'Noms mariés (ex: Gabriel & Julie)' : field === 'whatsapp' ? 'WhatsApp (+237…)' : 'Lieu du mariage'}
            value={form[field]}
            onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
          />
        ))}
        <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]"
          value={form.date_mariage}
          onChange={e => setForm(p => ({ ...p, date_mariage: e.target.value }))}
        />
      </div>
      <button onClick={creer} disabled={loading}
        className="w-full py-2.5 rounded-xl bg-[#C9A84C] text-white text-sm font-semibold hover:bg-[#B8964A] disabled:opacity-50 transition-colors">
        {loading ? 'Création…' : '✨ Créer l\'espace marié'}
      </button>
      {result && (
        <div className={`mt-3 p-3 rounded-xl text-sm ${result.error ? 'bg-red-50 text-red-700' : 'bg-[#C9A84C]/10 text-[#1A1A1A]'}`}>
          {result.error ? <span>❌ {result.error}</span> : (
            <>
              <p className="font-semibold">✅ Espace créé !</p>
              <p className="text-xs mt-1">UID : <code className="bg-white px-1 rounded">{result.uid}</code></p>
              <p className="text-xs mt-0.5">Code : <code className="bg-white px-1 rounded font-bold">{result.code_promo}</code></p>
              <p className="text-xs mt-0.5">{result.whatsapp_sent ? '📱 WhatsApp envoyé' : '⚠ WhatsApp non envoyé'}</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
