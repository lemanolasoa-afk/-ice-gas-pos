import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { Discount, CartItem, Product } from '../types'
import { DiscountEngine } from '../lib/discountEngine'

/**
 * **Feature: ice-gas-pos, Property 19: Discount Validation**
 * 
 * Tests for the discount system:
 * - Percent discount calculation
 * - Fixed discount calculation
 * - Buy X get Y calculation
 * - Validation rules
 * 
 * **Validates: Requirements 11.5**
 */

// Arbitrary for generating valid product
const productArbitrary: fc.Arbitrary<Product> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  price: fc.integer({ min: 1, max: 10000 }),
  category: fc.constantFrom('ice', 'gas', 'water') as fc.Arbitrary<'ice' | 'gas' | 'water'>,
  unit: fc.string({ minLength: 1, maxLength: 10 }),
  stock: fc.integer({ min: 0, max: 1000 }),
  low_stock_threshold: fc.integer({ min: 1, max: 100 }),
})

// Arbitrary for generating cart items
const cartItemArbitrary: fc.Arbitrary<CartItem> = fc.record({
  product: productArbitrary,
  quantity: fc.integer({ min: 1, max: 100 }),
})

// Arbitrary for generating percent discount
const percentDiscountArbitrary: fc.Arbitrary<Discount> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  type: fc.constant('percent') as fc.Arbitrary<'percent'>,
  value: fc.integer({ min: 1, max: 100 }),
  min_purchase: fc.integer({ min: 0, max: 1000 }),
  is_active: fc.constant(true),
})


// Arbitrary for generating fixed discount
const fixedDiscountArbitrary: fc.Arbitrary<Discount> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  type: fc.constant('fixed') as fc.Arbitrary<'fixed'>,
  value: fc.integer({ min: 1, max: 1000 }),
  min_purchase: fc.integer({ min: 0, max: 1000 }),
  is_active: fc.constant(true),
})

// Arbitrary for generating buy_x_get_y discount
const buyXGetYDiscountArbitrary: fc.Arbitrary<Discount> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  type: fc.constant('buy_x_get_y') as fc.Arbitrary<'buy_x_get_y'>,
  value: fc.constant(0),
  min_purchase: fc.constant(0),
  buy_quantity: fc.integer({ min: 1, max: 10 }),
  get_quantity: fc.integer({ min: 1, max: 5 }),
  is_active: fc.constant(true),
})

// Arbitrary for cart total
const cartTotalArbitrary = fc.integer({ min: 1, max: 100000 })

