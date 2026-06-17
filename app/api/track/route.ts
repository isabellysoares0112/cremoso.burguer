import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const numero = searchParams.get('numero')
  const telefone = searchParams.get('telefone')

  if (!numero && !telefone) {
    return NextResponse.json({ error: 'Informe o número do pedido ou telefone.' }, { status: 400 })
  }

  let query = supabaseAdmin.from('pedidos').select('*')

  if (numero && telefone) {
    query = query.eq('numero_pedido', Number(numero)).eq('telefone', telefone)
  } else if (numero) {
    query = query.eq('numero_pedido', Number(numero))
  } else if (telefone) {
    query = query.eq('telefone', telefone)
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(5)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Pedido não encontrado. Verifique os dados informados.' }, { status: 404 })
  }

  return NextResponse.json({ orders: data })
}
