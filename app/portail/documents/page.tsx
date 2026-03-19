// app/portail/documents/page.tsx
// Coffre à documents — PDF & ressources L&Lui Signature

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getDb } from '@/lib/firebase'

interface Document {
  id: string
  nom: string
  type: 'CONTRAT' | 'GUIDE' | 'DEVIS' | 'FACTURE' | 'AUTRE'
  url: string
  taille_kb?: number
  created_at: { toDate: () => Date } | null
}

const TYPE_LABELS: Record<string, string> = {
  CONTRAT: 'Contrat',
  GUIDE: 'Guide',
  DEVIS: 'Devis',
  FACTURE: 'Facture',
  AUTRE: 'Document',
}

const TYPE_COLORS: Record<string, string> = {
  CONTRAT: '#C0392B',
  GUIDE: '#0F52BA',
  DEVIS: '#C9A84C',
  FACTURE: '#7C9A7E',
  AUTRE: '#888888',
}

const DOCUMENTS_STATIQUES = [
  {
    id: 'guide-affiliation',
    nom: 'Guide du Partenaire L&Lui',
    type: 'GUIDE' as const,
    url: '/documents/guide-partenaire.pdf',
    taille_kb: 1240,
  },
  {
    id: 'guide-rev',
    nom: 'Manuel des REV et Commissions',
    type: 'GUIDE' as const,
    url: '/documents/guide-rev.pdf',
    taille_kb: 856,
  },
  {
    id: 'conditions-generales',
    nom: 'Conditions Générales de Vente',
    type: 'CONTRAT' as const,
    url: '/documents/cgv.pdf',
    taille_kb: 420,
  },
]

async function getDocumentsData() {
  try {
    const cookieStore = cookies()
    const uid = cookieStore.get('portail_uid')?.value
    if (!uid) redirect('/portail/login')
    const db = getDb()
    const snap = await db
      .collection('portail_users').doc(uid)
      .collection('documents')
      .orderBy('created_at', 'desc')
      .limit(20)
      .get()
    const docs: Document[] = snap.docs.map(doc => ({
      id: doc.id,
      nom: doc.data().nom ?? 'Document',
      type: doc.data().type ?? 'AUTRE',
      url: doc.data().url ?? '',
      taille_kb: doc.data().taille_kb,
      created_at: doc.data().created_at ?? null,
    }))
    return { uid, docs }
  } catch {
    redirect('/portail/login')
  }
}

export default async function DocumentsPage() {
  const { docs } = await getDocumentsData()
  const tousDocs = [...DOCUMENTS_STATIQUES, ...docs.map(d => ({ ...d, created_at: undefined }))]

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="font-serif italic text-2xl text-[#1A1A1A] mb-1">Mes Documents</h1>
      <p className="text-sm text-[#888] mb-6">{tousDocs.length} document(s) disponible(s)</p>

      {/* Documents par type */}
      {(['GUIDE', 'DEVIS', 'CONTRAT', 'FACTURE', 'AUTRE'] as const).map(type => {
        const groupe = tousDocs.filter(d => d.type === type)
        if (groupe.length === 0) return null
        return (
          <div key={type} className="mb-5">
            <p
              className="text-xs font-semibold uppercase tracking-wide mb-2 px-1"
              style={{ color: TYPE_COLORS[type] }}
            >
              {TYPE_LABELS[type]}s
            </p>
            <div className="space-y-2">
              {groupe.map(doc => (
                <a
                  key={doc.id}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm border border-[#F5F0E8] hover:shadow-md transition-all group"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                    style={{ background: TYPE_COLORS[type] + '18' }}
                  >
                    {type === 'GUIDE' ? '📖' : type === 'DEVIS' ? '📋' : type === 'CONTRAT' ? '📜' : type === 'FACTURE' ? '🧾' : '📄'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1A1A] truncate">{doc.nom}</p>
                    {doc.taille_kb && (
                      <p className="text-[11px] text-[#888]">{doc.taille_kb > 1000 ? `${(doc.taille_kb / 1024).toFixed(1)} Mo` : `${doc.taille_kb} Ko`}</p>
                    )}
                  </div>
                  <span className="text-[11px] text-[#C9A84C] group-hover:underline flex-shrink-0">
                    Télécharger
                  </span>
                </a>
              ))}
            </div>
          </div>
        )
      })}

      {tousDocs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">📂</p>
          <p className="text-sm text-[#888]">Aucun document disponible pour le moment</p>
        </div>
      )}
    </div>
  )
}
