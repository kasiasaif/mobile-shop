import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useCart } from '../context/CartContext'
import { formatPrice, productDetail } from '../data/site'
import {
  displayName,
  emptyAccount,
  loadAccount,
  saveAccount,
  type CustomerAccount,
  type CustomerKind,
} from '../lib/account'

const steps = [
  { id: 1, label: 'Type', title: 'Who is this order for?' },
  { id: 2, label: 'Account', title: 'Your account' },
  { id: 3, label: 'Delivery', title: 'Delivery address' },
  { id: 4, label: 'Review', title: 'Review and place order' },
] as const

type StepId = (typeof steps)[number]['id']

type CheckoutModalProps = {
  onClose: () => void
  onPlaced: () => void
}

export function CheckoutModal({ onClose, onPlaced }: CheckoutModalProps) {
  const cart = useCart()
  const titleId = useId()
  const saved = useMemo(() => loadAccount(), [])
  const [order] = useState(() => ({
    lines: cart.lines,
    total: cart.total,
    count: cart.count,
  }))
  const [step, setStep] = useState<StepId>(1)
  const [account, setAccount] = useState<CustomerAccount>(saved ?? emptyAccount())
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<{ step: StepId; message: string } | null>(null)
  const [orderRef, setOrderRef] = useState('')
  const sectionRefs = useRef<Partial<Record<StepId, HTMLElement | null>>>({})
  const scrollTarget = useRef<StepId | null>(null)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  useEffect(() => {
    const target = scrollTarget.current
    if (!target) return
    scrollTarget.current = null
    const section = sectionRefs.current[target]
    if (!section) return
    section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    const field = section.querySelector<HTMLElement>('input:not([readonly]), button.button-solid')
    // Focusing during a smooth scroll cancels it, so wait for the slide to finish.
    const timer = window.setTimeout(() => field?.focus({ preventScroll: true }), 600)
    return () => window.clearTimeout(timer)
  }, [step, error])

  function goTo(id: StepId) {
    scrollTarget.current = id
  }

  function update<K extends keyof CustomerAccount>(key: K, value: CustomerAccount[K]) {
    setAccount((current) => ({ ...current, [key]: value }))
    setError(null)
  }

  function chooseKind(kind: CustomerKind) {
    setAccount((current) => ({ ...current, kind }))
    setError(null)
    if (step === 1) {
      goTo(2)
      setStep(2)
    }
  }

  function validate(id: StepId): string {
    if (id === 1 && account.kind !== 'private' && account.kind !== 'business') {
      return 'Choose private or business.'
    }
    if (id === 2) {
      if (account.kind === 'business' && !account.company.trim()) return 'Enter the company name.'
      if (account.kind === 'business' && !account.taxId.trim()) return 'Enter the company CIF or tax ID.'
      if (!account.firstName.trim() || !account.lastName.trim()) return 'Enter your first and last name.'
      if (!account.email.trim()) return 'Enter an email for the account.'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email.trim())) return 'Enter a valid email address.'
      if (!account.phone.trim()) return 'Enter a phone number.'
      if (password.length < 6) return 'Password must be at least 6 characters.'
      if (password !== confirmPassword) return 'Passwords do not match.'
    }
    if (id === 3) {
      if (!account.street.trim()) return 'Enter a street address.'
      if (!account.city.trim()) return 'Enter a city.'
      if (!account.postcode.trim()) return 'Enter a postcode.'
      if (!account.province.trim()) return 'Enter a province.'
    }
    if (id === 4 && order.count === 0) return 'Your cart is empty.'
    return ''
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    for (const item of steps) {
      if (item.id > step) break
      const message = validate(item.id)
      if (message) {
        setError({ step: item.id, message })
        goTo(item.id)
        return
      }
    }
    if (step < 4) {
      const next = (step + 1) as StepId
      goTo(next)
      setStep(next)
      return
    }

    const ref = `TES-${Date.now().toString(36).toUpperCase()}`
    saveAccount(account)
    setOrderRef(ref)
    onPlaced()
  }

  const placed = Boolean(orderRef)

  function sectionError(id: StepId) {
    if (error?.step !== id) return null
    return (
      <p className="checkout-error" role="alert">
        {error.message}
      </p>
    )
  }

  function continueButton(id: StepId) {
    if (id !== step || id === 4) return null
    return (
      <div className="checkout-section-actions">
        <button className="button button-solid" type="submit" disabled={id === 1 && !account.kind}>
          Continue
        </button>
      </div>
    )
  }

  return createPortal(
    <div className="checkout-overlay" onClick={onClose}>
      <div
        className="checkout-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="checkout-head">
          <div>
            <p className="eyebrow">Checkout</p>
            <h2 id={titleId}>{placed ? 'Order placed' : 'Create an account to order'}</h2>
          </div>
          <button className="checkout-close" type="button" aria-label="Close checkout" onClick={onClose}>
            ×
          </button>
        </header>

        <ol className="checkout-progress" aria-label="Checkout steps">
          {steps.map((item, index) => {
            const state = placed || step > item.id ? 'done' : step === item.id ? 'current' : 'todo'
            return (
              <li key={item.id} className={`checkout-step is-${state}`}>
                {index > 0 ? <span className="checkout-step-line" aria-hidden="true" /> : null}
                <span className="checkout-step-dot" aria-hidden="true">
                  {state === 'done' ? '✓' : item.id}
                </span>
                <span className="checkout-step-label">{item.label}</span>
              </li>
            )
          })}
        </ol>

        {placed ? (
          <div className="checkout-body">
            <div className="form-note" role="status">
              <h3>Account created</h3>
              <p>
                Order <strong>{orderRef}</strong> is saved on this device for {displayName(account)}.
                {' '}Payments are not connected yet, so this is the checkout record only.
              </p>
            </div>
            <div className="checkout-actions">
              <span />
              <button className="button button-solid" type="button" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form className="checkout-body" onSubmit={onSubmit} noValidate>
            {steps
              .filter((item) => item.id <= step)
              .map((item) => (
                <section
                  key={item.id}
                  ref={(node) => {
                    sectionRefs.current[item.id] = node
                  }}
                  className={item.id < step ? 'checkout-section is-done' : 'checkout-section is-current'}
                  aria-labelledby={`${titleId}-step-${item.id}`}
                >
                  <h3 className="checkout-section-title" id={`${titleId}-step-${item.id}`}>
                    <span className="checkout-section-dot" aria-hidden="true">
                      {item.id < step ? '✓' : item.id}
                    </span>
                    {item.title}
                  </h3>

                  {item.id === 1 ? (
                    <fieldset className="kind-fieldset">
                      <legend className="sr-only">{item.title}</legend>
                      <div className="kind-grid">
                        <label className={account.kind === 'private' ? 'kind-card is-selected' : 'kind-card'}>
                          <input
                            type="checkbox"
                            checked={account.kind === 'private'}
                            onChange={() => chooseKind('private')}
                          />
                          <strong>Private</strong>
                          <span>Personal account for your own repairs.</span>
                        </label>
                        <label className={account.kind === 'business' ? 'kind-card is-selected' : 'kind-card'}>
                          <input
                            type="checkbox"
                            checked={account.kind === 'business'}
                            onChange={() => chooseKind('business')}
                          />
                          <strong>Business</strong>
                          <span>Company account with CIF and a billing contact.</span>
                        </label>
                      </div>
                    </fieldset>
                  ) : null}

                  {item.id === 2 ? (
                    <div className="checkout-form">
                      {account.kind === 'business' ? (
                        <>
                          <label>
                            Company name
                            <input
                              value={account.company}
                              onChange={(event) => update('company', event.target.value)}
                              autoComplete="organization"
                              required
                            />
                          </label>
                          <label>
                            CIF / tax ID
                            <input
                              value={account.taxId}
                              onChange={(event) => update('taxId', event.target.value)}
                              autoComplete="off"
                              required
                            />
                          </label>
                        </>
                      ) : null}
                      <label>
                        First name
                        <input
                          value={account.firstName}
                          onChange={(event) => update('firstName', event.target.value)}
                          autoComplete="given-name"
                          required
                        />
                      </label>
                      <label>
                        Last name
                        <input
                          value={account.lastName}
                          onChange={(event) => update('lastName', event.target.value)}
                          autoComplete="family-name"
                          required
                        />
                      </label>
                      <label>
                        Email
                        <input
                          type="email"
                          value={account.email}
                          onChange={(event) => update('email', event.target.value)}
                          autoComplete="email"
                          required
                        />
                      </label>
                      <label>
                        Phone
                        <input
                          type="tel"
                          value={account.phone}
                          onChange={(event) => update('phone', event.target.value)}
                          autoComplete="tel"
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
                            setError(null)
                          }}
                          autoComplete="new-password"
                          required
                          minLength={6}
                        />
                      </label>
                      <label>
                        Confirm password
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(event) => {
                            setConfirmPassword(event.target.value)
                            setError(null)
                          }}
                          autoComplete="new-password"
                          required
                          minLength={6}
                        />
                      </label>
                    </div>
                  ) : null}

                  {item.id === 3 ? (
                    <div className="checkout-form">
                      <label className="admin-wide">
                        Street address
                        <input
                          value={account.street}
                          onChange={(event) => update('street', event.target.value)}
                          autoComplete="address-line1"
                          required
                        />
                      </label>
                      <label>
                        City
                        <input
                          value={account.city}
                          onChange={(event) => update('city', event.target.value)}
                          autoComplete="address-level2"
                          required
                        />
                      </label>
                      <label>
                        Postcode
                        <input
                          value={account.postcode}
                          onChange={(event) => update('postcode', event.target.value)}
                          autoComplete="postal-code"
                          required
                        />
                      </label>
                      <label>
                        Province
                        <input
                          value={account.province}
                          onChange={(event) => update('province', event.target.value)}
                          autoComplete="address-level1"
                          required
                        />
                      </label>
                      <label>
                        Country
                        <input value={account.country} readOnly />
                      </label>
                    </div>
                  ) : null}

                  {item.id === 4 ? (
                    <div className="checkout-review">
                      <div className="checkout-review-card">
                        <h3>{account.kind === 'business' ? 'Business account' : 'Private account'}</h3>
                        <p>
                          <strong>{displayName(account)}</strong>
                          {account.kind === 'business' && account.taxId ? ` · CIF ${account.taxId}` : ''}
                        </p>
                        <p>
                          {account.firstName} {account.lastName}
                        </p>
                        <p>{account.email}</p>
                        <p>{account.phone}</p>
                        <p>
                          {account.street}
                          <br />
                          {account.postcode} {account.city}
                          <br />
                          {account.province}, {account.country}
                        </p>
                      </div>
                      <div className="checkout-review-card">
                        <h3>Order</h3>
                        <ul className="checkout-lines">
                          {order.lines.map((line) => (
                            <li key={line.product.id}>
                              <span>
                                {line.product.name}
                                <small>
                                  {line.quantity} × {productDetail(line.product)}
                                </small>
                              </span>
                              <strong>{formatPrice(line.product.price * line.quantity)}</strong>
                            </li>
                          ))}
                        </ul>
                        <p className="cart-total">
                          <span>Total</span>
                          <strong>{formatPrice(order.total)}</strong>
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {sectionError(item.id)}
                  {continueButton(item.id)}
                </section>
              ))}

            <div className="checkout-actions">
              <button className="button button-ghost" type="button" onClick={onClose}>
                Cancel
              </button>
              {step === 4 ? (
                <button className="button button-solid" type="submit">
                  Create account and place order
                </button>
              ) : null}
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}
