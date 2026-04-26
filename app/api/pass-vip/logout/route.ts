// app/api/pass-vip/logout/route.ts — Supprime le cookie de session

import { NextResponse } from 'next/server'
import { PASS_VIP_COOKIE } from '@/lib/pass-vip-helpers'

export async function POST(): Promise<NextResponse> {
  const res = NextResponse.json({ success: true })
  res.cookies.delete(PASS_VIP_COOKIE)
  return res
}
