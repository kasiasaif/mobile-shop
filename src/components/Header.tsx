import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import logoUrl from '../assets/logo.svg?url'
import { useCart } from '../context/CartContext'
import { navItems, site } from '../data/site'
import { accountForSession, displayName, signOutCustomer, syncShopAccount, watchSession } from '../lib/account'
import { useCategories } from '../lib/categories'
import { HeaderTicker } from './HeaderTicker'

function AccountMenu({ onNavigate }: { onNavigate: () => void }) {
  const [open, setOpen] = useState(false)
  const [account, setAccount] = useState(accountForSession)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => watchSession(() => setAccount(accountForSession())), [])

  useEffect(() => {
    void syncShopAccount(false)
  }, [])

  useEffect(() => {
    if (!open) return
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  function close() {
    setOpen(false)
    onNavigate()
  }

  return (
    <div className="header-account" ref={rootRef}>
      <button
        className={open ? 'account-toggle is-open' : 'account-toggle'}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={account ? 'Account menu' : 'Log in'}
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="3.25" />
          <path d="M5.2 19.2a6.8 6.8 0 0 1 13.6 0" />
        </svg>
      </button>
      {open ? (
        <div className="account-drop" role="menu">
          {account ? (
            <>
              <p className="account-drop-name">{displayName(account)}</p>
              <Link role="menuitem" to="/account" onClick={close}>
                My profile
              </Link>
              <Link role="menuitem" to="/account?tab=orders" onClick={close}>
                My orders
              </Link>
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  signOutCustomer()
                  setOpen(false)
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link role="menuitem" to="/account" onClick={close}>
              Log in
            </Link>
          )}
        </div>
      ) : null}
    </div>
  )
}

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
          <img className="brand-mark" src={logoUrl} alt="tescgsm" width={36} height={36} />
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
          <AccountMenu onNavigate={closeMenu} />
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

      <HeaderTicker />
    </header>
  )
}
