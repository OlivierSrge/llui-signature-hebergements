'use client'

import { useEffect } from 'react'

export default function KribiScanTracker() {
  useEffect(() => {
    fetch('/api/kribi/scan', { method: 'POST' }).catch(() => {})
  }, [])

  return null
}
