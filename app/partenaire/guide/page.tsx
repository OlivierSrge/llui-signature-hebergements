export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getDocument } from '@/actions/documents'
import { db } from '@/lib/firebase'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Download, MessageCircle, AlertTriangle } from 'lucide-react'
import HelpCenterAccordion from '@/components/partner/HelpCenterAccordion'

async function getHelpCenter() {
  const snap = await db.collection('settings').doc('helpCenter').get()
  return snap.exists ? (snap.data() as Record<string, any>) : {}
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default async function PartnerGuidePage() {
  const cookieStore = cookies()
  const partnerId = cookieStore.get('partner_session')?.value
  if (!partnerId) redirect('/partenaire')

  const [notice, helpCenter] = await Promise.all([
    getDocument('notice_partenaire'),
    getHelpCenter(),
  ])

  return (
    <div className="min-h-screen bg-beige-50">
      <header className="bg-white border-b border-beige-200 px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/partenaire/dashboard" className="p-2 rounded-xl hover:bg-beige-50 transition-colors text-dark/50 hover:text-dark">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="text-xs text-dark/40">Espace partenaire</p>
            <h1 className="font-serif text-xl font-semibold text-dark flex items-center gap-2">
              <BookOpen size={18} className="text-gold-500" /> Guide d&apos;utilisation
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Section 1 — Téléchargement notice */}
        <div>
          <h2 className="font-semibold text-dark text-lg mb-4">📄 Notice partenaire</h2>
          <div className="bg-white rounded-2xl border border-beige-200 p-6">
            {notice.url ? (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="text-4xl flex-shrink-0">📘</div>
                  <div>
                    <h3 className="font-semibold text-dark">Guide Partenaire L&amp;Lui Signature</h3>
                    <p className="text-sm text-dark/50 mt-0.5">Tout ce que vous devez savoir pour utiliser votre espace partenaire</p>
                    {notice.uploadedAt && (
                      <p className="text-xs text-dark/30 mt-1">Mis à jour le {formatDate(notice.uploadedAt)}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <a
                    href={notice.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="flex items-center gap-2 px-5 py-3 bg-dark text-white rounded-xl text-sm font-medium hover:bg-dark/80 transition-colors"
                  >
                    <Download size={16} /> Télécharger le Guide Partenaire (PDF)
                  </a>
                  <Link
                    href="/partenaire/messages"
                    className="flex items-center gap-2 px-4 py-3 bg-white border border-beige-200 text-dark/60 rounded-xl text-sm font-medium hover:border-dark/30 transition-colors"
                  >
                    <MessageCircle size={15} /> Poser une question à L&amp;Lui
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <AlertTriangle size={24} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-dark">Notice en cours de préparation</p>
                  <p className="text-sm text-dark/50 mt-1">Le guide partenaire sera disponible prochainement. En attendant, contactez L&amp;Lui via la messagerie pour toute question.</p>
                  <Link
                    href="/partenaire/messages"
                    className="inline-flex items-center gap-2 mt-3 px-4 py-2.5 bg-gold-500 text-white rounded-xl text-sm font-medium hover:bg-gold-600 transition-colors"
                  >
                    <MessageCircle size={15} /> Contacter L&amp;Lui
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 2 — Centre d'aide */}
        <div>
          <h2 className="font-semibold text-dark text-lg mb-4">💬 Centre d&apos;aide</h2>
          <HelpCenterAccordion helpCenter={helpCenter} />
        </div>

      </main>
    </div>
  )
}
