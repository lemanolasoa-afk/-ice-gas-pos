import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Category } from '../types'

// Default categories as fallback
const defaultCategories: Category[] = [
  { id: 'ice', name: 'น้ำแข็ง', icon: '❄️', color: 'bg-blue-500', light_color: 'bg-blue-50', text_color: 'text-blue-600', sort_order: 1, is_active: true, has_deposit: false },
  { id: 'gas', name: 'แก๊ส', icon: '🔥', color: 'bg-orange-500', light_color: 'bg-orange-50', text_color: 'text-orange-600', sort_order: 2, is_active: true, has_deposit: true },
  { id: 'water', name: 'น้ำดื่ม', icon: '💧', color: 'bg-cyan-500', light_color: 'bg-cyan-50', text_color: 'text-cyan-600', sort_order: 3, is_active: true, has_deposit: false },
]

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>(defaultCategories)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (fetchError) throw fetchError
      if (data && data.length > 0) {
        setCategories(data)
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err)
      setError((err as Error).message)
      // Keep default categories on error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const addCategory = async (category: Omit<Category, 'created_at'>) => {
    try {
      const { data, error: insertError } = await supabase
        .from('categories')
        .insert(category)
        .select()
        .single()

      if (insertError) throw insertError
      setCategories(prev => [...prev, data].sort((a, b) => a.sort_order - b.sort_order))
      return data
    } catch (err) {
      setError((err as Error).message)
      throw err
    }
  }

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      const { error: updateError } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)

      if (updateError) throw updateError
      setCategories(prev => 
        prev.map(c => c.id === id ? { ...c, ...updates } : c)
          .sort((a, b) => a.sort_order - b.sort_order)
      )
    } catch (err) {
      setError((err as Error).message)
      throw err
    }
  }

  const deleteCategory = async (id: string) => {
    try {
      // Soft delete - just set is_active to false
      const { error: deleteError } = await supabase
        .from('categories')
        .update({ is_active: false })
        .eq('id', id)

      if (deleteError) throw deleteError
      setCategories(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      setError((err as Error).message)
      throw err
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // Helper to get category config by id
  const getCategoryConfig = (categoryId: string) => {
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

  return {
    categories,
    isLoading,
    error,
    fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    getCategoryConfig
  }
}
