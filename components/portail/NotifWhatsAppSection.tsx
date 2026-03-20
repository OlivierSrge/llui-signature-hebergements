'use client'
// components/portail/NotifWhatsAppSection.tsx
// Notifications WhatsApp Green API — toujours actif, pas d'apikey par utilisateur

import { useState, useEffect } from 'react'

export default function NotifWhatsAppSection({ uid }: { uid: string }) {
  const [telephone, setTelephone] = useState<string>('')
  const [testLoading, setTestLoading] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetch('/api/portail/notif-whatsapp/status?uid=' + uid)
      .then(r => r.json())
      .then(d => setTelephone(d.telephone ?? ''))
      .catch(() => {})
  }, [uid])

  const handleTest = async () => {
    setTestLoading(true)
    try {
      await fetch('/api/portail/notif-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, type: 'BIENVENUE', data: {} }),
      })
      setToast('Message envoyé ✓')
    } catch {
      setToast('Erreur lors de l\'envoi')
    }
    setTimeout(() => setToast(''), 3000)
    setTestLoading(false)
  }

  const displayPhone = telephone
    ? telephone.replace(/^237/, '+237 ').replace(/(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3')
    : '+237 XXXXXXXXX'

  return (
    <div className="bg-[#1A1A1A] rounded-2xl p-5 text-white">
      {toast && (
        <div className="mb-3 text-xs text-green-400 bg-green-400/10 rounded-lg px-3 py-2">
          {toast}
        </div>
      )}
      <div className="flex items-center gap-2 mb-3">
        <p className="text-sm font-semibold">Notifications WhatsApp</p>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#25D366' }}>
          ✓ Actif
        </span>
      </div>
      <p className="text-xs text-white/60 mb-4">
        Vous recevrez des notifications automatiques sur votre numéro{' '}
        <span className="text-white font-semibold">{displayPhone}</span>
      </p>
      <button
        onClick={handleTest}
        disabled={testLoading}
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
        style={{ background: '#25D366' }}
      >
        {testLoading ? 'Envoi…' : 'Envoyer un message test'}
      </button>
    </div>
  )
}
