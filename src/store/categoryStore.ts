import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { Category } from '../types'

// Default categories as fallback
const defaultCategories: Category[] = [
  { id: 'ice', name: 'น้ำแข็ง', icon: '❄️', color: 'bg-blue-500', light_color: 'bg-blue-50', text_color: 'text-blue-600', sort_order: 1, is_active: true, has_deposit: false },
  { id: 'gas', name: 'แก๊ส', icon: '🔥', color: 'bg-orange-500', light_color: 'bg-orange-50', text_color: 'text-orange-600', sort_order: 2, is_active: true, has_deposit: true },
  { id: 'water', name: 'น้ำดื่ม', icon: '💧', color: 'bg-cyan-500', light_color: 'bg-cyan-50', text_color: 'text-cyan-600', sort_order: 3, is_active: true, has_deposit: false },
]

interface CategoryState {
  categories: Category[]
  isLoading: boolean
  error: string | null
  hasFetched: boolean
  fetchCategories: () => Promise<void>
  addCategory: (category: Omit<Category, 'created_at'>) => Promise<Category>
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  getCategoryConfig: (categoryId: string) => Category
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: defaultCategories,
  isLoading: false,
  error: null,
  hasFetched: false,

  fetchCategories: async () => {
    // Skip if already fetched and not forcing refresh
    if (get().hasFetched && get().categories.length > 0) {
      return
    }

    set({ isLoading: true, error: null })
    try {
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (fetchError) throw fetchError
      if (data && data.length > 0) {
        set({ categories: data, hasFetched: true })
      } else {
        set({ hasFetched: true })
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err)
      set({ error: (err as Error).message })
    } finally {
      set({ isLoading: false })
    }
  },

  addCategory: async (category) => {
    try {
      const { data, error: insertError } = await supabase
        .from('categories')
        .insert(category)
        .select()
        .single()

      if (insertError) throw insertError
      set(state => ({
        categories: [...state.categories, data].sort((a, b) => a.sort_order - b.sort_order)
      }))
      return data
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  updateCategory: async (id, updates) => {
    try {
      const { error: updateError } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)

      if (updateError) throw updateError
      set(state => ({
        categories: state.categories
          .map(c => c.id === id ? { ...c, ...updates } : c)
          .sort((a, b) => a.sort_order - b.sort_order)
      }))
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  deleteCategory: async (id) => {
    try {
      const { error: deleteError } = await supabase
        .from('categories')
        .update({ is_active: false })
        .eq('id', id)

      if (deleteError) throw deleteError
      set(state => ({
        categories: state.categories.filter(c => c.id !== id)
      }))
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  getCategoryConfig: (categoryId) => {
    const { categories } = get()
    return categories.find(c => c.id === categoryId) || {
      id: categoryId,
      name: categoryId,
      icon: '📦',
      color: 'bg-gray-500',
      light_color: 'bg-gray-50',
      text_color: 'text-gray-600',
      sort_order: 99,
      is_active: true,
      has_deposit: false
    }
  }
}))
