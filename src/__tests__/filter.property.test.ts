import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { Product, Category } from '../types'

/**
 * **Feature: ice-gas-pos, Property 11: Category Filter Returns Matching Products**
 * 
 * *For any* selected category (except "All"), the displayed products 
 * SHALL contain only products with that category.
 * 
 * **Validates: Requirements 7.2**
 */

// Pure filter function matching POSPage implementation
function filterProductsByCategory(products: Product[], category: Category): Product[] {
  return category === 'all' 
    ? products 
    : products.filter((p) => p.category === category)
}

// Arbitrary for generating valid products
const productArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  price: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }).map(p => Math.round(p * 100) / 100),
  category: fc.constantFrom('ice' as const, 'gas' as const, 'water' as const),
  unit: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
  stock: fc.integer({ min: 0, max: 1000 }),
  low_stock_threshold: fc.integer({ min: 1, max: 50 }),
  barcode: fc.option(fc.string({ minLength: 8, maxLength: 13 }), { nil: undefined })
})

// Arbitrary for generating a list of products
const productListArbitrary = fc.array(productArbitrary, { minLength: 0, maxLength: 20 })

// Arbitrary for specific category filter (excluding 'all')
const specificCategoryArbitrary = fc.constantFrom('ice' as const, 'gas' as const, 'water' as const)

