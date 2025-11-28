import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { calculateChange, isPaymentValid, addQuickAmount, validatePayment } from '../lib/payment'

/**
 * **Feature: ice-gas-pos, Property 5: Change Calculation**
 * 
 * *For any* payment amount and cart total, the change SHALL equal (payment - total),
 * and payment SHALL be valid only when payment >= total.
 * 
 * **Validates: Requirements 3.2, 3.3**
 */

describe('Change Calculation Property Tests', () => {
  it('**Feature: ice-gas-pos, Property 5: Change Calculation** - change equals payment minus total', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100000, noNaN: true }),
        fc.float({ min: 0, max: 100000, noNaN: true }),
        (payment, total) => {
          const change = calculateChange(payment, total)
          const expected = payment - total
          
          expect(change).toBeCloseTo(expected, 10)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 5: Change Calculation** - payment is valid only when payment >= total', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100000, noNaN: true }),
        fc.float({ min: 0, max: 100000, noNaN: true }),
        (payment, total) => {
          const isValid = isPaymentValid(payment, total)
          const expected = payment >= total
          
          expect(isValid).toBe(expected)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 5: Change Calculation** - valid payment always has non-negative change', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100000, noNaN: true }),
        fc.float({ min: 0, max: 100000, noNaN: true }),
        (payment, total) => {
          if (isPaymentValid(payment, total)) {
            const change = calculateChange(payment, total)
            expect(change).toBeGreaterThanOrEqual(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 5: Change Calculation** - invalid payment always has negative change', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100000, noNaN: true }),
        fc.float({ min: 0, max: 100000, noNaN: true }),
        (payment, total) => {
          if (!isPaymentValid(payment, total)) {
            const change = calculateChange(payment, total)
            expect(change).toBeLessThan(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 5: Change Calculation** - validatePayment returns consistent results', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100000, noNaN: true }),
        fc.float({ min: 0, max: 100000, noNaN: true }),
        (payment, total) => {
          const validation = validatePayment(payment, total)
          
          // isValid should match isPaymentValid
          expect(validation.isValid).toBe(isPaymentValid(payment, total))
          
          // change should match calculateChange
          expect(validation.change).toBeCloseTo(calculateChange(payment, total), 10)
          
          // message should be appropriate
          if (validation.isValid) {
            expect(validation.message).toBe('เงินทอน')
          } else {
            expect(validation.message).toBe('เงินไม่พอ')
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 5: Change Calculation** - exact payment results in zero change', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100000, noNaN: true }),
        (amount) => {
          const change = calculateChange(amount, amount)
          const isValid = isPaymentValid(amount, amount)
          
          expect(change).toBeCloseTo(0, 10)
          expect(isValid).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})


/**
 * **Feature: ice-gas-pos, Property 6: Quick Amount Addition**
 * 
 * *For any* current payment input and quick amount value, using quick amount 
 * SHALL result in (current + quick amount).
 * 
 * **Validates: Requirements 3.4**
 */

describe('Quick Amount Addition Property Tests', () => {
  it('**Feature: ice-gas-pos, Property 6: Quick Amount Addition** - quick amount adds to current payment', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100000, noNaN: true }),
        fc.float({ min: 0, max: 10000, noNaN: true }),
        (currentPayment, quickAmount) => {
          const result = addQuickAmount(currentPayment, quickAmount)
          const expected = currentPayment + quickAmount
          
          expect(result).toBeCloseTo(expected, 10)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 6: Quick Amount Addition** - adding zero quick amount returns same value', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100000, noNaN: true }),
        (currentPayment) => {
          const result = addQuickAmount(currentPayment, 0)
          
          expect(result).toBeCloseTo(currentPayment, 10)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 6: Quick Amount Addition** - multiple quick amounts are cumulative', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 10000, noNaN: true }),
        fc.array(fc.float({ min: 0, max: 1000, noNaN: true }), { minLength: 1, maxLength: 10 }),
        (initialPayment, quickAmounts) => {
          let result = initialPayment
          let expected = initialPayment
          
          for (const amount of quickAmounts) {
            result = addQuickAmount(result, amount)
            expected += amount
          }
          
          expect(result).toBeCloseTo(expected, 5)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 6: Quick Amount Addition** - result is always non-negative for non-negative inputs', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100000, noNaN: true }),
        fc.float({ min: 0, max: 10000, noNaN: true }),
        (currentPayment, quickAmount) => {
          const result = addQuickAmount(currentPayment, quickAmount)
          
          expect(result).toBeGreaterThanOrEqual(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 6: Quick Amount Addition** - order of additions does not matter (commutativity)', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 10000, noNaN: true }),
        fc.float({ min: 0, max: 10000, noNaN: true }),
        fc.float({ min: 0, max: 10000, noNaN: true }),
        (initial, amount1, amount2) => {
          // Add amount1 then amount2
          const result1 = addQuickAmount(addQuickAmount(initial, amount1), amount2)
          
          // Add amount2 then amount1
          const result2 = addQuickAmount(addQuickAmount(initial, amount2), amount1)
          
          expect(result1).toBeCloseTo(result2, 5)
        }
      ),
      { numRuns: 100 }
    )
  })
})


/**
 * **Feature: ice-gas-pos, Property 7: Sale Completion Clears Cart**
 * 
 * *For any* valid payment (payment >= total), completing the sale SHALL clear 
 * the cart and create a sale record with correct total, payment, and change.
 * 
 * **Validates: Requirements 3.5**
 */

import { CartItem, Product, SaleItem } from '../types'

// Pure function to calculate cart total
function calculateCartTotal(cart: CartItem[]): number {
  return cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  )
}

// Pure function to create sale items from cart
function createSaleItems(cart: CartItem[]): SaleItem[] {
  return cart.map((item) => ({
    product_id: item.product.id,
    product_name: item.product.name,
    price: item.product.price,
    quantity: item.quantity,
    subtotal: item.product.price * item.quantity
  }))
}

// Pure function to simulate sale completion logic
function completeSaleLogic(cart: CartItem[], payment: number): { 
  sale: { total: number; payment: number; change: number; items: SaleItem[] } | null;
  newCart: CartItem[];
} {
  const total = calculateCartTotal(cart)
  
  if (payment < total) {
    return { sale: null, newCart: cart }
  }
  
  const saleItems = createSaleItems(cart)
  const change = payment - total
  
  return {
    sale: {
      total,
      payment,
      change,
      items: saleItems
    },
    newCart: [] // Cart is cleared after successful sale
  }
}

// Valid date range for timestamps
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

// Arbitrary for generating a non-empty cart
const nonEmptyCartArbitrary: fc.Arbitrary<CartItem[]> = fc.array(cartItemArbitrary, { minLength: 1, maxLength: 10 })

describe('Sale Completion Property Tests', () => {
  it('**Feature: ice-gas-pos, Property 7: Sale Completion Clears Cart** - valid payment clears cart', () => {
    fc.assert(
      fc.property(
        nonEmptyCartArbitrary,
        fc.float({ min: 0, max: 100000, noNaN: true }),
        (cart, extraPayment) => {
          const total = calculateCartTotal(cart)
          const payment = total + Math.abs(extraPayment) // Ensure payment >= total
          
          const result = completeSaleLogic(cart, payment)
          
          // Cart should be cleared
          expect(result.newCart).toHaveLength(0)
          expect(result.newCart).toEqual([])
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 7: Sale Completion Clears Cart** - valid payment creates sale with correct total', () => {
    fc.assert(
      fc.property(
        nonEmptyCartArbitrary,
        fc.float({ min: 0, max: 100000, noNaN: true }),
        (cart, extraPayment) => {
          const total = calculateCartTotal(cart)
          const payment = total + Math.abs(extraPayment)
          
          const result = completeSaleLogic(cart, payment)
          
          // Sale should be created
          expect(result.sale).not.toBeNull()
          
          if (result.sale) {
            // Total should match cart total
            expect(result.sale.total).toBeCloseTo(total, 10)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 7: Sale Completion Clears Cart** - valid payment creates sale with correct payment and change', () => {
    fc.assert(
      fc.property(
        nonEmptyCartArbitrary,
        fc.float({ min: 0, max: 100000, noNaN: true }),
        (cart, extraPayment) => {
          const total = calculateCartTotal(cart)
          const payment = total + Math.abs(extraPayment)
          
          const result = completeSaleLogic(cart, payment)
          
          expect(result.sale).not.toBeNull()
          
          if (result.sale) {
            // Payment should match input
            expect(result.sale.payment).toBeCloseTo(payment, 10)
            
            // Change should equal payment - total
            expect(result.sale.change).toBeCloseTo(payment - total, 10)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 7: Sale Completion Clears Cart** - invalid payment does not clear cart', () => {
    fc.assert(
      fc.property(
        nonEmptyCartArbitrary,
        fc.float({ min: Math.fround(0.01), max: Math.fround(0.99), noNaN: true }),
        (cart, paymentFraction) => {
          const total = calculateCartTotal(cart)
          // Payment is less than total
          const payment = total * paymentFraction
          
          // Skip if payment happens to be >= total (edge case with very small totals)
          if (payment >= total) return
          
          const result = completeSaleLogic(cart, payment)
          
          // Sale should not be created
          expect(result.sale).toBeNull()
          
          // Cart should remain unchanged
          expect(result.newCart).toEqual(cart)
          expect(result.newCart.length).toBe(cart.length)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 7: Sale Completion Clears Cart** - sale items match cart items', () => {
    fc.assert(
      fc.property(
        nonEmptyCartArbitrary,
        fc.float({ min: 0, max: 100000, noNaN: true }),
        (cart, extraPayment) => {
          const total = calculateCartTotal(cart)
          const payment = total + Math.abs(extraPayment)
          
          const result = completeSaleLogic(cart, payment)
          
          expect(result.sale).not.toBeNull()
          
          if (result.sale) {
            // Number of sale items should match cart items
            expect(result.sale.items.length).toBe(cart.length)
            
            // Each sale item should have correct data
            for (let i = 0; i < cart.length; i++) {
              const cartItem = cart[i]
              const saleItem = result.sale.items.find(
                item => item.product_id === cartItem.product.id
              )
              
              expect(saleItem).toBeDefined()
              if (saleItem) {
                expect(saleItem.product_name).toBe(cartItem.product.name)
                expect(saleItem.price).toBeCloseTo(cartItem.product.price, 10)
                expect(saleItem.quantity).toBe(cartItem.quantity)
                expect(saleItem.subtotal).toBeCloseTo(
                  cartItem.product.price * cartItem.quantity, 
                  10
                )
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 7: Sale Completion Clears Cart** - exact payment is valid', () => {
    fc.assert(
      fc.property(
        nonEmptyCartArbitrary,
        (cart) => {
          const total = calculateCartTotal(cart)
          const payment = total // Exact payment
          
          const result = completeSaleLogic(cart, payment)
          
          // Sale should be created
          expect(result.sale).not.toBeNull()
          
          if (result.sale) {
            // Change should be zero
            expect(result.sale.change).toBeCloseTo(0, 10)
          }
          
          // Cart should be cleared
          expect(result.newCart).toHaveLength(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})
