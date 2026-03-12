'use server'

import { db } from '@/lib/firebase'
import { revalidatePath } from 'next/cache'
import { DEFAULT_HELP_CATEGORIES, type HelpCategory } from '@/lib/helpCenterDefaults'

export async function getHelpCenterData(): Promise<HelpCategory[]> {
  const snap = await db.collection('settings').doc('helpCenter').get()
  if (!snap.exists) return DEFAULT_HELP_CATEGORIES

  const stored = snap.data() as Record<string, any>
  return DEFAULT_HELP_CATEGORIES.map((cat) => {
    if (!stored[cat.id]) return cat
    const storedCat = stored[cat.id]
    return {
      ...cat,
      title: storedCat.title ?? cat.title,
      items: cat.items.map((item) => {
        const storedItem = storedCat.items?.find((si: any) => si.id === item.id)
        if (!storedItem) return item
        return { ...item, question: storedItem.question ?? item.question, answer: storedItem.answer ?? item.answer }
      }),
    }
  })
}

export async function saveHelpCenterCategory(
  categoryId: string,
  data: { title?: string; items: Array<{ id: string; question: string; answer: string }> }
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection('settings').doc('helpCenter').set(
      { [categoryId]: data },
      { merge: true }
    )
    revalidatePath('/partenaire/guide')
    revalidatePath('/admin/documents')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