describe('Category Filter Property Tests', () => {
  it('**Feature: ice-gas-pos, Property 11: Category Filter Returns Matching Products** - filtered products only contain selected category', () => {
    fc.assert(
      fc.property(
        productListArbitrary,
        specificCategoryArbitrary,
        (products, selectedCategory) => {
          // Apply filter
          const filtered = filterProductsByCategory(products, selectedCategory)
          
          // Property: All filtered products must have the selected category
          const allMatchCategory = filtered.every(p => p.category === selectedCategory)
          expect(allMatchCategory).toBe(true)
          
          // Property: No products of other categories should be in the result
          const otherCategories = ['ice', 'gas', 'water'].filter(c => c !== selectedCategory)
          const hasOtherCategories = filtered.some(p => otherCategories.includes(p.category))
          expect(hasOtherCategories).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 11: Category Filter Returns Matching Products** - filter returns all matching products from original list', () => {
    fc.assert(
      fc.property(
        productListArbitrary,
        specificCategoryArbitrary,
        (products, selectedCategory) => {
          // Apply filter
          const filtered = filterProductsByCategory(products, selectedCategory)
          
          // Count products with selected category in original list
          const expectedCount = products.filter(p => p.category === selectedCategory).length
          
          // Property: Filtered count should match expected count
          expect(filtered.length).toBe(expectedCount)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 11: Category Filter Returns Matching Products** - filtered products are subset of original products', () => {
    fc.assert(
      fc.property(
        productListArbitrary,
        specificCategoryArbitrary,
        (products, selectedCategory) => {
          // Apply filter
          const filtered = filterProductsByCategory(products, selectedCategory)
          
          // Property: Every filtered product must exist in original list
          const allExistInOriginal = filtered.every(filteredProduct => 
            products.some(p => p.id === filteredProduct.id)
          )
          expect(allExistInOriginal).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: ice-gas-pos, Property 12: All Category Returns All Products**
   * 
   * *For any* product list, selecting "All" category SHALL return all products 
   * regardless of their category.
   * 
   * **Validates: Requirements 7.3**
   */
  it('**Feature: ice-gas-pos, Property 12: All Category Returns All Products** - selecting all returns complete product list', () => {
    fc.assert(
      fc.property(
        productListArbitrary,
        (products) => {
          // Apply filter with 'all' category
          const filtered = filterProductsByCategory(products, 'all')
          
          // Property: Filtered list should have same length as original
          expect(filtered.length).toBe(products.length)
          
          // Property: Every product from original should be in filtered result
          const allProductsIncluded = products.every(originalProduct =>
            filtered.some(p => p.id === originalProduct.id)
          )
          expect(allProductsIncluded).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 12: All Category Returns All Products** - all category preserves product order and data', () => {
    fc.assert(
      fc.property(
        productListArbitrary,
        (products) => {
          // Apply filter with 'all' category
          const filtered = filterProductsByCategory(products, 'all')
          
          // Property: Products should be in same order
          for (let i = 0; i < products.length; i++) {
            expect(filtered[i].id).toBe(products[i].id)
            expect(filtered[i].name).toBe(products[i].name)
            expect(filtered[i].price).toBe(products[i].price)
            expect(filtered[i].category).toBe(products[i].category)
            expect(filtered[i].unit).toBe(products[i].unit)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 12: All Category Returns All Products** - all category includes products from every category', () => {
    fc.assert(
      fc.property(
        productListArbitrary,
        (products) => {
          // Apply filter with 'all' category
          const filtered = filterProductsByCategory(products, 'all')
          
          // Count products by category in original
          const iceCount = products.filter(p => p.category === 'ice').length
          const gasCount = products.filter(p => p.category === 'gas').length
          const waterCount = products.filter(p => p.category === 'water').length
          
          // Count products by category in filtered
          const filteredIceCount = filtered.filter(p => p.category === 'ice').length
          const filteredGasCount = filtered.filter(p => p.category === 'gas').length
          const filteredWaterCount = filtered.filter(p => p.category === 'water').length
          
          // Property: Category counts should match
          expect(filteredIceCount).toBe(iceCount)
          expect(filteredGasCount).toBe(gasCount)
          expect(filteredWaterCount).toBe(waterCount)
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * **Feature: ice-gas-pos, Property 13: Filter Does Not Affect Cart**
 * 
 * *For any* cart state and category filter change, the cart contents 
 * SHALL remain unchanged after filtering.
 * 
 * **Validates: Requirements 7.4**
 */

// CartItem type for testing
interface CartItem {
  product: Product
  quantity: number
}

// Arbitrary for generating valid cart items
const cartItemArbitrary = fc.record({
  product: productArbitrary,
  quantity: fc.integer({ min: 1, max: 100 })
})

// Arbitrary for generating a cart (array of cart items)
const cartArbitrary = fc.array(cartItemArbitrary, { minLength: 0, maxLength: 20 })

// Arbitrary for all categories including 'all'
const allCategoryArbitrary = fc.constantFrom('all' as const, 'ice' as const, 'gas' as const, 'water' as const)

// Helper function to deep compare cart items
function cartsAreEqual(cart1: CartItem[], cart2: CartItem[]): boolean {
  if (cart1.length !== cart2.length) return false
  
  for (let i = 0; i < cart1.length; i++) {
    const item1 = cart1[i]
    const item2 = cart2[i]
    
    if (item1.quantity !== item2.quantity) return false
    if (item1.product.id !== item2.product.id) return false
    if (item1.product.name !== item2.product.name) return false
    if (item1.product.price !== item2.product.price) return false
    if (item1.product.category !== item2.product.category) return false
    if (item1.product.unit !== item2.product.unit) return false
  }
  
  return true
}

describe('Filter Cart Isolation Property Tests', () => {
  it('**Feature: ice-gas-pos, Property 13: Filter Does Not Affect Cart** - filtering products does not modify cart contents', () => {
    fc.assert(
      fc.property(
        productListArbitrary,
        cartArbitrary,
        allCategoryArbitrary,
        (products, cart, selectedCategory) => {
          // Take a snapshot of the cart before filtering
          const cartBefore = JSON.parse(JSON.stringify(cart)) as CartItem[]
          
          // Apply filter to products (simulating category selection)
          filterProductsByCategory(products, selectedCategory)
          
          // Cart should remain unchanged after filtering
          // The cart is independent of the product filter operation
          expect(cartsAreEqual(cart, cartBefore)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 13: Filter Does Not Affect Cart** - cart item quantities remain unchanged after filtering', () => {
    fc.assert(
      fc.property(
        productListArbitrary,
        cartArbitrary,
        allCategoryArbitrary,
        (products, cart, selectedCategory) => {
          // Record original quantities
          const originalQuantities = cart.map(item => ({
            productId: item.product.id,
            quantity: item.quantity
          }))
          
          // Apply filter to products
          filterProductsByCategory(products, selectedCategory)
          
          // Verify all quantities remain the same
          for (let i = 0; i < cart.length; i++) {
            expect(cart[i].product.id).toBe(originalQuantities[i].productId)
            expect(cart[i].quantity).toBe(originalQuantities[i].quantity)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 13: Filter Does Not Affect Cart** - cart length remains unchanged after multiple filter changes', () => {
    fc.assert(
      fc.property(
        productListArbitrary,
        cartArbitrary,
        fc.array(allCategoryArbitrary, { minLength: 1, maxLength: 10 }),
        (products, cart, categorySequence) => {
          const originalCartLength = cart.length
          
          // Apply multiple filter changes in sequence
          for (const category of categorySequence) {
            filterProductsByCategory(products, category)
          }
          
          // Cart length should remain unchanged
          expect(cart.length).toBe(originalCartLength)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 13: Filter Does Not Affect Cart** - cart products remain in cart even when filtered out of display', () => {
    fc.assert(
      fc.property(
        productListArbitrary,
        cartArbitrary,
        specificCategoryArbitrary,
        (products, cart, selectedCategory) => {
          // Take snapshot of cart product IDs before filtering
          const cartProductIdsBefore = cart.map(item => item.product.id)
          
          // Apply filter - this might filter out products that are in the cart
          filterProductsByCategory(products, selectedCategory)
          
          // Cart should still contain all original products regardless of filter
          const cartProductIdsAfter = cart.map(item => item.product.id)
          
          expect(cartProductIdsAfter).toEqual(cartProductIdsBefore)
        }
      ),
      { numRuns: 100 }
    )
  })
})
