'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, LogOut, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react'

// ── Bouton Déconnexion ──────────────────────────────────────────
export function LogoutButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  async function handleLogout() {
    startTransition(async () => {
      await fetch('/api/client/logout', { method: 'POST' })
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className="flex items-center gap-2 px-3 py-2 rounded-xl border border-beige-200 text-dark/50 hover:text-dark hover:bg-beige-50 text-xs transition-colors"
    >
      {isPending ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
      Déconnexion
    </button>
  )
}

// ── Formulaire changement de PIN ──────────────────────────────
export function ChangePinForm({ hasPermanentPin }: { hasPermanentPin: boolean }) {
  const [open, setOpen] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ currentPin: '', newPin: '', confirmPin: '' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.newPin !== form.confirmPin) {
      setResult({ success: false, message: 'Les deux PINs ne correspondent pas' })
      return
    }
    if (!/^\d{4,6}$/.test(form.newPin)) {
      setResult({ success: false, message: 'Le PIN doit contenir 4 à 6 chiffres' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/client/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin: form.currentPin, newPin: form.newPin }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResult({ success: false, message: data.error || 'Erreur' })
      } else {
        setResult({ success: true, message: 'Code PIN mis à jour avec succès !' })
        setForm({ currentPin: '', newPin: '', confirmPin: '' })
        setTimeout(() => { setOpen(false); setResult(null) }, 2500)
      }
    } catch {
      setResult({ success: false, message: 'Erreur de connexion' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-beige-200 text-dark/50 hover:text-dark hover:bg-beige-50 text-xs transition-colors"
        >
          <Lock size={13} /> {hasPermanentPin ? 'Modifier mon PIN' : 'Définir un PIN mémorisable'}
        </button>
      ) : (
        <div className="bg-white rounded-2xl border border-beige-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-dark text-sm flex items-center gap-2">
              <Lock size={14} className="text-gold-500" />
              {hasPermanentPin ? 'Modifier mon PIN' : 'Créer un PIN mémorisable'}
            </h3>
            <button onClick={() => { setOpen(false); setResult(null) }} className="text-dark/30 hover:text-dark text-sm">✕</button>
          </div>
          <p className="text-xs text-dark/50 mb-4">
            {hasPermanentPin
              ? 'Définissez un nouveau code PIN de 4 à 6 chiffres pour sécuriser votre espace.'
              : 'Créez un PIN mémorisable (4 à 6 chiffres) pour vous connecter plus rapidement à chaque visite.'}
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            {hasPermanentPin && (
              <div>
                <label className="block text-xs font-medium text-dark/60 mb-1">PIN actuel *</label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="\d{4,6}"
                    maxLength={6}
                    required
                    value={form.currentPin}
                    onChange={(e) => setForm((p) => ({ ...p, currentPin: e.target.value.replace(/\D/g, '') }))}
                    placeholder="• • • •"
                    className="input-field w-full pr-10 tracking-widest font-mono"
                  />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark/30">
                    {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-dark/60 mb-1">Nouveau PIN * (4–6 chiffres)</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="\d{4,6}"
                  maxLength={6}
                  required
                  value={form.newPin}
                  onChange={(e) => setForm((p) => ({ ...p, newPin: e.target.value.replace(/\D/g, '') }))}
                  placeholder="• • • •"
                  className="input-field w-full pr-10 tracking-widest font-mono"
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark/30">
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-dark/60 mb-1">Confirmer le nouveau PIN *</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="\d{4,6}"
                maxLength={6}
                required
                value={form.confirmPin}
                onChange={(e) => setForm((p) => ({ ...p, confirmPin: e.target.value.replace(/\D/g, '') }))}
                placeholder="• • • •"
                className="input-field w-full tracking-widest font-mono"
              />
            </div>
            {result && (
              <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {result.success && <CheckCircle size={14} />}
                {result.message}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2.5 bg-dark text-white rounded-xl text-sm font-medium hover:bg-dark/80 disabled:opacity-50">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                {loading ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button type="button" onClick={() => { setOpen(false); setResult(null) }} className="px-4 py-2.5 border border-beige-200 rounded-xl text-sm text-dark/60 hover:bg-beige-50">
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
