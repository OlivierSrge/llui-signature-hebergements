'use client'

import MarkdownRenderer from '@/components/MarkdownRenderer'

export default function CharteClient() {
  return (
    <MarkdownRenderer
      filename="ALLIANCE_CHARTE.md"
      theme="legal"
      showTOC={true}
    />
  )
}
