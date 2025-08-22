import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string
  title: string
  price: number
  image: string
  quantity: number
  selectedSize?: string
  selectedMaterial?: string
}

interface CartStore {
  items: CartItem[]
  isOpen: boolean
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  getTotal: () => number
  getItemCount: () => number
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      
      addItem: (item) => {
        const existingItem = get().items.find(i => i.id === item.id)
        
        if (existingItem) {
          set({
            items: get().items.map(i =>
              i.id === item.id
                ? { ...i, quantity: i.quantity + (item.quantity || 1) }
                : i
            )
          })
        } else {
          set({
            items: [...get().items, { ...item, quantity: item.quantity || 1 }]
          })
        }
        
        // Auto-open cart when item is added
        set({ isOpen: true })
      },
      
      removeItem: (id) => {
        set({
          items: get().items.filter(item => item.id !== id)
        })
      },
      
      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id)
          return
        }
        
        set({
          items: get().items.map(item =>
            item.id === id ? { ...item, quantity } : item
          )
        })
      },
      
      clearCart: () => {
        set({ items: [] })
      },
      
      openCart: () => {
        set({ isOpen: true })
      },
      
      closeCart: () => {
        set({ isOpen: false })
      },
      
      getTotal: () => {
        return get().items.reduce((total, item) => total + (item.price * item.quantity), 0)
      },
      
      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0)
      }
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({ items: state.items })
    }
  )
)