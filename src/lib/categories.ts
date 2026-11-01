import { useCallback } from 'react'
import { seedCategories, type CategoryRecord } from '../data/site'
import { isActive } from './active'
import { readCatalogJson, useCatalogLive } from './catalogApi'

function asCategory(item: CategoryRecord): CategoryRecord | null {
  const id = Number(item.id)
  if (!Number.isInteger(id) || id < 1) return null
  const raw = item as CategoryRecord & { out_of_stock?: unknown }
  const minItems = Number(item.minItems)
  const outOfStock = Number(item.outOfStock ?? raw.out_of_stock)
  return {
    ...item,
    id,
    active: isActive(item.active),
    minItems: Number.isInteger(minItems) && minItems >= 0 ? minItems : 0,
    outOfStock: Number.isInteger(outOfStock) && outOfStock >= 0 ? outOfStock : 1,
  }
}

export async function loadCategories(): Promise<CategoryRecord[]> {
  try {
    const items = await readCatalogJson<CategoryRecord[]>(
      '/api/categories',
      `${import.meta.env.BASE_URL}categories.json`,
    )
    return items.map(asCategory).filter((item): item is CategoryRecord => item !== null)
  } catch {
    return seedCategories.map(asCategory).filter((item): item is CategoryRecord => item !== null)
  }
}

export async function loadLiveCategories(): Promise<CategoryRecord[]> {
  const items = await loadCategories()
  return items
    .filter((item) => isActive(item.active))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

export function useCategories() {
  const load = useCallback(() => loadLiveCategories(), [])
  const { data, status } = useCatalogLive(load, [] as CategoryRecord[])
  return { categories: data, status }
}
