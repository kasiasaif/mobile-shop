import { useEffect, useState, type FormEvent } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { navItems, site } from '../data/site'
import { useCategories } from '../lib/categories'

export function Header() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const { count } = useCart()
  const { categories } = useCategories()
  const navigate = useNavigate()

  function closeMenu() {
    setOpen(false)
  }

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = query.trim()
    navigate(next ? `/shop?q=${encodeURIComponent(next)}` : '/shop')
    closeMenu()
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') closeMenu()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header className="site-header">
      <div className="shell header-row">
        <button
          className={open ? 'menu-toggle is-open' : 'menu-toggle'}
          type="button"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="burger" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>

        <Link className="brand" to="/" onClick={closeMenu}>
          <img className="brand-mark" src="/logo.png" alt="tescgsm" width={44} height={44} />
          <span className="wordmark">{site.name}</span>
        </Link>

        <form className="search" role="search" onSubmit={onSearch}>
          <label className="sr-only" htmlFor="site-search">
            Search products
          </label>
          <input
            id="site-search"
            type="search"
            placeholder="Search iPhone 11 battery, Galaxy LCD…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button className="button" type="submit">
            Search
          </button>
        </form>

        <div className="header-actions">
          <nav className="site-nav" aria-label="Primary">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => (isActive ? 'nav-link is-active' : 'nav-link')}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <Link className="cart-pill" to="/cart" onClick={closeMenu}>
            Cart {count}
          </Link>
        </div>
      </div>

      <div
        className={open ? 'menu-overlay is-open' : 'menu-overlay'}
        onClick={closeMenu}
        aria-hidden="true"
      />

      <div id="mobile-nav" className={open ? 'mobile-drawer is-open' : 'mobile-drawer'}>
        <div className="shell">
          <nav className="mobile-links" aria-label="Mobile">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => (isActive ? 'nav-link is-active' : 'nav-link')}
                onClick={closeMenu}
              >
                {item.label}
              </NavLink>
            ))}
            <Link to="/cart" onClick={closeMenu}>
              Cart {count}
            </Link>
          </nav>
          <p className="mobile-label">Categories</p>
          <div className="mobile-cats">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/shop?category=${encodeURIComponent(category.id)}`}
                onClick={closeMenu}
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="category-bar">
        <div className="shell category-row">
          {categories.map((category) => (
            <Link key={category.id} to={`/shop?category=${encodeURIComponent(category.id)}`} onClick={closeMenu}>
              {category.name}
            </Link>
          ))}
        </div>
      </div>
    </header>
  )
}
