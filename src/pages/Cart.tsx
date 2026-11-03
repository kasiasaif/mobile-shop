import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckoutModal } from '../components/CheckoutModal'
import { useCart } from '../context/CartContext'
import { formatPrice, productDetail } from '../data/site'

export function Cart() {
  const { lines, total, count, setQuantity, remove, clear } = useCart()
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  return (
    <section className="page">
      {count === 0 ? (
        <div className="shell cart-empty">
          <p className="eyebrow">Cart</p>
          <h1>Your cart is empty.</h1>
          <p className="lede">Add a battery or LCD from the shop, then come back here.</p>
          <Link className="button" to="/shop">
            Continue shopping
          </Link>
        </div>
      ) : (
        <div className="shell cart-layout">
          <div>
            <p className="eyebrow">Cart</p>
            <h1>
              {count} item{count === 1 ? '' : 's'}
            </h1>

            <ul className="cart-lines">
              {lines.map((line) => (
                <li key={line.product.id} className="cart-line">
                  <img className="cart-swatch" src={line.product.image} alt="" />
                  <div>
                    <h2>{line.product.name}</h2>
                    <p className="muted">{productDetail(line.product)}</p>
                    <p className="product-price">
                      <strong>{formatPrice(line.product.price)}</strong>
                    </p>
                    <div className="qty-row">
                      <button
                        type="button"
                        className="qty-btn"
                        aria-label={`Fewer ${line.product.name}`}
                        onClick={() => setQuantity(line.product.id, line.quantity - 1)}
                      >
                        −
                      </button>
                      <span>{line.quantity}</span>
                      <button
                        type="button"
                        className="qty-btn"
                        aria-label={`More ${line.product.name}`}
                        onClick={() => setQuantity(line.product.id, line.quantity + 1)}
                      >
                        +
                      </button>
                      <button type="button" className="text-btn" onClick={() => remove(line.product.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <aside className="cart-summary">
            <h2>Order summary</h2>
            <p className="cart-total">
              <span>Total</span>
              <strong>{formatPrice(total)}</strong>
            </p>
            <p className="muted">Log in or create an account to place this order.</p>
            <button className="button button-solid button-block" type="button" onClick={() => setCheckoutOpen(true)}>
              Place order
            </button>
            <Link className="button button-ghost button-block" to="/shop">
              Continue shopping
            </Link>
            <button className="text-btn" type="button" onClick={clear}>
              Empty cart
            </button>
          </aside>
        </div>
      )}
      {checkoutOpen ? (
        <CheckoutModal onClose={() => setCheckoutOpen(false)} onPlaced={clear} />
      ) : null}
    </section>
  )
}
