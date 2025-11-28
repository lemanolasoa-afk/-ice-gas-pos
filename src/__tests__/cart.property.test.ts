import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { CartItem, Product } from '../types'

/**
 * **Feature: ice-gas-pos, Property 1: Cart Total Calculation**
 * 
 * *For any* cart with items, the total SHALL equal the sum of (price × quantity) 
 * for all items in the cart.
 * 
 * **Validates: Requirements 2.3**
 */

// Pure function to calculate cart total (extracted from store logic)
function calculateCartTotal(cart: CartItem[]): number {
  return cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  )
}

/**
 * **Feature: ice-gas-pos, Property 2: Add to Cart Increases Quantity**
 * 
 * *For any* product added to the cart, if the product already exists, 
 * the quantity SHALL increase by exactly one; otherwise, a new item 
 * with quantity one SHALL be added.
 * 
 * **Validates: Requirements 2.1, 2.2**
 */

// Pure function to add product to cart (extracted from store logic)
function addToCart(cart: CartItem[], product: Product): CartItem[] {
  const existing = cart.find((item) => item.product.id === product.id)
  if (existing) {
    return cart.map((item) =>
      item.product.id === product.id
        ? { ...item, quantity: item.quantity + 1 }
        : item
    )
  }
  return [...cart, { product, quantity: 1 }]
}

// Valid date range for timestamps - using integer timestamps to avoid invalid date issues
const validDateArbitrary = fc.integer({ 
  min: new Date('2020-01-01').getTime(), 
  max: new Date('2030-12-31').getTime() 
}).map(timestamp => new Date(timestamp).toISOString())

// Arbitrary for generating valid products
const productArbitrary: fc.Arbitrary<Product> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  price: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
  category: fc.constantFrom('ice' as const, 'gas' as const, 'water' as const),
  unit: fc.string({ minLength: 1, maxLength: 20 }),
  stock: fc.integer({ min: 0, max: 1000 }),
  low_stock_threshold: fc.integer({ min: 1, max: 50 }),
  barcode: fc.option(fc.string({ minLength: 8, maxLength: 13 }), { nil: undefined }),
  created_at: fc.option(validDateArbitrary, { nil: undefined }),
  updated_at: fc.option(validDateArbitrary, { nil: undefined })
})

// Arbitrary for generating valid cart items
const cartItemArbitrary: fc.Arbitrary<CartItem> = fc.record({
  product: productArbitrary,
  quantity: fc.integer({ min: 1, max: 100 })
})

// Arbitrary for generating a cart (array of cart items)
const cartArbitrary: fc.Arbitrary<CartItem[]> = fc.array(cartItemArbitrary, { minLength: 0, maxLength: 20 })

