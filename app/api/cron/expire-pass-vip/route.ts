import { NextRequest, NextResponse } from 'next/server'
import { expirePassVip, notifierPassVipJ3 } from '@/actions/pass-vip'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [expireResult, notifResult] = await Promise.all([
      expirePassVip(),
      notifierPassVipJ3(),
    ])
    return NextResponse.json({
      ok: true,
      expired: expireResult.expired_count,
      notified: notifResult.notified_count,
    })
  } catch (e: unknown) {
    console.error('[cron/expire-pass-vip]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
