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

export function displayName(account: CustomerAccount): string {
  if (account.kind === 'business' && account.company) return account.company
  return [account.firstName, account.lastName].filter(Boolean).join(' ')
}
