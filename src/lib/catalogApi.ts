import { useEffect, useState } from 'react'
import { adminUrl } from '../config'

function catalogUrl(path: string) {
  if (import.meta.env.DEV) return path
  return `${adminUrl.replace(/\/$/, '')}${path}`
}

export async function readCatalogJson<T>(path: string, fallback: string): Promise<T> {
  try {
    const response = await fetch(catalogUrl(path), { cache: 'no-store' })
    if (response.ok) return (await response.json()) as T
  } catch {
    // Admin may be asleep; use the last exported JSON.
  }
  const response = await fetch(fallback, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Could not load ${fallback}`)
  return (await response.json()) as T
}

export function useCatalogLive<T>(load: () => Promise<T>, empty: T) {
  const [data, setData] = useState<T>(empty)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false

    async function refresh() {
      try {
        const items = await load()
        if (cancelled) return
        setData(items)
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus((current) => (current === 'ready' ? current : 'error'))
      }
    }

    void refresh()
    const onFocus = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    const timer = window.setInterval(refresh, 12000)

    return () => {
      cancelled = true
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
      window.clearInterval(timer)
    }
  }, [load])

  return { data, status }
}
