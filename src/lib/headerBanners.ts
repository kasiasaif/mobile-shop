import { useCallback } from 'react'
import { parseHeaderBannerFont, parseOpacity, tickerInk, type HeaderBanner } from '../data/headerBanner'
import { isActive } from './active'
import { readCatalogJson, useCatalogLive } from './catalogApi'

function asHex(value: unknown, fallback: string) {
  const raw = String(value ?? '').trim()
  return /^#([0-9a-fA-F]{6})$/.test(raw) ? raw : fallback
}

function asHeaderBanner(item: HeaderBanner): HeaderBanner | null {
  const id = Number(item.id)
  const text = String(item.text ?? '').trim()
  const background = asHex(item.background, '#111111')
  if (!Number.isInteger(id) || id < 1 || !text) return null
  return {
    ...item,
    id,
    text,
    background,
    backgroundOpacity: parseOpacity(item.backgroundOpacity ?? 100),
    color: asHex(item.color, tickerInk(background)),
    font: parseHeaderBannerFont(item.font),
    bold: item.bold == null ? true : isActive(item.bold),
    active: isActive(item.active),
    sortOrder: Number(item.sortOrder ?? 0),
  }
}

export async function loadHeaderBanners(): Promise<HeaderBanner[]> {
  try {
    const items = await readCatalogJson<HeaderBanner[]>(
      '/api/header-banners',
      `${import.meta.env.BASE_URL}header-banners.json`,
    )
    return items.map(asHeaderBanner).filter((item): item is HeaderBanner => item !== null)
  } catch {
    return []
  }
}

export function useHeaderBanners() {
  const load = useCallback(async () => {
    const items = await loadHeaderBanners()
    return items
      .filter((item) => isActive(item.active))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
  }, [])
  const { data, status } = useCatalogLive(load, [] as HeaderBanner[])
  return { banners: data, status }
}
