import { shopApiUrl } from './catalogApi'

export type DiscountOffer = {
  name: string
  code: string
  type: 1 | 2
  value: number
  percentage: number
}

export async function checkDiscountCode(code: string): Promise<DiscountOffer | { error: string }> {
  try {
    const response = await fetch(shopApiUrl('/api/vouchers/check'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const data = (await response.json()) as Partial<DiscountOffer> & { error?: string }
    if (!response.ok || !data.name || !data.code) {
      return { error: data.error ?? 'That discount code is not valid.' }
    }
    return {
      name: data.name,
      code: data.code,
      type: Number(data.type) === 2 ? 2 : 1,
      value: Number(data.value) || 0,
      percentage: Number(data.percentage) || 0,
    }
  } catch {
    return { error: 'Could not check that discount code.' }
  }
}

export function discountOff(subtotal: number, value: number, percentage: number, type: 1 | 2 | 0 = 0) {
  const base = Math.max(0, Math.round(subtotal * 100))
  const percentOff = type === 2 ? 0 : Math.round((base * percentage) / 100)
  const valueOff = type === 1 ? 0 : Math.round(value * 100)
  return Math.min(base, Math.max(0, percentOff) + Math.max(0, valueOff)) / 100
}

export function formatMoney(value: number) {
  const whole = Math.abs(value - Math.round(value)) < 0.001
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(value)
}
