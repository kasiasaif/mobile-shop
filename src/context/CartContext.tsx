import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { isOutOfStock, type Product } from '../data/site'
import { isActive } from '../lib/active'

export type CartLine = {
  product: Product
  quantity: number
}

type CartContextValue = {
  lines: CartLine[]
  count: number
  total: number
  add: (product: Product) => void
  remove: (id: number) => void
  setQuantity: (id: number, quantity: number) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([])

  const value = useMemo(() => {
    const count = lines.reduce((sum, line) => sum + line.quantity, 0)
    const total = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0)

    return {
      lines,
      count,
      total,
      add(product: Product) {
        if (!isActive(product.active)) return
        if (isOutOfStock(product)) return
        const max = Number(product.items)
        setLines((current) => {
          const existing = current.find((line) => line.product.id === product.id)
          if (existing) {
            return current.map((line) =>
              line.product.id === product.id
                ? { ...line, quantity: Math.min(line.quantity + 1, max) }
                : line,
            )
          }
          return [...current, { product, quantity: 1 }]
        })
      },
      remove(id: number) {
        setLines((current) => current.filter((line) => line.product.id !== id))
      },
      setQuantity(id: number, quantity: number) {
        setLines((current) => {
          if (quantity < 1) {
            return current.filter((line) => line.product.id !== id)
          }
          return current.map((line) =>
            line.product.id === id ? { ...line, quantity } : line,
          )
        })
      },
      clear() {
        setLines([])
      },
    }
  }, [lines])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const cart = useContext(CartContext)
  if (!cart) {
    throw new Error('useCart must be used inside CartProvider')
  }
  return cart
}
