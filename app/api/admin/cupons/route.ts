import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('cupons')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ cupons: [], needsSetup: true })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ cupons: data ?? [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const codigo = String(body?.codigo || '').trim().toUpperCase()
  const desconto_tipo = body?.desconto_tipo
  const desconto_valor = parseFloat(body?.desconto_valor ?? 0)
  const validade = body?.validade || null
  const limite_uso = body?.limite_uso ? parseInt(body.limite_uso) : null

  if (!codigo) return NextResponse.json({ error: 'Código obrigatório' }, { status: 400 })
  if (!['percentual', 'fixo'].includes(desconto_tipo))
    return NextResponse.json({ error: 'Tipo de desconto inválido' }, { status: 400 })
  if (desconto_valor <= 0)
    return NextResponse.json({ error: 'Valor de desconto deve ser positivo' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('cupons')
    .insert({ codigo, desconto_tipo, desconto_valor, validade, limite_uso, uso_atual: 0, ativo: true })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Código já existe' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ cupom: data }, { status: 201 })
}
