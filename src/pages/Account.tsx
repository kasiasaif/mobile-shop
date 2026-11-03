import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { OrderAmounts } from '../components/OrderAmounts'
import { OrderProgress } from '../components/OrderProgress'
import { formatPrice } from '../data/site'
import { formatMoney } from '../lib/vouchers'
import {
  accountForSession,
  displayName,
  loadOrderProgress,
  loginCustomer,
  orderProgressStep,
  orderSteps,
  ordersForEmail,
  signOutCustomer,
  updateCustomerProfile,
  watchSession,
  type CustomerAccount,
  type OrderProgress as OrderProgressStatus,
  type PlacedOrder,
} from '../lib/account'

function formatWhen(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function AccountLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter the email on your account.')
      return
    }
    if (!password) {
      setError('Enter your password.')
      return
    }
    const result = await loginCustomer(email, password)
    if (!result.account) setError(result.error)
  }

  return (
    <section className="page">
      <div className="shell account-login">
        <p className="eyebrow">Account</p>
        <h1>Log in</h1>
        <p className="lede">Use the email and password from an order you have already placed.</p>
        <form className="account-panel" onSubmit={onSubmit} noValidate>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setError('')
              }}
              autoComplete="username"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setError('')
              }}
              autoComplete="current-password"
              required
            />
          </label>
          {error ? (
            <p className="checkout-error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="button button-solid" type="submit">
            Log in
          </button>
          <p className="muted">New here? Create an account when you place an order.</p>
        </form>
      </div>
    </section>
  )
}

