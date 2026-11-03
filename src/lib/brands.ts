import { useCallback } from 'react'
import { seedBrands, type BrandRecord } from '../data/site'
import { isActive } from './active'
import { readCatalogJson, useCatalogLive } from './catalogApi'

function asBrand(item: BrandRecord): BrandRecord | null {
  const id = Number(item.id)
  if (!Number.isInteger(id) || id < 1) return null
  const name = String(item.name ?? '').trim()
  const image = String(item.image ?? '').trim()
  if (!name) return null
  const base = import.meta.env.BASE_URL
  return {
    ...item,
    id,
    name,
    image: image ? `${base}${image.replace(/^\//, '')}` : '',
    active: isActive(item.active),
  }
}

export async function loadBrands(): Promise<BrandRecord[]> {
  try {
    const items = await readCatalogJson<BrandRecord[]>(
      '/api/brands',
      `${import.meta.env.BASE_URL}brands.json`,
    )
    return items.map(asBrand).filter((item): item is BrandRecord => item !== null)
  } catch {
    return seedBrands.map(asBrand).filter((item): item is BrandRecord => item !== null)
  }
}

export async function loadLiveBrands(): Promise<BrandRecord[]> {
  const items = await loadBrands()
  return items
    .filter((item) => isActive(item.active))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function useBrands() {
  const load = useCallback(() => loadLiveBrands(), [])
  const { data, status } = useCatalogLive(load, [] as BrandRecord[])
  return { brands: data, status }
}
