import { describe, it, expect, afterAll } from 'vitest'
import * as fc from 'fast-check'
import { supabase } from '../lib/supabase'
import { Product } from '../types'

/**
 * **Feature: ice-gas-pos, Property 15: Product CRUD Round-Trip**
 * 
 * *For any* valid product data, creating a product then fetching it 
 * SHALL return equivalent product data.
 * 
 * **Validates: Requirements 1.2, 1.3**
 */

// Track created product IDs for cleanup
const createdProductIds: string[] = []

// Cleanup after all tests
afterAll(async () => {
  // Delete all test products created during tests
  if (createdProductIds.length > 0) {
    await supabase
      .from('products')
      .delete()
      .in('id', createdProductIds)
  }
})

// Arbitrary for generating valid product input (with id, as DB doesn't auto-generate)
const productInputArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  price: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }).map(p => Math.round(p * 100) / 100),
  category: fc.constantFrom('ice' as const, 'gas' as const, 'water' as const),
  unit: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0)
})

// Product input type with required id
type ProductInput = {
  id: string
  name: string
  price: number
  category: 'ice' | 'gas' | 'water'
  unit: string
}

// Helper to create product and track for cleanup
async function createProduct(productData: ProductInput): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .insert(productData)
    .select()
    .single()
  
  if (error) {
    console.error('Create error:', error)
    return null
  }
  
  if (data) {
    createdProductIds.push(data.id)
  }
  
  return data
}

// Helper to fetch product by ID
async function fetchProduct(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) {
    console.error('Fetch error:', error)
    return null
  }
  
  return data
}

// Helper to update product
async function updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    console.error('Update error:', error)
    return null
  }
  
  return data
}

describe('Product CRUD Round-Trip Property Tests', () => {
  it('**Feature: ice-gas-pos, Property 15: Product CRUD Round-Trip** - create then fetch returns equivalent data', async () => {
    await fc.assert(
      fc.asyncProperty(productInputArbitrary, async (productInput) => {
        // Create product
        const created = await createProduct(productInput)
        expect(created).not.toBeNull()
        
        if (!created) return
        
        // Fetch the created product
        const fetched = await fetchProduct(created.id)
        expect(fetched).not.toBeNull()
        
        if (!fetched) return
        
        // Verify round-trip: fetched data should match input
        expect(fetched.name).toBe(productInput.name)
        expect(fetched.price).toBeCloseTo(productInput.price, 2)
        expect(fetched.category).toBe(productInput.category)
        expect(fetched.unit).toBe(productInput.unit)
        
        // Verify ID was assigned
        expect(fetched.id).toBeDefined()
        expect(typeof fetched.id).toBe('string')
      }),
      { numRuns: 10 } // Reduced runs for database tests to avoid rate limiting
    )
  })

  it('**Feature: ice-gas-pos, Property 15: Product CRUD Round-Trip** - update then fetch returns updated data', async () => {
    await fc.assert(
      fc.asyncProperty(
        productInputArbitrary,
        productInputArbitrary,
        async (initialProduct, updatedFields) => {
          // Create initial product
          const created = await createProduct(initialProduct)
          expect(created).not.toBeNull()
          
          if (!created) return
          
          // Update the product
          const updated = await updateProduct(created.id, {
            name: updatedFields.name,
            price: updatedFields.price,
            category: updatedFields.category,
            unit: updatedFields.unit
          })
          expect(updated).not.toBeNull()
          
          if (!updated) return
          
          // Fetch the updated product
          const fetched = await fetchProduct(created.id)
          expect(fetched).not.toBeNull()
          
          if (!fetched) return
          
          // Verify round-trip: fetched data should match updated values
          expect(fetched.name).toBe(updatedFields.name)
          expect(fetched.price).toBeCloseTo(updatedFields.price, 2)
          expect(fetched.category).toBe(updatedFields.category)
          expect(fetched.unit).toBe(updatedFields.unit)
          
          // ID should remain the same
          expect(fetched.id).toBe(created.id)
        }
      ),
      { numRuns: 10 } // Reduced runs for database tests
    )
  })

  it('**Feature: ice-gas-pos, Property 15: Product CRUD Round-Trip** - created product appears in product list', async () => {
    await fc.assert(
      fc.asyncProperty(productInputArbitrary, async (productInput) => {
        // Create product
        const created = await createProduct(productInput)
        expect(created).not.toBeNull()
        
        if (!created) return
        
        // Fetch all products
        const { data: products, error } = await supabase
          .from('products')
          .select('*')
        
        expect(error).toBeNull()
        expect(products).not.toBeNull()
        
        if (!products) return
        
        // Find the created product in the list
        const found = products.find(p => p.id === created.id)
        expect(found).toBeDefined()
        
        if (!found) return
        
        // Verify data matches
        expect(found.name).toBe(productInput.name)
        expect(found.price).toBeCloseTo(productInput.price, 2)
        expect(found.category).toBe(productInput.category)
        expect(found.unit).toBe(productInput.unit)
      }),
      { numRuns: 10 }
    )
  })
})
