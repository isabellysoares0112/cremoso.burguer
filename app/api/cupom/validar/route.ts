import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const codigo = String(body?.codigo || '').trim().toUpperCase()

  if (!codigo) return NextResponse.json({ error: 'Código obrigatório' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('cupons')
    .select('*')
    .eq('codigo', codigo)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Cupom não encontrado' }, { status: 404 })
  }

  if (!data.ativo) {
    return NextResponse.json({ error: 'Cupom inativo' }, { status: 400 })
  }

  if (data.validade) {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const validade = new Date(data.validade + 'T00:00:00')
    if (validade < hoje) {
      return NextResponse.json({ error: 'Cupom expirado' }, { status: 400 })
    }
  }

  if (data.limite_uso !== null && data.uso_atual >= data.limite_uso) {
    return NextResponse.json({ error: 'Cupom esgotado' }, { status: 400 })
  }

  return NextResponse.json({
    cupom: {
      id: data.id,
      codigo: data.codigo,
      desconto_tipo: data.desconto_tipo,
      desconto_valor: data.desconto_valor,
    },
  })
}
