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
    .select('id, uso_atual, limite_uso')
    .eq('codigo', codigo)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Cupom não encontrado' }, { status: 404 })

  const { error: updateError } = await supabaseAdmin
    .from('cupons')
    .update({ uso_atual: (data.uso_atual ?? 0) + 1 })
    .eq('id', data.id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
