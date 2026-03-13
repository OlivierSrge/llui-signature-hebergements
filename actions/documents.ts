'use server'

import { db } from '@/lib/firebase'
import { revalidatePath } from 'next/cache'

export type DocKey = 'notice_partenaire' | 'notice_client' | 'notice_administrateur'

export interface StoredDocument {
  key: DocKey
  label: string
  url: string | null
  uploadedAt: string | null
  size: number | null // bytes
  updatedBy: string | null
}

const DOC_LABELS: Record<DocKey, string> = {
  notice_partenaire: 'Guide Partenaire',
  notice_client: 'Notice Client',
  notice_administrateur: 'Notice Administrateur',
}

export async function getDocument(key: DocKey): Promise<StoredDocument> {
  const snap = await db.collection('settings').doc('documents').get()
  const d = snap.exists ? snap.data()! : {}
  const entry = d[key] as any || {}
  return {
    key,
    label: DOC_LABELS[key],
    url: entry.url ?? null,
    uploadedAt: entry.uploadedAt ?? null,
    size: entry.size ?? null,
    updatedBy: entry.updatedBy ?? null,
  }
}

export async function getAllDocuments(): Promise<StoredDocument[]> {
  const snap = await db.collection('settings').doc('documents').get()
  const d = snap.exists ? snap.data()! : {}
  return (['notice_partenaire', 'notice_client', 'notice_administrateur'] as DocKey[]).map((key) => {
    const entry = d[key] as any || {}
    return {
      key,
      label: DOC_LABELS[key],
      url: entry.url ?? null,
      uploadedAt: entry.uploadedAt ?? null,
      size: entry.size ?? null,
      updatedBy: entry.updatedBy ?? null,
    }
  })
}

export async function saveDocumentMeta(
  key: DocKey,
  url: string,
  size: number,
  updatedBy = 'admin'
): Promise<void> {
  await db.collection('settings').doc('documents').set(
    {
      [key]: {
        url,
        size,
        updatedBy,
        uploadedAt: new Date().toISOString(),
      },
    },
    { merge: true }
  )
  revalidatePath('/admin/documents')
  revalidatePath('/partenaire/guide')
}