function ProfilePanel({ account }: { account: CustomerAccount }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(account)

  useEffect(() => setDraft(account), [account])

  function update<K extends keyof CustomerAccount>(key: K, value: CustomerAccount[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!draft.firstName.trim() || !draft.lastName.trim()) return
    if (draft.kind === 'business' && !draft.company.trim()) return
    updateCustomerProfile(draft)
    setEditing(false)
  }

  if (editing) {
    return (
      <form className="account-panel" onSubmit={onSubmit}>
        <h2>My profile</h2>
        {draft.kind === 'business' ? (
          <>
            <label>
              Company
              <input value={draft.company} onChange={(event) => update('company', event.target.value)} required />
            </label>
            <label>
              CIF / tax ID
              <input value={draft.taxId} onChange={(event) => update('taxId', event.target.value)} />
            </label>
          </>
        ) : null}
        <div className="account-fields">
          <label>
            First name
            <input value={draft.firstName} onChange={(event) => update('firstName', event.target.value)} required />
          </label>
          <label>
            Last name
            <input value={draft.lastName} onChange={(event) => update('lastName', event.target.value)} required />
          </label>
        </div>
        <label>
          Phone
          <input value={draft.phone} onChange={(event) => update('phone', event.target.value)} autoComplete="tel" />
        </label>
        <label>
          Street
          <input value={draft.street} onChange={(event) => update('street', event.target.value)} autoComplete="street-address" />
        </label>
        <div className="account-fields">
          <label>
            Postcode
            <input value={draft.postcode} onChange={(event) => update('postcode', event.target.value)} autoComplete="postal-code" />
          </label>
          <label>
            City
            <input value={draft.city} onChange={(event) => update('city', event.target.value)} autoComplete="address-level2" />
          </label>
        </div>
        <label>
          Province
          <input value={draft.province} onChange={(event) => update('province', event.target.value)} />
        </label>
        <p className="muted">Email stays {account.email}. It is the login for this account.</p>
        <div className="account-actions">
          <button className="button button-ghost" type="button" onClick={() => setEditing(false)}>
            Cancel
          </button>
          <button className="button button-solid" type="submit">
            Save profile
          </button>
        </div>
      </form>
    )
  }

  const address = [account.street, [account.postcode, account.city].filter(Boolean).join(' '), account.province, account.country]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="account-panel">
      <div className="account-panel-head">
        <h2>My profile</h2>
        <button className="button button-ghost" type="button" onClick={() => setEditing(true)}>
          Edit
        </button>
      </div>
      <dl className="account-details">
        <div>
          <dt>Account</dt>
          <dd>{account.kind === 'business' ? 'Business' : 'Private'}</dd>
        </div>
        {account.kind === 'business' ? (
          <div>
            <dt>Company</dt>
            <dd>
              {account.company}
              {account.taxId ? ` · ${account.taxId}` : ''}
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Name</dt>
          <dd>
            {account.firstName} {account.lastName}
          </dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{account.email}</dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>{account.phone || '—'}</dd>
        </div>
        <div>
          <dt>Delivery</dt>
          <dd>{address || '—'}</dd>
        </div>
      </dl>
    </div>
  )
}

function OrderCard({ order, status }: { order: PlacedOrder; status?: OrderProgressStatus }) {
  const [open, setOpen] = useState(false)
  const step = orderSteps.find((item) => item.id === orderProgressStep(status))

  return (
    <article className={open ? 'account-order is-open' : 'account-order'}>
      <button
        className="account-order-summary"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="account-order-id">
          <strong className="account-order-ref">{order.ref}</strong>
          <span className="muted">{formatWhen(order.placedAt)}</span>
        </span>
        <span className="account-order-status">{step?.label ?? 'Placed'}</span>
        <strong className="account-order-amount">{formatMoney(order.totalPaid)}</strong>
        <svg className="account-order-arrow" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
      {open ? (
        <div className="account-order-body">
          <OrderProgress status={status} />
          <ul>
            {order.lines.map((line) => (
              <li key={`${order.ref}-${line.id}`}>
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
      ) : null}
    </article>
  )
}

export function Account() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'orders' ? 'orders' : 'profile'
  const [account, setAccount] = useState(accountForSession)
  const [progress, setProgress] = useState<Record<string, OrderProgressStatus>>({})

  useEffect(() => watchSession(() => setAccount(accountForSession())), [])

  useEffect(() => {
    if (!account) return
    let cancelled = false
    const refs = ordersForEmail(account.email).map((order) => order.ref)
    void loadOrderProgress(account.email, refs).then((next) => {
      if (!cancelled) setProgress(next)
    })
    return () => {
      cancelled = true
    }
  }, [account])

  if (!account) return <AccountLogin />

  const orders = ordersForEmail(account.email)

  function openTab(next: 'profile' | 'orders') {
    const nextParams = new URLSearchParams(params)
    if (next === 'profile') nextParams.delete('tab')
    else nextParams.set('tab', 'orders')
    setParams(nextParams)
  }

  return (
    <section className="page">
      <div className="shell">
        <p className="eyebrow">Account</p>
        <h1>My account</h1>
        <p className="lede">Hello, {displayName(account)}.</p>
        <div className="account-layout">
          <aside className="account-menu" aria-label="Account menu">
            <nav className="account-card account-nav">
              <button
                type="button"
                className={tab === 'profile' ? 'is-active' : ''}
                aria-current={tab === 'profile' ? 'page' : undefined}
                onClick={() => openTab('profile')}
              >
                My profile
              </button>
              <button
                type="button"
                className={tab === 'orders' ? 'is-active' : ''}
                aria-current={tab === 'orders' ? 'page' : undefined}
                onClick={() => openTab('orders')}
              >
                My orders
                {orders.length ? <span>{orders.length}</span> : null}
              </button>
            </nav>
            <div className="account-card">
              <button className="button button-ghost button-block" type="button" onClick={() => signOutCustomer()}>
                Sign out
              </button>
            </div>
          </aside>
          {tab === 'orders' ? (
            <div className="account-orders">
              <h2>My orders</h2>
              {orders.length === 0 ? (
                <div className="account-panel">
                  <p>You have no orders yet.</p>
                  <Link className="button" to="/shop">
                    Continue shopping
                  </Link>
                </div>
              ) : (
                orders.map((order) => <OrderCard key={order.ref} order={order} status={progress[order.ref]} />)
              )}
            </div>
          ) : (
            <ProfilePanel account={account} />
          )}
        </div>
      </div>
    </section>
  )
}
