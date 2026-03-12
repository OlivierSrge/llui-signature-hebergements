export const dynamic = 'force-dynamic'

import { getAllDocuments } from '@/actions/documents'
import { db } from '@/lib/firebase'
import DocumentsManager from '@/components/admin/DocumentsManager'
import HelpCenterAdmin from '@/components/admin/HelpCenterAdmin'
import { FolderOpen, HelpCircle } from 'lucide-react'
import Link from 'next/link'

async function getHelpCenter() {
  const snap = await db.collection('settings').doc('helpCenter').get()
  return snap.exists ? snap.data() : {}
}

export const metadata = { title: 'Documents & Centre d\'aide' }

export default async function AdminDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const sp = await searchParams
  const tab = sp.tab === 'aide' ? 'aide' : 'documents'

  const [documents, helpCenter] = await Promise.all([
    getAllDocuments(),
    getHelpCenter(),
  ])

  return (
    <div className="p-6 sm:p-8 mt-14 lg:mt-0">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-dark">Documents & Centre d&apos;aide</h1>
        <p className="text-dark/50 text-sm mt-1">Gérez les notices téléchargeables et les FAQ partenaires</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-beige-200">
        <Link
          href="/admin/documents"
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            tab === 'documents'
              ? 'border-dark text-dark'
              : 'border-transparent text-dark/50 hover:text-dark'
          }`}
        >
          <FolderOpen size={15} /> Documents PDF
        </Link>
        <Link
          href="/admin/documents?tab=aide"
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            tab === 'aide'
              ? 'border-dark text-dark'
              : 'border-transparent text-dark/50 hover:text-dark'
          }`}
        >
          <HelpCircle size={15} /> Centre d&apos;aide
        </Link>
      </div>

      {tab === 'documents' ? (
        <DocumentsManager documents={documents} />
      ) : (
        <HelpCenterAdmin initialData={helpCenter as any} />
      )}
    </div>
  )
}
