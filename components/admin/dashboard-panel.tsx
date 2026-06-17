'use client'

import { useEffect, useState, useCallback } from 'react'
import { ShoppingBag, Clock, ChefHat, Package, Truck, RefreshCw, TrendingUp } from 'lucide-react'
import { useStore } from '@/lib/store'
import type { OrderStatus } from '@/lib/types'

interface OrderRow {
  id: string
  number: number
  status: OrderStatus
  total: number
  createdAt: string
  customer: { name: string }
}

const statusConfig: Record<OrderStatus, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  novo:      { label: 'Novos',      icon: ShoppingBag, color: 'text-primary',    bg: 'bg-primary/10' },
  preparando:{ label: 'Preparando', icon: ChefHat,     color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  pronto:    { label: 'Prontos',    icon: Package,     color: 'text-green-400',  bg: 'bg-green-400/10' },
  entregue:  { label: 'Entregues',  icon: Truck,       color: 'text-muted-foreground', bg: 'bg-muted/50' },
}

function avgDeliveryMinutes(orders: OrderRow[]): number | null {
  const delivered = orders.filter(o => o.status === 'entregue')
  if (delivered.length === 0) return null
  const avg = delivered.reduce((s, o) => {
    const mins = (Date.now() - new Date(o.createdAt).getTime()) / 60000
    return s + Math.min(mins, 120)
  }, 0) / delivered.length
  return Math.round(avg)
}

export function DashboardPanel() {
  const { orders, loadOrders } = useStore()
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      await loadOrders()
      setLastRefresh(new Date())
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [loadOrders])

  useEffect(() => {
    load()
    let cleanup: (() => void) | null = null
    import('@/lib/api').then(({ subscribeToOrders }) => {
      cleanup = subscribeToOrders(() => loadOrders())
    })
    return () => { if (cleanup) cleanup() }
  }, [load, loadOrders])

  const todayStr = new Date().toISOString().slice(0, 10)
  const todayOrders = orders.filter(o => {
    const d = o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 10) : ''
    return d === todayStr
  })

  const counts: Record<OrderStatus, number> = {
    novo:       orders.filter(o => o.status === 'novo').length,
    preparando: orders.filter(o => o.status === 'preparando').length,
    pronto:     orders.filter(o => o.status === 'pronto').length,
    entregue:   orders.filter(o => o.status === 'entregue').length,
  }

  const todayRevenue = todayOrders.reduce((s, o) => s + (o.total || 0), 0)
  const avgMins = avgDeliveryMinutes(todayOrders as OrderRow[])

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const fmtTime = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-x-hidden">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">DASHBOARD</h1>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {fmtTime(lastRefresh)}
        </button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(Object.keys(statusConfig) as OrderStatus[]).map(s => {
          const { label, icon: Icon, color, bg } = statusConfig[s]
          return (
            <div key={s} className={`rounded-xl border border-border p-4 ${bg}`}>
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className={`text-2xl font-black ${color}`}>{counts[s]}</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium">{label}</p>
            </div>
          )
        })}
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Faturamento hoje</p>
            <p className="text-lg font-bold text-primary">{fmt(todayRevenue)}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-yellow-400/10 rounded-lg flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pedidos hoje</p>
            <p className="text-lg font-bold text-foreground">{todayOrders.length}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-green-400/10 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tempo médio entrega</p>
            <p className="text-lg font-bold text-foreground">
              {avgMins !== null ? `~${avgMins} min` : '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
