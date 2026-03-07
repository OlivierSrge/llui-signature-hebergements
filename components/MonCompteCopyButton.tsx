'use client'

import { useState } from 'react'
import { Copy, CheckCircle } from 'lucide-react'

export default function MonCompteCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
        copied
          ? 'bg-green-500 text-white'
          : 'bg-dark text-white hover:bg-dark/80'
      }`}
    >
      {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
      {copied ? 'Copié !' : 'Copier le code'}
    </button>
  )
}
