import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { formatPrice, isOutOfStock, labelForCategory, productDetail, stockStatusLabel, type Product } from '../data/site'
import { useCategories } from '../lib/categories'

type ProductCardProps = {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { add, setQuantity, lines } = useCart()
  const { categories } = useCategories()
  const quantity = lines.find((line) => line.product.id === product.id)?.quantity ?? 0
  const saved = (product.previousPrice ?? product.price) - product.price
  const outOfStock = isOutOfStock(product)
  const lowInStock = stockStatusLabel(product, categories) === 'Low in stock'

  return (
    <article className={outOfStock ? 'product-card is-out-of-stock' : 'product-card'}>
      <span className="part-tag">{labelForCategory(product.category, categories)}</span>
      {saved > 0 ? <span className="deal-tag">Deal</span> : null}

      <Link className="product-media" to="/shop">
        <img src={product.image} alt={product.name} />
      </Link>

      <div className="product-body">
        <p className="product-model">{product.brand} · {product.model}</p>
        <h3>
          <Link to="/shop">{product.name}</Link>
        </h3>
        <p className="product-spec">{productDetail(product)}</p>
      </div>
      <div className="product-foot">
        <p className="product-price">
          <span className="product-price-main">
            <strong>{formatPrice(product.price)}</strong>
            {saved > 0 ? <span>Save {formatPrice(saved)}</span> : null}
          </span>
          {lowInStock ? <span className="product-stock is-low">Low in stock</span> : null}
        </p>
        {outOfStock ? (
          <button className="button button-block" type="button" disabled>
            Out of stock
          </button>
        ) : quantity === 0 ? (
          <button className="button button-block" type="button" onClick={() => add(product)}>
            Add to cart
          </button>
        ) : (
          <div className="card-qty">
            <button
              type="button"
              aria-label={`Fewer ${product.name}`}
              onClick={() => setQuantity(product.id, quantity - 1)}
            >
              −
            </button>
            <span>{quantity}</span>
            <button
              type="button"
              aria-label={`More ${product.name}`}
              disabled={quantity >= product.items}
              onClick={() => add(product)}
            >
              +
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
