'use client'

import { useEffect, useRef, useState } from 'react'
import { Volume2, Printer, Phone, MapPin } from 'lucide-react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import type { Order, OrderStatus } from '@/lib/types'
import { format } from 'date-fns'

const statusColors: Record<OrderStatus, { bg: string; text: string }> = {
  novo: { bg: 'bg-primary', text: 'text-primary-foreground' },
  preparando: { bg: 'bg-secondary', text: 'text-secondary-foreground' },
  pronto: { bg: 'bg-green-600', text: 'text-white' },
  entregue: { bg: 'bg-muted', text: 'text-muted-foreground' }
}

const statusLabels: Record<OrderStatus, string> = {
  novo: 'NOVO',
  preparando: 'PREPARANDO',
  pronto: 'PRONTO',
  entregue: 'ENTREGUE'
}

function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    oscillator.frequency.value = 880
    oscillator.type = 'sine'
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
    setTimeout(() => {
      const osc2 = audioContext.createOscillator()
      const gain2 = audioContext.createGain()
      osc2.connect(gain2)
      gain2.connect(audioContext.destination)
      osc2.frequency.value = 1046.5
      osc2.type = 'sine'
      gain2.gain.setValueAtTime(0.3, audioContext.currentTime)
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
      osc2.start(audioContext.currentTime)
      osc2.stop(audioContext.currentTime + 0.5)
    }, 200)
  } catch (err) {
    console.error('Audio not supported:', err)
  }
}

export function KitchenPanel() {
  const { orders, updateOrderStatus, loadOrders } = useStore()
  const [soundEnabled, setSoundEnabled] = useState(true)
  const lastOrderCountRef = useRef(orders.length)

  useEffect(() => {
    loadOrders()
    let cleanup: (() => void) | null = null
    import('@/lib/api').then(({ subscribeToOrders }) => {
      cleanup = subscribeToOrders(() => loadOrders())
    })
    return () => {
      if (cleanup) cleanup()
    }
  }, [loadOrders])

  useEffect(() => {
    if (soundEnabled && orders.length > lastOrderCountRef.current) {
      playNotificationSound()
    }
    lastOrderCountRef.current = orders.length
  }, [orders.length, soundEnabled])

  const activeOrders = orders.filter(o => o.status !== 'entregue')

  const formatPrice = (price: number) =>
    price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const handlePrint = (order: Order) => {
    const obsLine = order.observation?.trim()
      ? `\n      OBSERVAÇÃO:\n      ${order.observation.replace(/\n/g, '\n      ')}`
      : ''

    const printContent = `
      CREMOSO BURGUER
      ================
      
      Pedido #${String(order.number).padStart(3, '0')}
      ${format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm')}
      
      Cliente: ${order.customer.name}
      Tel: ${order.customer.phone}
      End: ${order.customer.address}
      Bairro: ${order.customer.neighborhood}
      
      ITENS:
      ${order.items.map((item) => {
        const i = item as { quantity: number; product: { name: string } }
        return `${i.quantity}x ${i.product?.name ?? item}`
      }).join('\n      ')}${obsLine}
      
      Pagamento: ${order.paymentMethod?.toUpperCase()}
      TOTAL: ${formatPrice(order.total)}
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Pedido #${String(order.number).padStart(3, '0')}</title>
            <style>
              body { font-family: monospace; font-size: 14px; padding: 20px; }
              pre { white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <pre>${printContent}</pre>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
    }
  }

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    const flow: OrderStatus[] = ['novo', 'preparando', 'pronto', 'entregue']
    const idx = flow.indexOf(currentStatus)
    return idx < flow.length - 1 ? flow[idx + 1] : null
  }

  const normalizePhone = (raw: string): string => {
    let phone = raw.replace(/\D/g, '')
    if (phone.length === 10 || phone.length === 11) {
      phone = '55' + phone
    }
    return phone
  }

  const handleStatusUpdate = async (order: Order, nextStatus: OrderStatus) => {
    await updateOrderStatus(order.id, nextStatus)
    if (nextStatus === 'pronto') {
      const phone = normalizePhone(order.customer.phone)
      if (phone && phone.length >= 12) {
        const message = `🚚 Seu pedido saiu para entrega!\n🍔 Pedido #${String(order.number).padStart(3, '0')}\nEm breve chegará até você!`
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
      }
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">PAINEL DA COZINHA</h1>
          {activeOrders.some(o => o.status === 'novo') && (
            <span className="px-3 py-1 bg-primary text-primary-foreground text-sm font-bold rounded-full animate-pulse">
              Novo pedido!
            </span>
          )}
        </div>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-2 rounded-lg transition-colors ${
            soundEnabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}
          title={soundEnabled ? 'Desativar som' : 'Ativar som'}
        >
          <Volume2 className="w-5 h-5" />
        </button>
      </div>

      {activeOrders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">Nenhum pedido no momento</p>
          <p className="text-sm">Os novos pedidos aparecerão aqui automaticamente</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {activeOrders.map((order) => {
            const statusStyle = statusColors[order.status]
            const nextStatus = getNextStatus(order.status)

            return (
              <div key={order.id} className="bg-card border border-border rounded-lg overflow-hidden">

                {/* Order Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <div>
                    <span className="text-xl font-bold text-foreground">
                      #{String(order.number).padStart(3, '0')}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {format(new Date(order.createdAt), 'HH:mm')}
                    </span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusStyle.bg} ${statusStyle.text}`}>
                    {statusLabels[order.status]}
                  </span>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  <div className="space-y-2 text-sm">
                    <p className="font-bold text-foreground">{order.customer.name}</p>
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      {order.customer.phone}
                    </p>
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {order.customer.address}
                    </p>
                    <p className="text-muted-foreground pl-6">{order.customer.neighborhood}</p>
                  </div>

                  {/* Items */}
                  <div className="border-t border-border pt-3">
                    <ul className="space-y-1">
                      {order.items.map((item, idx) => {
                        const i = item as { quantity: number; product: { name: string } }
                        return (
                          <li key={idx} className="text-sm text-foreground">
                            {i.quantity}x {i.product?.name}
                          </li>
                        )
                      })}
                    </ul>
                  </div>

                  {/* Observation */}
                  {order.observation && (
                    <div className="border-t border-border pt-3">
                      <p className="text-xs font-bold text-secondary mb-1">OBSERVAÇÃO:</p>
                      <p className="text-sm text-foreground bg-secondary/10 rounded p-2 whitespace-pre-wrap">
                        {order.observation}
                      </p>
                    </div>
                  )}

                  {/* Payment & Total */}
                  <div className="border-t border-border pt-3">
                    <p className="text-sm text-muted-foreground">
                      Pagamento: <span className="text-foreground capitalize">{order.paymentMethod}</span>
                    </p>
                    <p className="text-lg font-bold text-primary">{formatPrice(order.total)}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-border flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrint(order)}
                    className="flex-1"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir
                  </Button>
                  {nextStatus && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusUpdate(order, nextStatus)}
                      className={`flex-1 ${
                        nextStatus === 'preparando'
                          ? 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                          : nextStatus === 'pronto'
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-muted text-muted-foreground hover:bg-muted/90'
                      }`}
                    >
                      {statusLabels[nextStatus]}
                    </Button>
                  )}
                </div>

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
