type BrandIconProps = {
  brand: string
}

export function BrandIcon({ brand }: BrandIconProps) {
  const name = brand.trim().toLowerCase()

  if (name.includes('apple')) {
    return (
      <svg className="shop-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M16.7 12.4c0-2.7 2.2-3.5 2.3-3.6-1.3-1.9-3.2-2.1-3.9-2.1-1.7-.2-3.2 1-4 1-.9 0-2.2-1-3.6-1-1.8 0-3.5 1.1-4.4 2.7-1.9 3.3-.5 8.1 1.3 10.8.9 1.3 2 2.7 3.4 2.7 1.4-.1 1.9-.9 3.5-.9s2.1.9 3.5.9 2.4-1.3 3.3-2.5c1-1.5 1.4-2.9 1.4-3-.1 0-2.8-1.1-2.8-4zM14 4.7c.7-.9 1.3-2.2 1.1-3.5-1.1.1-2.4.7-3.1 1.6-.7.8-1.3 2-1.1 3.2 1.2.1 2.4-.6 3.1-1.3z"
        />
      </svg>
    )
  }

  if (name.includes('samsung') || name.includes('galaxy')) {
    return (
      <svg className="shop-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M7.1 7.2h9.8a4.8 4.8 0 0 1 0 9.6H7.1a4.8 4.8 0 0 1 0-9.6z"
        />
      </svg>
    )
  }

  return (
    <svg className="shop-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="7.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

export function SortIcon({ kind }: { kind: 'default' | 'asc' | 'desc' }) {
  if (kind === 'asc') {
    return (
      <svg className="shop-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 4.2 5.8 11h3.7v8.8h4.9V11h3.8L12 4.2Z"
        />
      </svg>
    )
  }

  if (kind === 'desc') {
    return (
      <svg className="shop-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 19.8 18.2 13h-3.7V4.2H9.6V13H5.8L12 19.8Z"
        />
      </svg>
    )
  }

  return (
    <svg className="shop-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M8.2 4.2 3.4 10h3.1v3.2h3.4V10h3.1L8.2 4.2Zm7.6 15.6 4.8-5.8h-3.1V10.8h-3.4V14h-3.1l4.8 5.8Z" />
    </svg>
  )
}
