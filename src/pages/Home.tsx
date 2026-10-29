import { Link } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard'
import { PromoBanner } from '../components/PromoBanner'
import { TrustBar } from '../components/TrustBar'
import { services, site } from '../data/site'
import { useBanners } from '../lib/banners'
import { useCategories } from '../lib/categories'
import { useProducts } from '../lib/products'

export function Home() {
  const { products, status } = useProducts()
  const { banners } = useBanners()
  const { categories } = useCategories()
  const [first, second] = categories

  return (
    <>
      {banners.length > 0 ? (
        <PromoBanner banners={banners} />
      ) : (
        <section className="hero">
          <div className="shell">
            <p className="eyebrow">{site.tagline}</p>
            <h1>Batteries and LCD screens for phone repair.</h1>
            <p className="lede">
              tescgsm is a parts counter in Spain. For now we only stock batteries
              and LCD — other parts can come later.
            </p>
            <div className="hero-actions">
              {first ? (
                <Link className="button" to={`/shop?category=${encodeURIComponent(first.id)}`}>
                  Shop {first.name}
                </Link>
              ) : (
                <Link className="button" to="/shop">
                  Shop parts
                </Link>
              )}
              {second ? (
                <Link className="button button-ghost" to={`/shop?category=${encodeURIComponent(second.id)}`}>
                  Shop {second.name}
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      )}

      <section className="shell">
        <div className="service-strip">
          {services.map((item) => (
            <Link key={item.title} className="service-card" to={item.href}>
              <strong>{item.title}</strong>
              <span>{item.body}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="shell">
        <TrustBar />
      </section>

      <section className="shell section">
        <h2>Shop by part</h2>
        <div className="category-tiles">
          {categories.map((category) => (
            <Link key={category.id} className="category-tile" to={`/shop?category=${encodeURIComponent(category.id)}`}>
              {category.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="shell section">
        <div className="section-head">
          <h2>Best sellers</h2>
          <Link to="/shop">See all</Link>
        </div>
        {status === 'loading' ? <p className="muted">Loading parts…</p> : null}
        {status === 'error' ? <p className="muted">Could not load the catalog.</p> : null}
        {status === 'ready' ? (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : null}
      </section>
    </>
  )
}
