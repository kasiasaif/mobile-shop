import { formatMoney } from '../lib/vouchers'

type OrderAmountsProps = {
  total: number
  discount?: number
  totalPaid?: number
}

export function OrderAmounts({ total, discount = 0, totalPaid }: OrderAmountsProps) {
  const off = Math.min(Math.max(0, total), Math.max(0, discount))
  const paid = totalPaid ?? Math.round((total - off) * 100) / 100
  return (
    <div className="order-amounts">
      {off > 0 ? (
        <>
          <p>
            <span>Total</span>
            <strong>{formatMoney(total)}</strong>
          </p>
          <p>
            <span>Discount</span>
            <strong>−{formatMoney(off)}</strong>
          </p>
        </>
      ) : null}
      <p className="order-amounts-paid">
        <span>Total paid</span>
        <strong>{formatMoney(paid)}</strong>
      </p>
    </div>
  )
}
