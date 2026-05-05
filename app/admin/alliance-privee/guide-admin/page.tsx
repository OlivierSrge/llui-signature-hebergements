import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import GuideAdminClient from './GuideAdminClient'

export const metadata = {
  title: 'Guide Admin Alliance Privée',
}

export default async function GuideAdminPage() {
  const cookieStore = await cookies()
  const adminSession = cookieStore.get('admin_session')
  if (!adminSession?.value) redirect('/admin/login')

  return (
    <div className="min-h-screen bg-[#0E0E14]">
      {/* ── Topbar ────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-[#0E0E14]/90 backdrop-blur-md border-b border-amber-500/10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <nav className="flex items-center gap-2 text-xs text-white/30">
            <Link href="/admin/alliance-privee" className="hover:text-white/60 transition-colors">
              Alliance Privée
            </Link>
            <span>/</span>
            <span className="text-amber-400/70">Guide Admin</span>
          </nav>
          <Link
            href="/admin/alliance-privee"
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            ← Retour dashboard
          </Link>
        </div>
      </div>

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 pt-10 pb-6">
        <p className="text-amber-400/60 text-xs tracking-widest uppercase mb-2">Usage interne — Admin</p>
        <h1 className="text-2xl font-semibold text-white mb-1">Guide Administrateur</h1>
        <p className="text-white/30 text-sm">Alliance Privée · Version 1.0 · Mai 2026</p>
      </div>

      {/* ── Contenu Markdown admin ─────────────────────────────────── */}
      <GuideAdminClient />
    </div>
  )
}
