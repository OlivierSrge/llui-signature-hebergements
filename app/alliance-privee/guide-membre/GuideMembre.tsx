'use client'

import MarkdownRenderer from '@/components/MarkdownRenderer'

export default function GuideMembre() {
  return (
    <MarkdownRenderer
      filename="ALLIANCE_MEMBRE.md"
      theme="premium"
      showTOC={true}
    />
  )
}
