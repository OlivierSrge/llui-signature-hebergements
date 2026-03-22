'use client'
// Bandeau affiché dans le portail quand l'admin accède en mode impersonation

interface Props { nomsMaries: string }

export default function AdminBandeau({ nomsMaries }: Props) {
  async function quitter() {
    await fetch('/api/admin/quitter-impersonation', { method: 'POST' })
    window.location.href = '/admin/ecosysteme'
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 text-sm"
      style={{ background: '#C9A84C', color: '#1A1A1A' }}>
      <span className="font-semibold">👁 Mode admin — Vous consultez l&apos;espace de <strong>{nomsMaries}</strong></span>
      <button onClick={quitter}
        className="ml-4 px-3 py-1 rounded-lg text-xs font-bold bg-[#1A1A1A] text-white whitespace-nowrap hover:bg-[#333] transition-colors">
        Quitter →
      </button>
    </div>
  )
}
