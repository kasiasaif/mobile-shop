import { useCallback } from 'react'
import { outOfStockForCategory, type Product } from '../data/site'
import { isActive } from './active'
import { readCatalogJson, useCatalogLive } from './catalogApi'
import { loadCategories } from './categories'

function isNumericId(value: unknown): boolean {
  const id = Number(value)
  return Number.isInteger(id) && id > 0
}

function asCount(value: unknown, fallback: number): number {
  const count = Number(value)
  return Number.isInteger(count) ? count : fallback
}

function withImageUrl(product: Product): Product {
  const raw = product as Product & { out_of_stock?: unknown }
  const hasStock = product.items != null || product.outOfStock != null || raw.out_of_stock != null
  const base = import.meta.env.BASE_URL
  return {
    ...product,
    id: Number(product.id),
    category: Number(product.category),
    image: `${base}${product.image.replace(/^\//, '')}`,
    items: asCount(product.items, hasStock ? 0 : 1),
    outOfStock: asCount(product.outOfStock ?? raw.out_of_stock, 1),
    active: isActive(product.active),
  }
}

export async function loadProducts(): Promise<Product[]> {
  const items = await readCatalogJson<Product[]>('/api/products', `${import.meta.env.BASE_URL}products.json`)
  return items.map(withImageUrl).filter((item) => isNumericId(item.id) && isNumericId(item.category))
}

export async function loadLiveProducts(): Promise<Product[]> {
  const [products, categories] = await Promise.all([loadProducts(), loadCategories()])
  const liveCategoryIds = new Set(
    categories.filter((item) => isActive(item.active)).map((item) => item.id),
  )
  return products
    .filter((item) => isActive(item.active) && liveCategoryIds.has(item.category))
    .map((item) => ({
      ...item,
      outOfStock: outOfStockForCategory(item.category, categories),
    }))
}

export function useProducts() {
  const load = useCallback(() => loadLiveProducts(), [])
  const { data, status } = useCatalogLive(load, [] as Product[])
  return { products: data, status }
}
