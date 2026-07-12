import { NextResponse } from 'next/server'
import { broadcastOrdersChanged } from '@/lib/broadcast-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  await broadcastOrdersChanged()
  return NextResponse.json({ ok: true })
}
