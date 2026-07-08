import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const COOKIE_NAME = 'cremoso-session'
const COOKIE_MAX_AGE = 60 * 60 * 8 // 8 hours

function sign(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('hex')
}

function buildCookieValue(username: string, role: string, secret: string): string {
  const payload = `${username}:${role}`
  const sig = sign(payload, secret)
  return `${payload}:${sig}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const username = String(body?.username || '').trim()
    const password = String(body?.password || '').trim()
    const role = String(body?.role || '').trim()

    const adminUser = process.env.ADMIN_USERNAME
    const adminPass = process.env.ADMIN_PASSWORD
    const entregadorUser = process.env.ENTREGADOR_USERNAME
    const entregadorPass = process.env.ENTREGADOR_PASSWORD
    const secret = process.env.SESSION_SECRET

    if (!secret) {
      console.error('[auth/login] SESSION_SECRET not configured')
      return NextResponse.json({ error: 'Servidor não configurado' }, { status: 500 })
    }

    const normalizedUsername = username.trim().toLowerCase()

    let validUser: { id: string; username: string; role: string } | null = null

    if (
      role === 'admin' &&
      normalizedUsername === adminUser?.trim().toLowerCase() &&
      password === adminPass
    ) {
      validUser = { id: '1', username, role: 'admin' }
    } else if (
      role === 'entregador' &&
      normalizedUsername === entregadorUser?.trim().toLowerCase() &&
      password === entregadorPass
    ) {
      validUser = { id: '2', username, role: 'entregador' }
    }

    if (!validUser) {
      return NextResponse.json({ error: 'Usuário ou senha incorretos' }, { status: 401 })
    }

    const cookieValue = buildCookieValue(validUser.username, validUser.role, secret)
    const isProd = process.env.NODE_ENV === 'production'

    const res = NextResponse.json({ user: validUser })
    res.cookies.set(COOKIE_NAME, cookieValue, {
      httpOnly: true,
      sameSite: 'strict',
      secure: isProd,
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    })

    return res
  } catch (e) {
    console.error('[auth/login] Unexpected error:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
