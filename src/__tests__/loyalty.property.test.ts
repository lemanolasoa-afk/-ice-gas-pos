import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { Customer } from '../types'
import { LoyaltySystem, POINTS_PER_BAHT, BAHT_PER_POINT } from '../lib/loyaltySystem'

/**
 * **Feature: ice-gas-pos, Property 18: Customer Points Calculation**
 * 
 * Tests for the loyalty system:
 * - Points earned = floor(total)
 * - Points used = discount
 * - Customer balance updates correctly
 * 
 * **Validates: Requirements 10.2, 10.3**
 */

// Valid date range for timestamps
const validDateArbitrary = fc.integer({ 
  min: new Date('2020-01-01').getTime(), 
  max: new Date('2030-12-31').getTime() 
}).map(timestamp => new Date(timestamp).toISOString())

// Arbitrary for generating valid customer
const customerArbitrary: fc.Arbitrary<Customer> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  phone: fc.option(fc.stringMatching(/^0[0-9]{9}$/), { nil: null }),
  points: fc.integer({ min: 0, max: 100000 }),
  total_spent: fc.float({ min: Math.fround(0), max: Math.fround(1000000), noNaN: true }),
  visit_count: fc.integer({ min: 0, max: 10000 }),
  created_at: fc.option(validDateArbitrary, { nil: undefined }),
  updated_at: fc.option(validDateArbitrary, { nil: undefined })
})

// Arbitrary for generating valid purchase amounts (positive numbers)
const purchaseAmountArbitrary = fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true })

// Arbitrary for generating valid points to use
const pointsArbitrary = fc.integer({ min: 0, max: 100000 })

