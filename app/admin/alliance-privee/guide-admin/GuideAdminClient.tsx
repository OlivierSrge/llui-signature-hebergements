'use client'

import MarkdownRenderer from '@/components/MarkdownRenderer'

export default function GuideAdminClient() {
  return (
    <MarkdownRenderer
      filename="ALLIANCE_ADMIN.md"
      theme="admin"
      showTOC={true}
    />
  )
}
