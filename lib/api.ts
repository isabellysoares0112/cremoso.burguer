'use client'

import { supabase } from './supabaseClient'
import type { Product, Order, OrderStatus, Customer, PaymentMethod, CartItem } from './types'

export interface Category {
  id: string
  slug: string
  name: string
  sort_order: number
}

// ---------------- Categories ----------------
export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch('/api/admin/categories', { cache: 'no-store' })
  if (!res.ok) {
    console.error('fetchCategories failed:', await res.text())
    return []
  }
  const json = await res.json()
  return (json.categories || []) as Category[]
}

export async function createCategory(payload: { name: string }): Promise<Category> {
  const res = await fetch('/api/admin/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await res.text())
  const json = await res.json()
  return json.category as Category
}

export async function updateCategory(id: string, payload: { name: string }) {
  const res = await fetch(`/api/admin/categories/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function deleteCategory(id: string) {
  const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await res.text())
}

// ---------------- Products ----------------
export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch('/api/admin/products', { cache: 'no-store' })
  if (!res.ok) {
    console.error('fetchProducts failed:', await res.text())
    return []
  }
  const json = await res.json()
  return (json.products || []) as Product[]
}

export async function fetchActiveProducts(): Promise<Product[]> {
  const all = await fetchProducts()
  return all.filter((p) => p.active)
}

export async function createProduct(input: Omit<Product, 'id'>): Promise<Product> {
  const res = await fetch('/api/admin/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(await res.text())
  const json = await res.json()
  return json.product as Product
}

export async function updateProduct(id: string, input: Partial<Product>): Promise<Product> {
  const res = await fetch(`/api/admin/products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(await res.text())
  const json = await res.json()
  return json.product as Product
}

export async function deleteProduct(id: string) {
  const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await res.text())
}

// ---------------- Image Upload ----------------
export async function uploadProductImage(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/upload', { method: 'POST', body: form })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Upload failed: ${text}`)
  }
  const json = await res.json()
  return json.url as string
}

// ---------------- Orders ----------------
interface OrderApiShape {
  id: string
  number: number
  customer: Customer
  items: CartItem[]
  subtotal: number
  deliveryFee: number
  total: number
  paymentMethod: string
  status: string
  createdAt: string
  updatedAt: string
}

function apiToOrder(o: OrderApiShape): Order {
  return {
    id: o.id,
    number: o.number,
    customer: o.customer,
    items: o.items,
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    total: o.total,
    paymentMethod: o.paymentMethod as PaymentMethod,
    status: o.status as OrderStatus,
    createdAt: new Date(o.createdAt),
    updatedAt: new Date(o.updatedAt),
  }
}

export async function fetchOrders(): Promise<Order[]> {
  const res = await fetch('/api/admin/orders', { cache: 'no-store' })
  if (!res.ok) {
    console.error('fetchOrders failed:', await res.text())
    return []
  }
  const json = await res.json()
  return ((json.orders || []) as OrderApiShape[]).map(apiToOrder)
}

async function nextOrderNumber(): Promise<number> {
  const { data } = await supabase
    .from('pedidos')
    .select('numero_pedido')
    .order('numero_pedido', { ascending: false })
    .limit(1)
  if (!data || data.length === 0) return 1
  return Number((data[0] as { numero_pedido: number }).numero_pedido || 0) + 1
}

export async function createOrder(input: {
  customer: Customer
  items: CartItem[]
  subtotal: number
  deliveryFee: number
  paymentMethod: PaymentMethod
  observation?: string
  discount?: number
  couponCode?: string
}): Promise<Order> {
  const numero_pedido = await nextOrderNumber()
  const discount = input.discount ?? 0
  const observacoes = JSON.stringify({ items: input.items, observation: input.observation || '' })
  const payload = {
    numero_pedido,
    cliente_nome: input.customer.name,
    telefone: input.customer.phone,
    endereco: input.customer.address,
    bairro: input.customer.neighborhood,
    forma_pagamento: input.paymentMethod,
    observacoes,
    status: 'novo',
    subtotal: input.subtotal,
    taxa_entrega: input.deliveryFee,
    total: input.subtotal + input.deliveryFee - discount,
  }
  const { data, error } = await supabase.from('pedidos').insert(payload).select().single()
  if (error) throw error

  // Best-effort: also save customer (anon may be blocked; ignore failure)
  if (input.customer?.name) {
    supabase
      .from('clientes')
      .insert({ nome: input.customer.name, telefone: input.customer.phone })
      .then(({ error: e }) => {
        if (e) console.error('clientes insert error:', e.message)
      })
  }

  return {
    id: data.id,
    number: data.numero_pedido,
    customer: input.customer,
    items: input.items,
    subtotal: input.subtotal,
    deliveryFee: input.deliveryFee,
    total: input.subtotal + input.deliveryFee - discount,
    discount,
    couponCode: input.couponCode,
    paymentMethod: input.paymentMethod,
    status: 'novo' as OrderStatus,
    observation: input.observation || '',
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.created_at),
  }
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  const res = await fetch(`/api/admin/orders/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error(await res.text())
}

export function subscribeToOrders(onChange: () => void) {
  const channelName = `pedidos-changes-${Math.random().toString(36).slice(2)}`
  const channel = supabase.channel(channelName)
  channel
    .on(
      'postgres_changes' as never,
      { event: '*', schema: 'public', table: 'pedidos' },
      () => {
        onChange()
      }
    )
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}
export async function fetchSettings() {
  try {
    const res = await fetch('/api/admin/settings', { cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json()
    return json.settings || null
  } catch {
    return null
  }
}
