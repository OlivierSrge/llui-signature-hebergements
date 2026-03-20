'use client'
// components/portail/NotifWhatsAppSection.tsx
// Section CallMeBot — activation + test dans la page Avantages

import { useState, useEffect } from 'react'

export default function NotifWhatsAppSection({ uid }: { uid: string }) {
  const [hasApikey, setHasApikey] = useState<boolean | null>(null)
  const [testLoading, setTestLoading] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetch('/api/portail/notif-whatsapp/status?uid=' + uid)
      .then(r => r.json())
      .then(d => setHasApikey(!!d.has_apikey))
      .catch(() => setHasApikey(false))
  }, [uid])

  const handleTest = async () => {
    setTestLoading(true)
    await fetch('/api/portail/notif-whatsapp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, type: 'BIENVENUE', data: {} }),
    }).catch(() => {})
    setToast('Message de test envoyé ✓')
    setTimeout(() => setToast(''), 3000)
    setTestLoading(false)
  }

  if (hasApikey === null) return null

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F5F0E8]">
      {toast && <div className="mb-3 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">{toast}</div>}
      <div className="flex items-center gap-2 mb-3">
        <p className="text-sm font-semibold text-[#1A1A1A]">Notifications WhatsApp</p>
        {hasApikey
          ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#7C9A7E' }}>Actif ✓</span>
          : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white bg-[#888]">Non activé</span>}
      </div>

      {hasApikey ? (
        <div>
          <p className="text-xs text-[#888] mb-3">Vous recevrez des notifications pour vos REV, commissions et Fast Start.</p>
          <button onClick={handleTest} disabled={testLoading} className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#25D366' }}>
            {testLoading ? 'Envoi…' : 'Envoyer un message test'}
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          <p className="text-xs text-[#888]">Pour recevoir des notifications automatiques, activez CallMeBot :</p>
          <div className="space-y-2 text-xs">
            {[
              { n: 1, txt: 'Envoyez ce message au +34 644 77 79 95 sur WhatsApp :' },
              { n: 2, txt: '"I allow callmebot to send me messages"' },
              { n: 3, txt: 'Vous recevrez votre apikey par WhatsApp' },
              { n: 4, txt: 'Communiquez cette apikey à votre conseiller L&Lui' },
            ].map(s => (
              <div key={s.n} className="flex gap-2">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: '#C9A84C' }}>{s.n}</span>
                <p className={`text-[#555] ${s.n === 2 ? 'font-mono bg-[#F5F0E8] px-2 py-0.5 rounded' : ''}`}>{s.txt}</p>
              </div>
            ))}
          </div>
          <a href="https://wa.me/34644777995?text=I%20allow%20callmebot%20to%20send%20me%20messages" target="_blank" rel="noopener noreferrer"
            className="block w-full py-2.5 rounded-xl text-sm font-semibold text-white text-center" style={{ background: '#25D366' }}>
            Activer sur WhatsApp →
          </a>
        </div>
      )}
    </div>
  )
}
