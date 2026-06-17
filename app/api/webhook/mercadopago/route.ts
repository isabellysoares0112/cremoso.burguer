import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('[Webhook MP] Notificação recebida:', JSON.stringify(body))

    const type = body?.type
    const paymentId = body?.data?.id

    if (type !== 'payment' || !paymentId) {
      console.log('[Webhook MP] Ignorado — type:', type, 'paymentId:', paymentId)
      return NextResponse.json({ ok: true })
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!accessToken) {
      console.error('[Webhook MP] MERCADOPAGO_ACCESS_TOKEN não configurado')
      return NextResponse.json({ error: 'token MP ausente' }, { status: 500 })
    }

    // Busca detalhes do pagamento no Mercado Pago
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const payment = await mpRes.json()
    console.log(`[Webhook MP] Payment ${paymentId} — status: ${payment.status}, ref: ${payment.external_reference}`)

    if (payment.status !== 'approved') {
      console.log('[Webhook MP] Não aprovado, ignorando.')
      return NextResponse.json({ ok: true })
    }

    const orderNumber = Number(payment.external_reference)
    if (!orderNumber || isNaN(orderNumber)) {
      console.error('[Webhook MP] external_reference inválido:', payment.external_reference)
      return NextResponse.json({ error: 'external_reference inválido' }, { status: 400 })
    }

    // Atualiza status via REST do Supabase (sem importar supabaseAdmin)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[Webhook MP] Supabase env vars ausentes')
      return NextResponse.json({ error: 'supabase não configurado' }, { status: 500 })
    }

    const updateRes = await fetch(
      `${supabaseUrl}/rest/v1/pedidos?numero_pedido=eq.${orderNumber}`,
      {
        method: 'PATCH',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ status: 'preparando' }),
      }
    )

    if (!updateRes.ok) {
      const errText = await updateRes.text()
      console.error('[Webhook MP] Erro ao atualizar pedido:', errText)
      return NextResponse.json({ error: 'erro ao atualizar pedido' }, { status: 500 })
    }

    console.log(`[Webhook MP] Pedido #${orderNumber} atualizado para "preparando"`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Webhook MP] Erro interno:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'Mercado Pago Webhook' })
}
