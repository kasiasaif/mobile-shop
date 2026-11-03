import { Link, useLocation } from 'react-router-dom'
import { OrderAmounts } from '../components/OrderAmounts'
import { OrderProgress } from '../components/OrderProgress'
import { formatPrice } from '../data/site'
import { loadPlacedOrder, type PlacedOrder } from '../lib/account'

export function OrderSuccess() {
  const location = useLocation()
  const fromState = (location.state as { order?: PlacedOrder } | null)?.order
  const order = fromState?.ref ? fromState : loadPlacedOrder()

  if (!order) {
    return (
      <section className="page">
        <div className="shell cart-empty">
          <p className="eyebrow">Order</p>
          <h1>No recent order.</h1>
          <p className="lede">Place an order from your cart and the confirmation will show here.</p>
          <Link className="button" to="/shop">
            Continue shopping
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="page">
      <div className="shell order-success">
        <p className="eyebrow">Order placed</p>
        <h1>Thank you for your order.</h1>
        <p className="lede">
          {order.name ? `${order.name}, your` : 'Your'} order <strong>{order.ref}</strong> is placed.
          We will confirm it by email at {order.email}.
        </p>
        <div className="checkout-review-card">
          <OrderProgress status="placed" />
          <h2>Your order</h2>
          <ul className="checkout-lines">
            {order.lines.map((line) => (
              <li key={line.id}>
                <span>
                  {line.name}
                  <small>
                    {line.quantity} × {line.detail}
                  </small>
                </span>
                <strong>{formatPrice(line.price * line.quantity)}</strong>
              </li>
            ))}
          </ul>
          <OrderAmounts total={order.total} discount={order.discount} totalPaid={order.totalPaid} />
        </div>
        <Link className="button button-solid" to="/shop">
          Continue shopping
        </Link>
      </div>
    </section>
  )
}