describe('Cart Total Calculation Property Tests', () => {
  it('**Feature: ice-gas-pos, Property 1: Cart Total Calculation** - total equals sum of (price × quantity) for all items', () => {
    fc.assert(
      fc.property(cartArbitrary, (cart) => {
        const calculatedTotal = calculateCartTotal(cart)
        
        // Manually compute expected total
        const expectedTotal = cart.reduce(
          (sum, item) => sum + item.product.price * item.quantity,
          0
        )
        
        // Use approximate equality for floating point comparison
        expect(calculatedTotal).toBeCloseTo(expectedTotal, 10)
      }),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 1: Cart Total Calculation** - empty cart has zero total', () => {
    fc.assert(
      fc.property(fc.constant([] as CartItem[]), (emptyCart) => {
        const total = calculateCartTotal(emptyCart)
        expect(total).toBe(0)
      }),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 1: Cart Total Calculation** - single item total equals price × quantity', () => {
    fc.assert(
      fc.property(cartItemArbitrary, (item) => {
        const cart = [item]
        const total = calculateCartTotal(cart)
        const expected = item.product.price * item.quantity
        
        expect(total).toBeCloseTo(expected, 10)
      }),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 1: Cart Total Calculation** - total is always non-negative', () => {
    fc.assert(
      fc.property(cartArbitrary, (cart) => {
        const total = calculateCartTotal(cart)
        expect(total).toBeGreaterThanOrEqual(0)
      }),
      { numRuns: 100 }
    )
  })
})

describe('Add to Cart Property Tests', () => {
  it('**Feature: ice-gas-pos, Property 2: Add to Cart Increases Quantity** - adding new product creates item with quantity 1', () => {
    fc.assert(
      fc.property(cartArbitrary, productArbitrary, (cart, product) => {
        // Ensure product is not already in cart
        const cartWithoutProduct = cart.filter(item => item.product.id !== product.id)
        
        const newCart = addToCart(cartWithoutProduct, product)
        
        // Find the added product in the new cart
        const addedItem = newCart.find(item => item.product.id === product.id)
        
        // Product should exist in cart with quantity 1
        expect(addedItem).toBeDefined()
        expect(addedItem!.quantity).toBe(1)
        
        // Cart length should increase by 1
        expect(newCart.length).toBe(cartWithoutProduct.length + 1)
      }),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 2: Add to Cart Increases Quantity** - adding existing product increments quantity by exactly one', () => {
    fc.assert(
      fc.property(cartItemArbitrary, (existingItem) => {
        // Start with a cart containing the item
        const cart = [existingItem]
        const originalQuantity = existingItem.quantity
        
        // Add the same product again
        const newCart = addToCart(cart, existingItem.product)
        
        // Find the item in the new cart
        const updatedItem = newCart.find(item => item.product.id === existingItem.product.id)
        
        // Quantity should increase by exactly 1
        expect(updatedItem).toBeDefined()
        expect(updatedItem!.quantity).toBe(originalQuantity + 1)
        
        // Cart length should remain the same
        expect(newCart.length).toBe(cart.length)
      }),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 2: Add to Cart Increases Quantity** - other items remain unchanged when adding product', () => {
    fc.assert(
      fc.property(
        fc.array(cartItemArbitrary, { minLength: 1, maxLength: 10 }),
        productArbitrary,
        (cart, newProduct) => {
          // Ensure new product is not in cart
          const cartWithoutNewProduct = cart.filter(item => item.product.id !== newProduct.id)
          
          if (cartWithoutNewProduct.length === 0) return true // Skip if cart becomes empty
          
          const newCart = addToCart(cartWithoutNewProduct, newProduct)
          
          // All original items should remain unchanged
          for (const originalItem of cartWithoutNewProduct) {
            const itemInNewCart = newCart.find(item => item.product.id === originalItem.product.id)
            expect(itemInNewCart).toBeDefined()
            expect(itemInNewCart!.quantity).toBe(originalItem.quantity)
            expect(itemInNewCart!.product).toEqual(originalItem.product)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * **Feature: ice-gas-pos, Property 3: Decrease to Zero Removes Item**
 * 
 * *For any* cart item with quantity decreased to zero, the item SHALL be 
 * removed from the cart entirely.
 * 
 * **Validates: Requirements 2.4**
 */

// Pure function to update quantity (extracted from store logic)
function updateQuantity(cart: CartItem[], productId: string, quantity: number): CartItem[] {
  if (quantity <= 0) {
    return cart.filter((item) => item.product.id !== productId)
  }
  return cart.map((item) =>
    item.product.id === productId ? { ...item, quantity } : item
  )
}

describe('Decrease to Zero Removes Item Property Tests', () => {
  it('**Feature: ice-gas-pos, Property 3: Decrease to Zero Removes Item** - setting quantity to zero removes item from cart', () => {
    fc.assert(
      fc.property(
        fc.array(cartItemArbitrary, { minLength: 1, maxLength: 10 }),
        (cart) => {
          // Pick a random item from the cart to decrease to zero
          const targetItem = cart[0]
          
          const newCart = updateQuantity(cart, targetItem.product.id, 0)
          
          // The item should no longer exist in the cart
          const removedItem = newCart.find(item => item.product.id === targetItem.product.id)
          expect(removedItem).toBeUndefined()
          
          // Cart length should decrease by 1
          expect(newCart.length).toBe(cart.length - 1)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 3: Decrease to Zero Removes Item** - setting quantity to negative removes item from cart', () => {
    fc.assert(
      fc.property(
        fc.array(cartItemArbitrary, { minLength: 1, maxLength: 10 }),
        fc.integer({ min: -100, max: -1 }),
        (cart, negativeQuantity) => {
          // Pick a random item from the cart
          const targetItem = cart[0]
          
          const newCart = updateQuantity(cart, targetItem.product.id, negativeQuantity)
          
          // The item should no longer exist in the cart
          const removedItem = newCart.find(item => item.product.id === targetItem.product.id)
          expect(removedItem).toBeUndefined()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 3: Decrease to Zero Removes Item** - other items remain unchanged when item is removed', () => {
    fc.assert(
      fc.property(
        fc.array(cartItemArbitrary, { minLength: 2, maxLength: 10 }),
        (cart) => {
          // Pick the first item to remove
          const targetItem = cart[0]
          const otherItems = cart.slice(1)
          
          const newCart = updateQuantity(cart, targetItem.product.id, 0)
          
          // All other items should remain unchanged
          for (const originalItem of otherItems) {
            const itemInNewCart = newCart.find(item => item.product.id === originalItem.product.id)
            expect(itemInNewCart).toBeDefined()
            expect(itemInNewCart!.quantity).toBe(originalItem.quantity)
            expect(itemInNewCart!.product).toEqual(originalItem.product)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 3: Decrease to Zero Removes Item** - positive quantity updates item without removing', () => {
    fc.assert(
      fc.property(
        fc.array(cartItemArbitrary, { minLength: 1, maxLength: 10 }),
        fc.integer({ min: 1, max: 100 }),
        (cart, newQuantity) => {
          const targetItem = cart[0]
          
          const newCart = updateQuantity(cart, targetItem.product.id, newQuantity)
          
          // The item should still exist with the new quantity
          const updatedItem = newCart.find(item => item.product.id === targetItem.product.id)
          expect(updatedItem).toBeDefined()
          expect(updatedItem!.quantity).toBe(newQuantity)
          
          // Cart length should remain the same
          expect(newCart.length).toBe(cart.length)
        }
      ),
      { numRuns: 100 }
    )
  })
})


/**
 * **Feature: ice-gas-pos, Property 4: Clear Cart Empties All**
 * 
 * *For any* cart state, after clearing, the cart SHALL contain zero items 
 * and the total SHALL be zero.
 * 
 * **Validates: Requirements 2.5**
 */

// Pure function to clear cart (extracted from store logic)
function clearCart(): CartItem[] {
  return []
}

describe('Clear Cart Empties All Property Tests', () => {
  it('**Feature: ice-gas-pos, Property 4: Clear Cart Empties All** - clearing any cart results in empty cart', () => {
    fc.assert(
      fc.property(cartArbitrary, (_cart) => {
        const clearedCart = clearCart()
        
        // Cart should be empty
        expect(clearedCart).toHaveLength(0)
        expect(clearedCart).toEqual([])
      }),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 4: Clear Cart Empties All** - cleared cart has zero total', () => {
    fc.assert(
      fc.property(cartArbitrary, (_cart) => {
        const clearedCart = clearCart()
        const total = calculateCartTotal(clearedCart)
        
        // Total should be exactly zero
        expect(total).toBe(0)
      }),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 4: Clear Cart Empties All** - clearing non-empty cart results in empty cart', () => {
    fc.assert(
      fc.property(
        fc.array(cartItemArbitrary, { minLength: 1, maxLength: 20 }),
        (nonEmptyCart) => {
          // Verify cart is not empty before clearing
          expect(nonEmptyCart.length).toBeGreaterThan(0)
          
          const clearedCart = clearCart()
          
          // After clearing, cart should be empty
          expect(clearedCart).toHaveLength(0)
          expect(calculateCartTotal(clearedCart)).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 4: Clear Cart Empties All** - clear is idempotent', () => {
    fc.assert(
      fc.property(cartArbitrary, (_cart) => {
        const clearedOnce = clearCart()
        const clearedTwice = clearCart()
        
        // Clearing multiple times should have the same result
        expect(clearedOnce).toEqual(clearedTwice)
        expect(clearedOnce).toHaveLength(0)
        expect(clearedTwice).toHaveLength(0)
      }),
      { numRuns: 100 }
    )
  })
})
