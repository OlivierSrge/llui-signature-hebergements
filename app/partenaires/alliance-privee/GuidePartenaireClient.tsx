'use client'

import MarkdownRenderer from '@/components/MarkdownRenderer'

export default function GuidePartenaireClient() {
  return (
    <MarkdownRenderer
      filename="ALLIANCE_PARTENAIRE.md"
      theme="premium"
      showTOC={true}
    />
  )
}
