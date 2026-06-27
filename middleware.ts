import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'cremoso-session'

async function hmacSha256(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function verifySession(cookieValue: string, secret: string): Promise<boolean> {
  const parts = cookieValue.split(':')
  if (parts.length < 3) return false

  const sig = parts[parts.length - 1]
  const payload = parts.slice(0, -1).join(':')

  try {
    const expected = await hmacSha256(secret, payload)
    if (sig.length !== expected.length) return false

    let diff = 0
    for (let i = 0; i < sig.length; i++) {
      diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i)
    }
    return diff === 0
  } catch {
    return false
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const secret = process.env.SESSION_SECRET

  const isApiAdmin = pathname.startsWith('/api/admin/')
  const isPageAdmin = pathname.startsWith('/equipe/admin/')

  if (!isApiAdmin && !isPageAdmin) {
    return NextResponse.next()
  }

  if (!secret) {
    console.error('[middleware] SESSION_SECRET não configurado')
    if (isApiAdmin) {
      return NextResponse.json({ error: 'Servidor não configurado' }, { status: 500 })
    }
    return NextResponse.redirect(new URL('/equipe', req.url))
  }

  const cookieValue = req.cookies.get(COOKIE_NAME)?.value ?? ''
  const valid = cookieValue !== '' && (await verifySession(cookieValue, secret))

  if (!valid) {
    if (isApiAdmin) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/equipe', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/admin/:path*',
    '/equipe/admin/:path*',
  ],
}
