import { shopApiUrl } from './catalogApi'

export type CustomerKind = 'private' | 'business'

export type CustomerAccount = {
  kind: CustomerKind | ''
  firstName: string
  lastName: string
  company: string
  taxId: string
  email: string
  phone: string
  street: string
  city: string
  postcode: string
  province: string
  country: string
}

export const emptyAccount = (kind: CustomerKind | '' = ''): CustomerAccount => ({
  kind,
  firstName: '',
  lastName: '',
  company: '',
  taxId: '',
  email: '',
  phone: '',
  street: '',
  city: '',
  postcode: '',
  province: '',
  country: 'Spain',
})

const STORAGE_KEY = 'tescgsm-customer'

export function loadAccount(): CustomerAccount | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CustomerAccount>
    if (parsed.kind !== 'private' && parsed.kind !== 'business') return null
    return { ...emptyAccount(parsed.kind), ...parsed, kind: parsed.kind, country: parsed.country || 'Spain' }
  } catch {
    return null
  }
}

export function saveAccount(account: CustomerAccount) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(account))
}

export type PlacedOrderLine = {
  id: number
  name: string
  detail: string
  quantity: number
  price: number
}

export type OrderProgress = 'placed' | 'processing' | 'sent' | 'delivered'

export const orderSteps: { id: OrderProgress; label: string }[] = [
  { id: 'placed', label: 'Placed' },
  { id: 'processing', label: 'Processing' },
  { id: 'sent', label: 'Sent' },
  { id: 'delivered', label: 'Delivered' },
]

export function orderProgressStep(value: string | undefined): OrderProgress {
  if (value === 'processing' || value === 'sent' || value === 'delivered' || value === 'placed') return value
  if (value === 'packed') return 'processing'
  return 'placed'
}

export type PlacedOrder = {
  ref: string
  email: string
  name: string
  lines: PlacedOrderLine[]
  total: number
  discount: number
  totalPaid: number
  discountCode?: string
  placedAt: string
}

function withAmounts(order: PlacedOrder): PlacedOrder {
  const total = Number(order.total) || 0
  const discount = Math.min(total, Math.max(0, Number(order.discount) || 0))
  const totalPaid = order.totalPaid == null ? Math.round((total - discount) * 100) / 100 : Number(order.totalPaid)
  return { ...order, total, discount, totalPaid }
}

type StoredCustomer = {
  account: CustomerAccount
  passwordHash: string
}

const customersKey = 'tescgsm-customers'
const sessionKey = 'tescgsm-session'
const lastOrderKey = 'tescgsm-last-order'
const ordersKey = 'tescgsm-orders'

const sessionListeners = new Set<() => void>()

