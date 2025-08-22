import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Cart, CartItem, Product, PrintOption, CartStore } from '@/types'
import { calculatePrintPrice } from '@/lib/utils'

const initialCart: Cart = {
  items: [],
  total: 0,
  item_count: 0,
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      cart: initialCart,

      addItem: (product: Product, printOption: PrintOption, quantity = 1) => {
        const state = get()
        const existingItemIndex = state.cart.items.findIndex(
          item => 
            item.product.id === product.id && 
            item.print_option.id === printOption.id
        )

        const unitPrice = calculatePrintPrice(product.base_price, printOption.price_modifier)
        
        let newItems: CartItem[]

        if (existingItemIndex >= 0) {
          // Update existing item
          newItems = state.cart.items.map((item, index) => {
            if (index === existingItemIndex) {
              const newQuantity = item.quantity + quantity
              return {
                ...item,
                quantity: newQuantity,
                total_price: unitPrice * newQuantity,
              }
            }
            return item
          })
        } else {
          // Add new item
          const newItem: CartItem = {
            product,
            print_option: printOption,
            quantity,
            total_price: unitPrice * quantity,
          }
          newItems = [...state.cart.items, newItem]
        }

        const newCart = {
          items: newItems,
          total: newItems.reduce((sum, item) => sum + item.total_price, 0),
          item_count: newItems.reduce((sum, item) => sum + item.quantity, 0),
        }

        set({ cart: newCart })
      },

      removeItem: (itemIndex: number) => {
        const state = get()
        const newItems = state.cart.items.filter((_, index) => index !== itemIndex)
        
        const newCart = {
          items: newItems,
          total: newItems.reduce((sum, item) => sum + item.total_price, 0),
          item_count: newItems.reduce((sum, item) => sum + item.quantity, 0),
        }

        set({ cart: newCart })
      },

      updateQuantity: (itemIndex: number, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(itemIndex)
          return
        }

        const state = get()
        const newItems = state.cart.items.map((item, index) => {
          if (index === itemIndex) {
            const unitPrice = calculatePrintPrice(
              item.product.base_price, 
              item.print_option.price_modifier
            )
            return {
              ...item,
              quantity,
              total_price: unitPrice * quantity,
            }
          }
          return item
        })

        const newCart = {
          items: newItems,
          total: newItems.reduce((sum, item) => sum + item.total_price, 0),
          item_count: newItems.reduce((sum, item) => sum + item.quantity, 0),
        }

        set({ cart: newCart })
      },

      clearCart: () => {
        set({ cart: initialCart })
      },

      loadCart: () => {
        // This is handled by the persist middleware
        // but we can add custom logic here if needed
        const state = get()
        
        // Recalculate totals in case prices have changed
        const newItems = state.cart.items.map(item => {
          const unitPrice = calculatePrintPrice(
            item.product.base_price, 
            item.print_option.price_modifier
          )
          return {
            ...item,
            total_price: unitPrice * item.quantity,
          }
        })

        const newCart = {
          items: newItems,
          total: newItems.reduce((sum, item) => sum + item.total_price, 0),
          item_count: newItems.reduce((sum, item) => sum + item.quantity, 0),
        }

        set({ cart: newCart })
      },

      saveCart: () => {
        // This is handled by the persist middleware automatically
        // but we can add custom logic here if needed (e.g., sync with server)
      },
    }),
    {
      name: 'cart-store',
      version: 1,
      onRehydrateStorage: () => (state) => {
        // Recalculate cart totals after rehydration
        if (state) {
          state.loadCart()
        }
      },
    }
  )
)