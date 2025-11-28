import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

export interface User {
  id: string
  name: string
  role: 'admin' | 'cashier'
  is_active: boolean
}

interface AuthStore {
  user: User | null
  isLoading: boolean
  error: string | null
  login: (pin: string) => Promise<boolean>
  logout: () => void
  fetchUsers: () => Promise<User[]>
  createUser: (name: string, pin: string, role: 'admin' | 'cashier') => Promise<boolean>
  deleteUser: (id: string) => Promise<boolean>
  clearError: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      error: null,

      login: async (pin: string) => {
        set({ isLoading: true, error: null })
        try {
          const { data, error } = await supabase
            .from('users')
            .select('id, name, role, is_active')
            .eq('pin', pin)
            .eq('is_active', true)
            .single()

          if (error || !data) {
            set({ error: 'PIN ไม่ถูกต้อง', isLoading: false })
            return false
          }

          // Cast role to ensure type safety
          const user: User = {
            id: data.id,
            name: data.name,
            role: data.role as 'admin' | 'cashier',
            is_active: data.is_active
          }

          set({ user, isLoading: false })
          return true
        } catch (err) {
          set({ error: 'เกิดข้อผิดพลาด', isLoading: false })
          return false
        }
      },

      logout: () => {
        set({ user: null })
      },

      fetchUsers: async () => {
        const { data } = await supabase
          .from('users')
          .select('id, name, role, is_active')
          .order('created_at')
        return data || []
      },

      createUser: async (name: string, pin: string, role: 'admin' | 'cashier') => {
        try {
          const { error } = await supabase.from('users').insert({
            id: `user-${Date.now()}`,
            name,
            pin,
            role,
          })
          return !error
        } catch {
          return false
        }
      },

      deleteUser: async (id: string) => {
        const { user } = get()
        if (user?.id === id) return false // Can't delete self
        
        try {
          await supabase.from('users').update({ is_active: false }).eq('id', id)
          return true
        } catch {
          return false
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'ice-gas-pos-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
)
