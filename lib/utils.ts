export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ')
}

export function formatPrice(price: number) {
  return price?.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }) || 'R$ 0,00'
}
