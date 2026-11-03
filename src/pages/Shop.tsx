import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BrandIcon, SortIcon } from '../components/BrandIcon'
import { ProductCard } from '../components/ProductCard'
import { labelForCategory, type BrandRecord } from '../data/site'
import { useBrands } from '../lib/brands'
import { useCategories } from '../lib/categories'
import { useProducts } from '../lib/products'

export function Shop() {
  const { products, status } = useProducts()
  const { categories } = useCategories()
  const { brands: liveBrands } = useBrands()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const categoryParam = Number(params.get('category'))
  const brandParam = params.get('brand') ?? ''
  const activeCategory: 'All' | number =
    Number.isInteger(categoryParam) && categories.some((item) => item.id === categoryParam)
      ? categoryParam
      : 'All'
  const brands = useMemo<BrandRecord[]>(() => {
    if (liveBrands.length > 0) return liveBrands
    const names = new Set(products.map((product) => product.brand).filter(Boolean))
    return [...names]
      .sort((a, b) => a.localeCompare(b))
      .map((name, index) => ({ id: index + 1, name, image: '', active: true }))
  }, [liveBrands, products])
  const activeBrand = brands.some((item) => item.name === brandParam) ? brandParam : ''
  const sortParam = params.get('sort')
  const activeSort = sortParam === 'price-asc' || sortParam === 'price-desc' ? sortParam : ''

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = products.filter((product) => {
      const matchesCategory = activeCategory === 'All' || product.category === activeCategory
      const matchesBrand = !activeBrand || product.brand === activeBrand
      const haystack =
        `${product.name} ${product.model} ${product.spec} ${product.brand} ${labelForCategory(product.category, categories)}`.toLowerCase()
      const matchesQuery = !needle || haystack.includes(needle)
      return matchesCategory && matchesBrand && matchesQuery
    })
    if (activeSort === 'price-asc') {
      return [...filtered].sort((a, b) => a.price - b.price)
    }
    if (activeSort === 'price-desc') {
      return [...filtered].sort((a, b) => b.price - a.price)
    }
    return filtered
  }, [activeBrand, activeCategory, activeSort, categories, products, query])

  function setCategory(next: 'All' | number) {
    const nextParams = new URLSearchParams(params)
    if (next === 'All') nextParams.delete('category')
    else nextParams.set('category', String(next))
    setParams(nextParams)
  }

  function setBrand(next: string) {
    const nextParams = new URLSearchParams(params)
    if (!next) nextParams.delete('brand')
    else nextParams.set('brand', next)
    setParams(nextParams)
  }

  function setSort(next: '' | 'price-asc' | 'price-desc') {
    const nextParams = new URLSearchParams(params)
    if (!next) nextParams.delete('sort')
    else nextParams.set('sort', next)
    setParams(nextParams)
  }

  return (
    <section className="page">
      <div className="shell shop-page">
        <div className="shop-intro">
          <p className="eyebrow">Shop</p>
          <h1>{query ? `Results for “${query}”` : 'Parts'}</h1>
          <p className="lede">Search a model such as iPhone 11 or Galaxy A15, or use the filters on the left.</p>
        </div>
        <div className="shop-layout">
        <aside className="shop-sidebar" aria-label="Browse parts">
          <nav className="shop-nav" aria-label="Category">
            <p className="shop-nav-label">Category</p>
            <button
              type="button"
              className={activeCategory === 'All' ? 'shop-nav-link is-active' : 'shop-nav-link'}
              aria-current={activeCategory === 'All' ? 'page' : undefined}
              onClick={() => setCategory('All')}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={activeCategory === category.id ? 'shop-nav-link is-active' : 'shop-nav-link'}
                aria-current={activeCategory === category.id ? 'page' : undefined}
                onClick={() => setCategory(category.id)}
              >
                {category.name}
              </button>
            ))}
          </nav>

          <nav className="shop-nav" aria-label="Brand">
            <p className="shop-nav-label">Brand</p>
            <button
              type="button"
              className={!activeBrand ? 'shop-nav-link is-active' : 'shop-nav-link'}
              aria-current={!activeBrand ? 'page' : undefined}
              onClick={() => setBrand('')}
            >
              All
            </button>
            {brands.map((brand) => (
              <button
                key={brand.id || brand.name}
                type="button"
                className={activeBrand === brand.name ? 'shop-nav-link is-active' : 'shop-nav-link'}
                aria-current={activeBrand === brand.name ? 'page' : undefined}
                onClick={() => setBrand(brand.name)}
              >
                <span className="shop-brand-mark">
                  {brand.image ? (
                    <img className="shop-nav-icon" src={brand.image} alt="" />
                  ) : (
                    <BrandIcon brand={brand.name} />
                  )}
                </span>
                {brand.name}
              </button>
            ))}
          </nav>

          <nav className="shop-nav shop-nav-sort" aria-label="Sort by price">
            <p className="shop-nav-label">Sort by price</p>
            <button
              type="button"
              className={!activeSort ? 'shop-nav-link is-active' : 'shop-nav-link'}
              aria-current={!activeSort ? 'true' : undefined}
              onClick={() => setSort('')}
            >
              <SortIcon kind="default" />
              Default
            </button>
            <button
              type="button"
              className={activeSort === 'price-asc' ? 'shop-nav-link is-active' : 'shop-nav-link'}
              aria-current={activeSort === 'price-asc' ? 'true' : undefined}
              onClick={() => setSort('price-asc')}
            >
              <SortIcon kind="asc" />
              Low to high
            </button>
            <button
              type="button"
              className={activeSort === 'price-desc' ? 'shop-nav-link is-active' : 'shop-nav-link'}
              aria-current={activeSort === 'price-desc' ? 'true' : undefined}
              onClick={() => setSort('price-desc')}
            >
              <SortIcon kind="desc" />
              High to low
            </button>
          </nav>
        </aside>

        <div className="shop-main">
          {status === 'loading' ? <p className="muted">Loading parts…</p> : null}
          {status === 'error' ? <p className="muted">Could not load the catalog.</p> : null}
          {status === 'ready' && visible.length === 0 ? (
            <p className="muted">No parts match that search.</p>
          ) : null}
          {status === 'ready' && visible.length > 0 ? (
            <div className="product-grid">
              {visible.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : null}
        </div>
        </div>
      </div>
    </section>
  )
}
