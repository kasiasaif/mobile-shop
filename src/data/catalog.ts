export type Category = number

export type Brand = string

export type CategoryRecord = {
  id: number
  name: string
  active: boolean
  sortOrder: number
  minItems: number
  outOfStock: number
}

export type Product = {
  id: number
  name: string
  category: Category
  brand: Brand
  model: string
  spec: string
  price: number
  previousPrice?: number
  image: string
  items: number
  outOfStock: number
  active: boolean
}

export const seedCategories: CategoryRecord[] = [
  { id: 1, name: 'Batteries', active: true, sortOrder: 0, minItems: 0, outOfStock: 1 },
  { id: 2, name: 'LCD', active: true, sortOrder: 1, minItems: 0, outOfStock: 1 },
]

export const brands = ['Apple', 'Samsung'] as const

export const categories: Category[] = seedCategories.map((item) => item.id)

export function labelForCategory(id: number | string, list: CategoryRecord[] = seedCategories): string {
  if (id === 'All' || id === 0) return 'All'
  const numeric = Number(id)
  return list.find((item) => item.id === numeric)?.name ?? String(id)
}

export function minItemsForCategory(id: number, list: CategoryRecord[]): number {
  return list.find((item) => item.id === id)?.minItems ?? 0
}

export function outOfStockForCategory(id: number, list: CategoryRecord[]): number {
  return list.find((item) => item.id === id)?.outOfStock ?? 1
}

export function isOutOfStock(
  product: Pick<Product, 'items' | 'category'>,
  list: CategoryRecord[] = [],
): boolean {
  return Number(product.items) < outOfStockForCategory(product.category, list)
}

export function isBelowMinStock(
  product: Pick<Product, 'items' | 'category'> & Partial<Pick<Product, 'outOfStock'>>,
  list: CategoryRecord[],
): boolean {
  return !isOutOfStock(product, list) && product.items < minItemsForCategory(product.category, list)
}

export function stockStatusLabel(
  product: Pick<Product, 'items' | 'category'> & Partial<Pick<Product, 'outOfStock'>>,
  list: CategoryRecord[],
): string {
  if (isOutOfStock(product, list)) return 'Out of stock'
  if (isBelowMinStock(product, list)) return 'Low in stock'
  return ''
}
