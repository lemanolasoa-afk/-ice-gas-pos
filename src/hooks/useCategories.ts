import { useEffect } from 'react'
import { useCategoryStore } from '../store/categoryStore'

export function useCategories() {
  const {
    categories,
    isLoading,
    error,
    hasFetched,
    fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    getCategoryConfig
  } = useCategoryStore()

  useEffect(() => {
    if (!hasFetched) {
      fetchCategories()
    }
  }, [hasFetched, fetchCategories])

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