function readCustomers(): Record<string, StoredCustomer> {
  try {
    const raw = localStorage.getItem(customersKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, StoredCustomer>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeCustomers(customers: Record<string, StoredCustomer>) {
  localStorage.setItem(customersKey, JSON.stringify(customers))
}

function readOrders(): Record<string, PlacedOrder[]> {
  try {
    const raw = localStorage.getItem(ordersKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, PlacedOrder[]>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

async function hashPassword(email: string, password: string) {
  const data = new TextEncoder().encode(`${email.trim().toLowerCase()}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function notifySession() {
  sessionListeners.forEach((listener) => listener())
}

export function currentSessionEmail() {
  return localStorage.getItem(sessionKey) ?? ''
}

export function accountForSession(): CustomerAccount | null {
  const email = currentSessionEmail()
  if (!email) return null
  return readCustomers()[email]?.account ?? null
}

export function watchSession(listener: () => void) {
  sessionListeners.add(listener)
  return () => {
    sessionListeners.delete(listener)
  }
}

export function signOutCustomer() {
  localStorage.removeItem(sessionKey)
  notifySession()
}

export async function registerCustomer(account: CustomerAccount, password: string) {
  const email = account.email.trim().toLowerCase()
  const customers = readCustomers()
  if (customers[email]) return 'That email already has an account. Log in instead.'
  customers[email] = { account: { ...account, email }, passwordHash: await hashPassword(email, password) }
  writeCustomers(customers)
  localStorage.setItem(sessionKey, email)
  saveAccount({ ...account, email })
  notifySession()
  await syncShopAccount(true)
  return ''
}

export async function loginCustomer(emailRaw: string, password: string) {
  const email = emailRaw.trim().toLowerCase()
  const stored = readCustomers()[email]
  if (!stored || stored.passwordHash !== (await hashPassword(email, password))) {
    return { account: null, error: 'That email or password is not right.' }
  }
  localStorage.setItem(sessionKey, email)
  saveAccount(stored.account)
  notifySession()
  const synced = await syncShopAccount(false)
  return { account: synced ?? stored.account, error: '' }
}

function rememberPlacedOrder(order: PlacedOrder) {
  sessionStorage.setItem(lastOrderKey, JSON.stringify(order))
  const email = order.email.trim().toLowerCase()
  const all = readOrders()
  const current = all[email] ?? []
  if (!current.some((item) => item.ref === order.ref)) {
    all[email] = [order, ...current]
    localStorage.setItem(ordersKey, JSON.stringify(all))
  }
  notifySession()
}

export async function publishPlacedOrder(order: PlacedOrder, account: CustomerAccount): Promise<string> {
  const email = order.email.trim().toLowerCase()
  const stored = readCustomers()[email]
  const customer = await postShop('/api/customers', {
    ...account,
    email,
    passwordHash: stored?.passwordHash ?? '',
    overwrite: true,
  })
  if (!customer.ok) return customer.error

  const savedOrder = {
    ...order,
    email,
    lines: order.lines.map((line) => ({
      ...line,
      quantity: Math.round(line.quantity),
      price: Math.round(line.price),
    })),
  }
  const posted = await postShop('/api/orders', {
    ...savedOrder,
    phone: account.phone,
    street: account.street,
    city: account.city,
    postcode: account.postcode,
    province: account.province,
    country: account.country,
  })
  if (!posted.ok) return posted.error
  const remote = posted.data.order as Partial<PlacedOrder> | undefined
  if (!remote || typeof remote !== 'object' || !remote.ref) {
    return 'The order was not saved.'
  }
  savedOrder.total = Number(remote.total ?? savedOrder.total)
  savedOrder.discount = Number(remote.discount ?? savedOrder.discount ?? 0)
  savedOrder.totalPaid = Number(remote.totalPaid ?? savedOrder.totalPaid ?? savedOrder.total)

  const nextAccount = { ...account, email }
  if (stored) {
    const customers = readCustomers()
    customers[email] = { ...stored, account: nextAccount }
    writeCustomers(customers)
  }
  saveAccount(nextAccount)
  rememberPlacedOrder(savedOrder)
  return ''
}

export function ordersForEmail(email: string): PlacedOrder[] {
  const key = email.trim().toLowerCase()
  const saved = (readOrders()[key] ?? []).map(withAmounts)
  const last = loadPlacedOrder()
  if (last && last.email.trim().toLowerCase() === key && !saved.some((item) => item.ref === last.ref)) {
    return [last, ...saved]
  }
  return saved
}

export function updateCustomerProfile(account: CustomerAccount) {
  const email = currentSessionEmail()
  if (!email) return
  const customers = readCustomers()
  const stored = customers[email]
  if (!stored) return
  const next = { ...account, email }
  customers[email] = { ...stored, account: next }
  writeCustomers(customers)
  saveAccount(next)
  notifySession()
  void syncShopAccount(true)
}

export function loadPlacedOrder(): PlacedOrder | null {
  try {
    const raw = sessionStorage.getItem(lastOrderKey)
    if (!raw) return null
    const order = JSON.parse(raw) as PlacedOrder
    if (!order.ref || !Array.isArray(order.lines)) return null
    return withAmounts(order)
  } catch {
    return null
  }
}

type RemoteAccount = Partial<CustomerAccount> & { email?: string }

function accountFromRemote(remote: RemoteAccount): CustomerAccount | null {
  const email = String(remote.email ?? '').trim().toLowerCase()
  if (!email) return null
  const kind = remote.kind === 'private' || remote.kind === 'business' ? remote.kind : ''
  return {
    ...emptyAccount(kind),
    ...remote,
    kind,
    email,
    country: remote.country || 'Spain',
  }
}

async function postShop(
  path: string,
  body: unknown,
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
  try {
    const response = await fetch(shopApiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    })
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
    if (!response.ok) {
      const error = typeof data.error === 'string' ? data.error : 'Could not save the order.'
      return { ok: false, error }
    }
    return { ok: true, data }
  } catch {
    return { ok: false, error: 'Could not reach the shop database. Try again.' }
  }
}

export async function loadOrderProgress(email: string, refs: string[]) {
  const progress: Record<string, OrderProgress> = {}
  if (!email || refs.length === 0) return progress
  try {
    const response = await fetch(shopApiUrl('/api/order-progress'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, refs }),
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return progress
    const rows = (await response.json()) as { ref?: string; status?: string }[]
    if (!Array.isArray(rows)) return progress
    for (const row of rows) {
      if (!row.ref) continue
      progress[row.ref] = orderProgressStep(row.status)
    }
  } catch {
    return progress
  }
  return progress
}

export async function syncShopAccount(overwrite: boolean) {
  try {
    const email = currentSessionEmail()
    if (!email) return null
    const stored = readCustomers()[email]
    if (!stored) return null
    const saved = await postShop('/api/customers', {
      ...stored.account,
      passwordHash: stored.passwordHash,
      overwrite,
    })
    if (!saved.ok) return null
    const remoteValue = saved.data.customer
    const remote = remoteValue && typeof remoteValue === 'object'
      ? accountFromRemote(remoteValue as RemoteAccount)
      : null
    if (remote && remote.email === email) {
      const customers = readCustomers()
      const current = customers[email]
      if (current) {
        customers[email] = { ...current, account: remote }
        writeCustomers(customers)
        saveAccount(remote)
        notifySession()
      }
    }
    const delivery = remote ?? stored.account
    const pending = readOrders()[email] ?? []
    const last = loadPlacedOrder()
    const orders = last && last.email.trim().toLowerCase() === email && !pending.some((item) => item.ref === last.ref)
      ? [last, ...pending]
      : pending
    for (const order of orders) {
      await postShop('/api/orders', {
        ...order,
        phone: delivery.phone,
        street: delivery.street,
        city: delivery.city,
        postcode: delivery.postcode,
        province: delivery.province,
        country: delivery.country,
      })
    }
    return remote
  } catch {
    return null
  }
}

export function displayName(account: CustomerAccount): string {
  if (account.kind === 'business' && account.company) return account.company
  return [account.firstName, account.lastName].filter(Boolean).join(' ')
}
