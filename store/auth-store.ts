import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  role: 'admin' | 'customer'
  created_at: string
}

interface AuthStore {
  user: User | null
  loading: boolean
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      loading: false,

      initialize: async () => {
        try {
          set({ loading: true })
          
          // Check for stored session in localStorage
          const storedUser = localStorage.getItem('auth-user')
          if (storedUser) {
            const user = JSON.parse(storedUser)
            set({ user, loading: false })
          } else {
            set({ user: null, loading: false })
          }
        } catch (error) {
          console.error('Error initializing auth:', error)
          set({ user: null, loading: false })
        }
      },

      signIn: async (email: string, password: string) => {
        try {
          set({ loading: true })
          
          // Simple admin check - in production this would be a real authentication system
          if (email === 'admin@michaelhaslimphoto.com' && password === 'admin123') {
            const user: User = {
              id: 'admin-1',
              email: email,
              full_name: 'Admin User',
              role: 'admin',
              created_at: new Date().toISOString()
            }
            
            localStorage.setItem('auth-user', JSON.stringify(user))
            set({ user, loading: false })
          } else {
            set({ loading: false })
            throw new Error('Invalid credentials')
          }
        } catch (error) {
          set({ loading: false })
          throw error
        }
      },

      signOut: async () => {
        try {
          set({ loading: true })
          
          localStorage.removeItem('auth-user')
          set({ user: null, loading: false })
        } catch (error) {
          set({ loading: false })
          throw error
        }
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ user: state.user }),
    }
  )
)