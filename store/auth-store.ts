import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase/client'
import { User, AuthStore } from '@/types'

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      loading: true,

      initialize: async () => {
        try {
          set({ loading: true })
          
          // Get current session
          const { data: { session }, error } = await supabase.auth.getSession()
          
          if (error) {
            console.error('Error getting session:', error)
            set({ user: null, loading: false })
            return
          }

          if (session?.user) {
            // Fetch user profile
            const { data: profile, error: profileError } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()

            if (profileError) {
              console.error('Error fetching user profile:', profileError)
              set({ user: null, loading: false })
              return
            }

            const user: User = {
              id: session.user.id,
              email: session.user.email || '',
              full_name: profile?.full_name || session.user.user_metadata?.full_name || '',
              avatar_url: profile?.avatar_url || session.user.user_metadata?.avatar_url || '',
              role: profile?.role || 'customer',
              created_at: session.user.created_at,
            }

            set({ user, loading: false })
          } else {
            set({ user: null, loading: false })
          }

          // Listen for auth changes
          supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              const { data: profile } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', session.user.id)
                .single()

              const user: User = {
                id: session.user.id,
                email: session.user.email || '',
                full_name: profile?.full_name || session.user.user_metadata?.full_name || '',
                avatar_url: profile?.avatar_url || session.user.user_metadata?.avatar_url || '',
                role: profile?.role || 'customer',
                created_at: session.user.created_at,
              }

              set({ user, loading: false })
            } else if (event === 'SIGNED_OUT') {
              set({ user: null, loading: false })
            }
          })
        } catch (error) {
          console.error('Error initializing auth:', error)
          set({ user: null, loading: false })
        }
      },

      signIn: async (email: string, password: string) => {
        try {
          set({ loading: true })
          
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (error) {
            set({ loading: false })
            throw error
          }

          // User will be set in the auth state change listener
        } catch (error) {
          set({ loading: false })
          throw error
        }
      },

      signUp: async (email: string, password: string, fullName?: string) => {
        try {
          set({ loading: true })
          
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName,
              },
            },
          })

          if (error) {
            set({ loading: false })
            throw error
          }

          // If email confirmation is required, user will be null
          // Otherwise, user will be set in the auth state change listener
          set({ loading: false })
        } catch (error) {
          set({ loading: false })
          throw error
        }
      },

      signOut: async () => {
        try {
          set({ loading: true })
          
          const { error } = await supabase.auth.signOut()
          
          if (error) {
            set({ loading: false })
            throw error
          }

          // User will be cleared in the auth state change listener
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