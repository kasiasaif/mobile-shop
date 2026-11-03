import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { formatPrice, productDetail } from '../data/site'
import {
  accountForSession,
  displayName,
  emptyAccount,
  loadAccount,
  loginCustomer,
  publishPlacedOrder,
  registerCustomer,
  signOutCustomer,
  type CustomerAccount,
  type CustomerKind,
} from '../lib/account'
import { OrderAmounts } from './OrderAmounts'
import { checkDiscountCode, discountOff, formatMoney } from '../lib/vouchers'

const steps = [
  { id: 1, label: 'Sign in', title: 'Log in or create an account' },
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
  const navigate = useNavigate()
  const titleId = useId()
  const saved = useMemo(() => loadAccount(), [])
  const signedIn = useMemo(() => accountForSession(), [])
  const [order] = useState(() => ({
    lines: cart.lines,
    total: cart.total,
    count: cart.count,
  }))
  const [returning, setReturning] = useState(Boolean(signedIn))
  const [entry, setEntry] = useState<'login' | 'new' | ''>(signedIn ? 'login' : '')
  const [step, setStep] = useState<StepId>(signedIn ? 3 : 1)
  const [account, setAccount] = useState<CustomerAccount>(signedIn ?? saved ?? emptyAccount())
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [password, setPassword] = useState('')
  const [placing, setPlacing] = useState(false)
  const placingRef = useRef(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<{ step: StepId; message: string } | null>(null)
  const [discountCode, setDiscountCode] = useState('')
  const [discountName, setDiscountName] = useState('')
  const [discountValue, setDiscountValue] = useState(0)
  const [discountPercent, setDiscountPercent] = useState(0)
  const [discountType, setDiscountType] = useState<1 | 2 | 0>(0)
  const [discountError, setDiscountError] = useState('')
  const [discountChecking, setDiscountChecking] = useState(false)
  const offerRef = useRef({ value: 0, percentage: 0, type: 0 as 1 | 2 | 0 })
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

  function useDifferentAccount() {
    signOutCustomer()
    setReturning(false)
    setEntry('')
    setAccount(emptyAccount())
    setLoginEmail('')
    setLoginPassword('')
    setPassword('')
    setConfirmPassword('')
    setError(null)
    goTo(1)
    setStep(1)
  }

  function validate(id: StepId): string {
    if (returning && id < 3) return ''
    if (id === 1) {
      if (entry === 'login') return ''
      if (entry !== 'new') return 'Choose log in or a new account.'
      if (account.kind !== 'private' && account.kind !== 'business') return 'Choose private or business.'
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

  function rememberOffer(value: number, percentage: number, type: 1 | 2 | 0 = 0) {
    offerRef.current = { value, percentage, type }
    setDiscountValue(value)
    setDiscountPercent(percentage)
    setDiscountType(type)
  }

  async function confirmDiscount(code: string) {
    const trimmed = code.trim()
    if (!trimmed) {
      setDiscountName('')
      rememberOffer(0, 0)
      return ''
    }
    const result = await checkDiscountCode(trimmed)
    if ('error' in result) {
      setDiscountName('')
      rememberOffer(0, 0)
      return result.error
    }
    setDiscountCode(result.code)
    setDiscountName(result.name)
    rememberOffer(result.value, result.percentage, result.type)
    setDiscountError('')
    return ''
  }

  async function applyDiscount() {
    if (!discountCode.trim() || discountChecking) return
    setDiscountChecking(true)
    setDiscountError('')
    setError(null)
    const message = await confirmDiscount(discountCode)
    setDiscountChecking(false)
    if (message) setDiscountError(message)
  }

  function clearDiscount() {
    setDiscountCode('')
    setDiscountName('')
    rememberOffer(0, 0)
    setDiscountError('')
    setError(null)
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (step === 1 && entry === 'login' && !returning) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail.trim())) {
        setError({ step: 1, message: 'Enter the email on your account.' })
        return
      }
      if (!loginPassword) {
        setError({ step: 1, message: 'Enter your password.' })
        return
      }
      const result = await loginCustomer(loginEmail, loginPassword)
      if (!result.account) {
        setError({ step: 1, message: result.error })
        return
      }
      setAccount(result.account)
      setReturning(true)
      setError(null)
      goTo(3)
      setStep(3)
      return
    }

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

    if (!returning) {
      const message = await registerCustomer(account, password)
      if (message) {
        setError({ step: 2, message })
        goTo(2)
        setStep(2)
        return
      }
    }

    if (discountCode.trim()) {
      const discountMessage = await confirmDiscount(discountCode)
      if (discountMessage) {
        setError({ step: 4, message: discountMessage })
        goTo(4)
        return
      }
    }

    const discount = discountOff(
      order.total,
      offerRef.current.value,
      offerRef.current.percentage,
      offerRef.current.type,
    )
    const placed = {
      ref: `TES-${Date.now().toString(36).toUpperCase()}`,
      email: account.email.trim().toLowerCase(),
      name: displayName(account),
      lines: order.lines.map((line) => ({
        id: line.product.id,
        name: line.product.name,
        detail: productDetail(line.product),
        quantity: line.quantity,
        price: line.product.price,
      })),
      total: order.total,
      discount,
      totalPaid: Math.round((order.total - discount) * 100) / 100,
      discountCode: discountCode.trim(),
      placedAt: new Date().toISOString(),
    }
    if (placingRef.current) return
    placingRef.current = true
    setPlacing(true)
    const savedMessage = await publishPlacedOrder(placed, { ...account, email: placed.email })
    placingRef.current = false
    setPlacing(false)
    if (savedMessage) {
      setError({ step: 4, message: savedMessage })
      return
    }
    onPlaced()
    navigate('/order/thanks', { state: { order: placed } })
  }

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
        <button
          className="button button-solid"
          type="submit"
          disabled={id === 1 && (entry === '' || (entry === 'new' && !account.kind))}
        >
          {id === 1 && entry === 'login' ? 'Log in and continue' : 'Continue'}
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
            <h2 id={titleId}>{returning ? 'Place your order' : 'Sign in to place your order'}</h2>
          </div>
          <button className="checkout-close" type="button" aria-label="Close checkout" onClick={onClose}>
            ×
          </button>
        </header>

        <ol className="checkout-progress" aria-label="Checkout steps">
          {steps.map((item, index) => {
            const state = step > item.id || (returning && item.id < 3) ? 'done' : step === item.id ? 'current' : 'todo'
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

          <form className="checkout-body" onSubmit={onSubmit} noValidate>
            {returning ? (
              <p className="checkout-signed-in">
                <span>
                  Signed in as <strong>{displayName(account)}</strong>
                </span>
                <button className="text-btn" type="button" onClick={useDifferentAccount}>
                  Use a different account
                </button>
              </p>
            ) : null}
            {steps
              .filter((item) => item.id <= step && !(returning && item.id < 3))
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
                    <>
                      <fieldset className="kind-fieldset">
                        <legend className="sr-only">{item.title}</legend>
                        <div className="kind-grid">
                          <label className={entry === 'login' ? 'kind-card is-selected' : 'kind-card'}>
                            <input
                              type="checkbox"
                              checked={entry === 'login'}
                              onChange={() => {
                                setEntry('login')
                                setError(null)
                              }}
                            />
                            <strong>Log in</strong>
                            <span>Use the email and password from a previous order.</span>
                          </label>
                          <label className={entry === 'new' ? 'kind-card is-selected' : 'kind-card'}>
                            <input
                              type="checkbox"
                              checked={entry === 'new'}
                              onChange={() => {
                                setEntry('new')
                                setError(null)
                              }}
                            />
                            <strong>New account</strong>
                            <span>Create an account while you place this order.</span>
                          </label>
                        </div>
                      </fieldset>
                      {entry === 'login' ? (
                        <div className="checkout-form">
                          <label>
                            Email
                            <input
                              type="email"
                              value={loginEmail}
                              onChange={(event) => {
                                setLoginEmail(event.target.value)
                                setError(null)
                              }}
                              autoComplete="username"
                              required
                            />
                          </label>
                          <label>
                            Password
                            <input
                              type="password"
                              value={loginPassword}
                              onChange={(event) => {
                                setLoginPassword(event.target.value)
                                setError(null)
                              }}
                              autoComplete="current-password"
                              required
                            />
                          </label>
                        </div>
                      ) : null}
                      {entry === 'new' ? (
                        <fieldset className="kind-fieldset">
                          <legend className="sr-only">Private or business</legend>
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
                    </>
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
                      </div>
                      <div className="checkout-review-card checkout-discount">
                        <h3>Discount</h3>
                        <div className="discount-field">
                          <label htmlFor={discountName ? undefined : `${titleId}-discount`}>Discount code</label>
                          {discountName ? (
                            <p className="checkout-code">
                              <span>
                                <strong>{discountCode}</strong> · {discountName}
                                {discountValue > 0 || discountPercent > 0
                                  ? ` · ${[
                                      discountPercent > 0 ? `${discountPercent}%` : '',
                                      discountValue > 0 ? formatMoney(discountValue) : '',
                                    ]
                                      .filter(Boolean)
                                      .join(' + ')}`
                                  : ''}
                              </span>
                              <button className="discount-remove" type="button" onClick={clearDiscount}>
                                Remove
                              </button>
                            </p>
                          ) : (
                            <div className="discount-row">
                              <input
                                id={`${titleId}-discount`}
                                value={discountCode}
                                onChange={(event) => {
                                  setDiscountCode(event.target.value.toUpperCase())
                                  setDiscountError('')
                                  setError(null)
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault()
                                    void applyDiscount()
                                  }
                                }}
                                autoCapitalize="characters"
                                autoCorrect="off"
                                spellCheck={false}
                                placeholder="Enter code"
                                aria-invalid={discountError ? true : undefined}
                                aria-describedby={discountError ? `${titleId}-discount-error` : undefined}
                              />
                              <button
                                className="button button-solid"
                                type="button"
                                onClick={() => void applyDiscount()}
                                disabled={!discountCode.trim() || discountChecking}
                              >
                                {discountChecking ? 'Checking…' : 'Apply'}
                              </button>
                            </div>
                          )}
                          {discountError ? (
                            <p className="checkout-error" id={`${titleId}-discount-error`} role="alert">
                              {discountError}
                            </p>
                          ) : (
                            <p className="discount-hint">Optional. Apply a code before you place the order.</p>
                          )}
                        </div>
                      </div>
                      <div className="checkout-review-card checkout-payment">
                        <h3>Payment details</h3>
                        <p>Payment is not taken on this form. We confirm the order with you before anything is paid.</p>
                        <OrderAmounts
                          total={order.total}
                          discount={discountName ? discountOff(order.total, discountValue, discountPercent, discountType) : 0}
                        />
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
                <button className="button button-solid" type="submit" disabled={placing}>
                  {placing ? 'Saving order…' : returning ? 'Place order' : 'Create account and place order'}
                </button>
              ) : null}
            </div>
          </form>
      </div>
    </div>,
    document.body,
  )
}