describe('Loyalty System - Points Earned Calculation', () => {
  it('**Feature: ice-gas-pos, Property 18: Customer Points Calculation** - points earned equals floor of total amount', () => {
    fc.assert(
      fc.property(purchaseAmountArbitrary, (totalAmount) => {
        const pointsEarned = LoyaltySystem.calculatePointsEarned(totalAmount)
        const expectedPoints = Math.floor(totalAmount * POINTS_PER_BAHT)
        
        expect(pointsEarned).toBe(expectedPoints)
      }),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 18: Customer Points Calculation** - zero or negative amount earns zero points', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(-1000), max: Math.fround(0), noNaN: true }),
        (amount) => {
          const pointsEarned = LoyaltySystem.calculatePointsEarned(amount)
          expect(pointsEarned).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 18: Customer Points Calculation** - points earned is always non-negative', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(-1000), max: Math.fround(100000), noNaN: true }),
        (amount) => {
          const pointsEarned = LoyaltySystem.calculatePointsEarned(amount)
          expect(pointsEarned).toBeGreaterThanOrEqual(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 18: Customer Points Calculation** - points earned is always an integer', () => {
    fc.assert(
      fc.property(purchaseAmountArbitrary, (totalAmount) => {
        const pointsEarned = LoyaltySystem.calculatePointsEarned(totalAmount)
        expect(Number.isInteger(pointsEarned)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })
})

describe('Loyalty System - Points Discount Calculation', () => {
  it('**Feature: ice-gas-pos, Property 18: Customer Points Calculation** - points discount equals points times conversion rate', () => {
    fc.assert(
      fc.property(pointsArbitrary, (pointsToUse) => {
        const discount = LoyaltySystem.calculatePointsDiscount(pointsToUse)
        const expectedDiscount = pointsToUse * BAHT_PER_POINT
        
        expect(discount).toBe(expectedDiscount)
      }),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 18: Customer Points Calculation** - zero or negative points gives zero discount', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: 0 }),
        (points) => {
          const discount = LoyaltySystem.calculatePointsDiscount(points)
          expect(discount).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 18: Customer Points Calculation** - discount is always non-negative', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: 100000 }),
        (points) => {
          const discount = LoyaltySystem.calculatePointsDiscount(points)
          expect(discount).toBeGreaterThanOrEqual(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Loyalty System - Points Usage Validation', () => {
  it('**Feature: ice-gas-pos, Property 18: Customer Points Calculation** - valid points usage within customer balance and purchase total', () => {
    fc.assert(
      fc.property(
        customerArbitrary,
        purchaseAmountArbitrary,
        (customer, purchaseTotal) => {
          // Use points within valid range
          const maxValidPoints = Math.min(customer.points, Math.floor(purchaseTotal))
          if (maxValidPoints <= 0) return true // Skip if no valid points to use
          
          const pointsToUse = Math.floor(Math.random() * maxValidPoints)
          const result = LoyaltySystem.validatePointsUsage(customer, pointsToUse, purchaseTotal)
          
          expect(result.isValid).toBe(true)
          expect(result.error).toBeUndefined()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 18: Customer Points Calculation** - points exceeding customer balance is invalid', () => {
    fc.assert(
      fc.property(
        customerArbitrary,
        purchaseAmountArbitrary,
        fc.integer({ min: 1, max: 1000 }),
        (customer, purchaseTotal, extraPoints) => {
          const pointsToUse = customer.points + extraPoints
          const result = LoyaltySystem.validatePointsUsage(customer, pointsToUse, purchaseTotal)
          
          expect(result.isValid).toBe(false)
          expect(result.error).toBeDefined()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 18: Customer Points Calculation** - points exceeding purchase total is invalid', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 100000 }), // Customer with many points
        fc.float({ min: Math.fround(1), max: Math.fround(100), noNaN: true }), // Small purchase
        (customerPoints, purchaseTotal) => {
          const customer: Customer = {
            id: 'test-id',
            name: 'Test Customer',
            points: customerPoints,
            total_spent: 0,
            visit_count: 0
          }
          
          // Try to use more points than purchase total
          const pointsToUse = Math.floor(purchaseTotal) + 10
          
          // Only test if customer has enough points
          if (pointsToUse <= customer.points) {
            const result = LoyaltySystem.validatePointsUsage(customer, pointsToUse, purchaseTotal)
            expect(result.isValid).toBe(false)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 18: Customer Points Calculation** - negative points is invalid', () => {
    fc.assert(
      fc.property(
        customerArbitrary,
        purchaseAmountArbitrary,
        fc.integer({ min: -1000, max: -1 }),
        (customer, purchaseTotal, negativePoints) => {
          const result = LoyaltySystem.validatePointsUsage(customer, negativePoints, purchaseTotal)
          
          expect(result.isValid).toBe(false)
          expect(result.error).toBeDefined()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 18: Customer Points Calculation** - no customer with points usage is invalid', () => {
    fc.assert(
      fc.property(
        purchaseAmountArbitrary,
        fc.integer({ min: 1, max: 1000 }),
        (purchaseTotal, pointsToUse) => {
          const result = LoyaltySystem.validatePointsUsage(null, pointsToUse, purchaseTotal)
          
          expect(result.isValid).toBe(false)
          expect(result.maxPoints).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 18: Customer Points Calculation** - zero points is always valid', () => {
    fc.assert(
      fc.property(
        fc.option(customerArbitrary, { nil: null }),
        purchaseAmountArbitrary,
        (customer, purchaseTotal) => {
          const result = LoyaltySystem.validatePointsUsage(customer, 0, purchaseTotal)
          expect(result.isValid).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 18: Customer Points Calculation** - maxPoints is min of customer balance and purchase total', () => {
    fc.assert(
      fc.property(
        customerArbitrary,
        purchaseAmountArbitrary,
        (customer, purchaseTotal) => {
          const result = LoyaltySystem.validatePointsUsage(customer, 0, purchaseTotal)
          const expectedMax = Math.min(customer.points, Math.floor(purchaseTotal))
          
          expect(result.maxPoints).toBe(expectedMax)
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Loyalty System - Balance Calculation', () => {
  it('**Feature: ice-gas-pos, Property 18: Customer Points Calculation** - new balance equals current - used + earned', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }), // current points
        fc.integer({ min: 0, max: 10000 }),  // points used
        fc.integer({ min: 0, max: 10000 }),  // points earned
        (currentPoints, pointsUsed, pointsEarned) => {
          const newBalance = LoyaltySystem.calculateNewBalance(currentPoints, pointsUsed, pointsEarned)
          const expectedBalance = Math.max(0, currentPoints - pointsUsed + pointsEarned)
          
          expect(newBalance).toBe(expectedBalance)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 18: Customer Points Calculation** - balance is never negative', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),
        fc.integer({ min: 0, max: 100000 }),
        fc.integer({ min: 0, max: 100000 }),
        (currentPoints, pointsUsed, pointsEarned) => {
          const newBalance = LoyaltySystem.calculateNewBalance(currentPoints, pointsUsed, pointsEarned)
          expect(newBalance).toBeGreaterThanOrEqual(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 18: Customer Points Calculation** - using zero points and earning zero points preserves balance', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),
        (currentPoints) => {
          const newBalance = LoyaltySystem.calculateNewBalance(currentPoints, 0, 0)
          expect(newBalance).toBe(currentPoints)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 18: Customer Points Calculation** - earning points increases balance', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),
        fc.integer({ min: 1, max: 10000 }),
        (currentPoints, pointsEarned) => {
          const newBalance = LoyaltySystem.calculateNewBalance(currentPoints, 0, pointsEarned)
          expect(newBalance).toBe(currentPoints + pointsEarned)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 18: Customer Points Calculation** - using points decreases balance (but not below zero)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),
        fc.integer({ min: 1, max: 10000 }),
        (currentPoints, pointsUsed) => {
          const newBalance = LoyaltySystem.calculateNewBalance(currentPoints, pointsUsed, 0)
          const expectedBalance = Math.max(0, currentPoints - pointsUsed)
          expect(newBalance).toBe(expectedBalance)
        }
      ),
      { numRuns: 100 }
    )
  })
})
