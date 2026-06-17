import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { id } = params

  const updates: Record<string, unknown> = {}
  if (typeof body.ativo === 'boolean') updates.ativo = body.ativo
  if (body.codigo !== undefined) updates.codigo = String(body.codigo).trim().toUpperCase()
  if (body.desconto_tipo !== undefined) updates.desconto_tipo = body.desconto_tipo
  if (body.desconto_valor !== undefined) updates.desconto_valor = parseFloat(body.desconto_valor)
  if (body.validade !== undefined) updates.validade = body.validade || null
  if (body.limite_uso !== undefined) updates.limite_uso = body.limite_uso ? parseInt(body.limite_uso) : null

  const { data, error } = await supabaseAdmin
    .from('cupons')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ cupom: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await supabaseAdmin
    .from('cupons')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