describe('Discount Engine - Percent Discount Calculation', () => {
  it('**Feature: ice-gas-pos, Property 19: Discount Validation** - percent discount equals floor of (total * percent / 100)', () => {
    fc.assert(
      fc.property(
        percentDiscountArbitrary,
        cartTotalArbitrary,
        (discount, cartTotal) => {
          const result = DiscountEngine.calculatePercentDiscount(discount, cartTotal)
          const expectedDiscount = Math.floor(cartTotal * (discount.value / 100))
          
          expect(result.discountAmount).toBe(expectedDiscount)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 19: Discount Validation** - percent discount is always non-negative', () => {
    fc.assert(
      fc.property(
        percentDiscountArbitrary,
        cartTotalArbitrary,
        (discount, cartTotal) => {
          const result = DiscountEngine.calculatePercentDiscount(discount, cartTotal)
          expect(result.discountAmount).toBeGreaterThanOrEqual(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 19: Discount Validation** - percent discount never exceeds cart total', () => {
    fc.assert(
      fc.property(
        percentDiscountArbitrary,
        cartTotalArbitrary,
        (discount, cartTotal) => {
          const result = DiscountEngine.calculatePercentDiscount(discount, cartTotal)
          expect(result.discountAmount).toBeLessThanOrEqual(cartTotal)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 19: Discount Validation** - 100% discount equals cart total', () => {
    fc.assert(
      fc.property(cartTotalArbitrary, (cartTotal) => {
        const discount: Discount = {
          id: 'test',
          name: 'Full Discount',
          type: 'percent',
          value: 100,
          min_purchase: 0,
          is_active: true,
        }
        const result = DiscountEngine.calculatePercentDiscount(discount, cartTotal)
        expect(result.discountAmount).toBe(cartTotal)
      }),
      { numRuns: 100 }
    )
  })
})


describe('Discount Engine - Fixed Discount Calculation', () => {
  it('**Feature: ice-gas-pos, Property 19: Discount Validation** - fixed discount equals min of value and cart total', () => {
    fc.assert(
      fc.property(
        fixedDiscountArbitrary,
        cartTotalArbitrary,
        (discount, cartTotal) => {
          const result = DiscountEngine.calculateFixedDiscount(discount, cartTotal)
          const expectedDiscount = Math.floor(Math.min(discount.value, cartTotal))
          
          expect(result.discountAmount).toBe(expectedDiscount)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 19: Discount Validation** - fixed discount never exceeds cart total', () => {
    fc.assert(
      fc.property(
        fixedDiscountArbitrary,
        cartTotalArbitrary,
        (discount, cartTotal) => {
          const result = DiscountEngine.calculateFixedDiscount(discount, cartTotal)
          expect(result.discountAmount).toBeLessThanOrEqual(cartTotal)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 19: Discount Validation** - fixed discount is always non-negative', () => {
    fc.assert(
      fc.property(
        fixedDiscountArbitrary,
        cartTotalArbitrary,
        (discount, cartTotal) => {
          const result = DiscountEngine.calculateFixedDiscount(discount, cartTotal)
          expect(result.discountAmount).toBeGreaterThanOrEqual(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Discount Engine - Buy X Get Y Calculation', () => {
  it('**Feature: ice-gas-pos, Property 19: Discount Validation** - buy X get Y gives correct free items', () => {
    fc.assert(
      fc.property(
        buyXGetYDiscountArbitrary,
        fc.array(cartItemArbitrary, { minLength: 1, maxLength: 5 }),
        (discount, cart) => {
          const result = DiscountEngine.calculateBuyXGetY(discount, cart)
          const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0)
          const buyQty = discount.buy_quantity || 0
          const getQty = discount.get_quantity || 0
          const setSize = buyQty + getQty
          const expectedFreeItems = Math.floor(totalQty / setSize) * getQty
          
          expect(result.freeItems).toBe(expectedFreeItems)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 19: Discount Validation** - buy X get Y discount is non-negative', () => {
    fc.assert(
      fc.property(
        buyXGetYDiscountArbitrary,
        fc.array(cartItemArbitrary, { minLength: 1, maxLength: 5 }),
        (discount, cart) => {
          const result = DiscountEngine.calculateBuyXGetY(discount, cart)
          expect(result.discountAmount).toBeGreaterThanOrEqual(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 19: Discount Validation** - buy X get Y with insufficient quantity gives zero discount', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 10 }), // buy quantity
        fc.integer({ min: 1, max: 3 }),  // get quantity
        fc.integer({ min: 1, max: 4 }),  // cart quantity (less than buy)
        productArbitrary,
        (buyQty, getQty, cartQty, product) => {
          const discount: Discount = {
            id: 'test',
            name: 'Test',
            type: 'buy_x_get_y',
            value: 0,
            min_purchase: 0,
            buy_quantity: buyQty,
            get_quantity: getQty,
            is_active: true,
          }
          const cart: CartItem[] = [{ product, quantity: cartQty }]
          const result = DiscountEngine.calculateBuyXGetY(discount, cart)
          
          // If cart quantity < buy quantity, no free items
          if (cartQty < buyQty) {
            expect(result.freeItems).toBe(0)
            expect(result.discountAmount).toBe(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})


describe('Discount Engine - Validation Rules', () => {
  it('**Feature: ice-gas-pos, Property 19: Discount Validation** - inactive discount is invalid', () => {
    fc.assert(
      fc.property(
        percentDiscountArbitrary,
        cartTotalArbitrary,
        (discount, cartTotal) => {
          const inactiveDiscount = { ...discount, is_active: false }
          const result = DiscountEngine.validateDiscount(inactiveDiscount, cartTotal, [])
          
          expect(result.isValid).toBe(false)
          expect(result.error).toBeDefined()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 19: Discount Validation** - cart below min_purchase is invalid', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1000 }), // min_purchase
        fc.integer({ min: 1, max: 99 }),     // cart total (below min)
        (minPurchase, cartTotal) => {
          const discount: Discount = {
            id: 'test',
            name: 'Test',
            type: 'percent',
            value: 10,
            min_purchase: minPurchase,
            is_active: true,
          }
          const result = DiscountEngine.validateDiscount(discount, cartTotal, [])
          
          expect(result.isValid).toBe(false)
          expect(result.error).toContain('ขั้นต่ำ')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 19: Discount Validation** - cart at or above min_purchase is valid', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1000 }), // min_purchase
        fc.integer({ min: 0, max: 1000 }),   // extra amount
        (minPurchase, extra) => {
          const cartTotal = minPurchase + extra
          const discount: Discount = {
            id: 'test',
            name: 'Test',
            type: 'percent',
            value: 10,
            min_purchase: minPurchase,
            is_active: true,
          }
          const result = DiscountEngine.validateDiscount(discount, cartTotal, [])
          
          expect(result.isValid).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 19: Discount Validation** - null discount is invalid', () => {
    fc.assert(
      fc.property(cartTotalArbitrary, (cartTotal) => {
        const result = DiscountEngine.validateDiscount(null, cartTotal, [])
        
        expect(result.isValid).toBe(false)
        expect(result.discountAmount).toBe(0)
      }),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 19: Discount Validation** - expired discount is invalid', () => {
    fc.assert(
      fc.property(
        percentDiscountArbitrary,
        cartTotalArbitrary,
        (discount, cartTotal) => {
          const expiredDiscount = { 
            ...discount, 
            end_date: new Date('2020-01-01').toISOString() 
          }
          const result = DiscountEngine.validateDiscount(expiredDiscount, cartTotal, [])
          
          expect(result.isValid).toBe(false)
          expect(result.error).toContain('หมดอายุ')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 19: Discount Validation** - future discount is invalid', () => {
    fc.assert(
      fc.property(
        percentDiscountArbitrary,
        cartTotalArbitrary,
        (discount, cartTotal) => {
          const futureDiscount = { 
            ...discount, 
            start_date: new Date('2030-01-01').toISOString() 
          }
          const result = DiscountEngine.validateDiscount(futureDiscount, cartTotal, [])
          
          expect(result.isValid).toBe(false)
          expect(result.error).toContain('ยังไม่เริ่ม')
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Discount Engine - Active Discounts Filter', () => {
  it('**Feature: ice-gas-pos, Property 19: Discount Validation** - getActiveDiscounts returns only active discounts', () => {
    fc.assert(
      fc.property(
        fc.array(percentDiscountArbitrary, { minLength: 0, maxLength: 10 }),
        (discounts) => {
          // Mix active and inactive
          const mixedDiscounts = discounts.map((d, i) => ({
            ...d,
            is_active: i % 2 === 0
          }))
          
          const activeDiscounts = DiscountEngine.getActiveDiscounts(mixedDiscounts)
          
          // All returned discounts should be active
          activeDiscounts.forEach(d => {
            expect(d.is_active).toBe(true)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 19: Discount Validation** - getActiveDiscounts excludes expired discounts', () => {
    fc.assert(
      fc.property(
        fc.array(percentDiscountArbitrary, { minLength: 1, maxLength: 5 }),
        (discounts) => {
          // Make all discounts expired
          const expiredDiscounts = discounts.map(d => ({
            ...d,
            end_date: new Date('2020-01-01').toISOString()
          }))
          
          const activeDiscounts = DiscountEngine.getActiveDiscounts(expiredDiscounts)
          
          expect(activeDiscounts.length).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})
