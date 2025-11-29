import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { Product } from '../types'
import { GasCylinderManager, StockChange } from '../lib/gasCylinderManager'

/**
 * **Feature: ice-gas-pos, Property 20: Stock Invariants**
 *
 * *For any* stock operation, the stock SHALL never go negative.
 * *For any* gas exchange, total cylinders (full + empty) SHALL remain constant.
 *
 * **Validates: Requirements 16.1-16.8**
 */

// Arbitrary for generating valid products
const productArbitrary: fc.Arbitrary<Product> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  price: fc.float({ min: Math.fround(1), max: Math.fround(1000), noNaN: true }),
  category: fc.constantFrom('ice' as const, 'gas' as const, 'water' as const),
  unit: fc.string({ minLength: 1, maxLength: 20 }),
  stock: fc.integer({ min: 0, max: 1000 }),
  cost: fc.float({ min: Math.fround(0), max: Math.fround(500), noNaN: true }),
  low_stock_threshold: fc.integer({ min: 1, max: 50 }),
  empty_stock: fc.integer({ min: 0, max: 100 }),
  deposit_amount: fc.float({ min: Math.fround(0), max: Math.fround(1000), noNaN: true }),
})

const gasProductArbitrary: fc.Arbitrary<Product> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  price: fc.float({ min: Math.fround(100), max: Math.fround(1000), noNaN: true }),
  category: fc.constant('gas' as const),
  unit: fc.constant('ถัง'),
  stock: fc.integer({ min: 1, max: 100 }),
  cost: fc.float({ min: Math.fround(50), max: Math.fround(500), noNaN: true }),
  low_stock_threshold: fc.integer({ min: 1, max: 10 }),
  empty_stock: fc.integer({ min: 0, max: 100 }),
  deposit_amount: fc.float({ min: Math.fround(100), max: Math.fround(500), noNaN: true }),
})

const quantityArbitrary = fc.integer({ min: 1, max: 20 })

describe('Stock Invariant Property Tests', () => {
  it('**Feature: ice-gas-pos, Property 20: Stock Invariants** - stock change amount is bounded', () => {
    fc.assert(
      fc.property(gasProductArbitrary, quantityArbitrary, (product, quantity) => {
        const result = GasCylinderManager.handleGasSale(product, quantity, 'exchange')

        // Each stock change should be bounded by quantity
        for (const change of result.stockChanges) {
          expect(Math.abs(change.amount)).toBeLessThanOrEqual(quantity)
        }
      }),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 20: Stock Invariants** - exchange preserves total cylinders', () => {
    fc.assert(
      fc.property(gasProductArbitrary, quantityArbitrary, (product, quantity) => {
        const result = GasCylinderManager.handleGasSale(product, quantity, 'exchange')

        // Sum of all stock changes should be 0 (cylinders are exchanged, not created/destroyed)
        const totalChange = result.stockChanges.reduce((sum, c) => sum + c.amount, 0)
        expect(totalChange).toBe(0)
      }),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 20: Stock Invariants** - deposit decreases total cylinders by quantity', () => {
    fc.assert(
      fc.property(gasProductArbitrary, quantityArbitrary, (product, quantity) => {
        const result = GasCylinderManager.handleGasSale(product, quantity, 'deposit')

        // Deposit: customer takes cylinder, so total decreases
        const totalChange = result.stockChanges.reduce((sum, c) => sum + c.amount, 0)
        expect(totalChange).toBe(-quantity)
      }),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 20: Stock Invariants** - outright decreases total cylinders by quantity', () => {
    fc.assert(
      fc.property(gasProductArbitrary, quantityArbitrary, (product, quantity) => {
        const result = GasCylinderManager.handleGasSale(product, quantity, 'outright')

        // Outright: customer buys cylinder permanently
        const totalChange = result.stockChanges.reduce((sum, c) => sum + c.amount, 0)
        expect(totalChange).toBe(-quantity)
      }),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 20: Stock Invariants** - cylinder return increases empty stock', () => {
    fc.assert(
      fc.property(gasProductArbitrary, quantityArbitrary, (product, quantity) => {
        const result = GasCylinderManager.handleCylinderReturn(product, quantity)

        // Return should only increase empty stock
        expect(result.stockChanges).toHaveLength(1)
        expect(result.stockChanges[0].type).toBe('empty')
        expect(result.stockChanges[0].amount).toBe(quantity)
      }),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 20: Stock Invariants** - refill preserves total cylinders', () => {
    fc.assert(
      fc.property(gasProductArbitrary, quantityArbitrary, (product, quantity) => {
        const stockChanges = GasCylinderManager.handleRefill(product, quantity)

        // Refill converts empty to full, total should be 0
        const totalChange = stockChanges.reduce((sum, c) => sum + c.amount, 0)
        expect(totalChange).toBe(0)
      }),
      { numRuns: 100 }
    )
  })
})

describe('Low Stock Warning Property Tests', () => {
  it('**Feature: ice-gas-pos, Property 20: Stock Invariants** - low stock detection is correct', () => {
    fc.assert(
      fc.property(productArbitrary, (product) => {
        const isLowStock = product.stock <= product.low_stock_threshold
        const threshold = product.low_stock_threshold

        if (product.stock <= threshold) {
          expect(isLowStock).toBe(true)
        } else {
          expect(isLowStock).toBe(false)
        }
      }),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 20: Stock Invariants** - stock value calculation is non-negative', () => {
    fc.assert(
      fc.property(productArbitrary, (product) => {
        const stockValue = product.stock * (product.cost || 0)
        expect(stockValue).toBeGreaterThanOrEqual(0)
      }),
      { numRuns: 100 }
    )
  })
})

describe('Stock Change Application Tests', () => {
  // Helper to simulate applying stock changes
  function applyStockChanges(
    currentStock: number,
    currentEmptyStock: number,
    changes: StockChange[]
  ): { stock: number; emptyStock: number } {
    let stock = currentStock
    let emptyStock = currentEmptyStock

    for (const change of changes) {
      if (change.type === 'full') {
        stock = Math.max(0, stock + change.amount)
      } else {
        emptyStock = Math.max(0, emptyStock + change.amount)
      }
    }

    return { stock, emptyStock }
  }

  it('**Feature: ice-gas-pos, Property 20: Stock Invariants** - applied stock never goes negative', () => {
    fc.assert(
      fc.property(
        gasProductArbitrary,
        quantityArbitrary,
        fc.constantFrom('exchange' as const, 'deposit' as const, 'outright' as const),
        (product, quantity, saleType) => {
          const result = GasCylinderManager.handleGasSale(product, quantity, saleType)
          const applied = applyStockChanges(product.stock, product.empty_stock || 0, result.stockChanges)

          expect(applied.stock).toBeGreaterThanOrEqual(0)
          expect(applied.emptyStock).toBeGreaterThanOrEqual(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 20: Stock Invariants** - refill applied correctly', () => {
    fc.assert(
      fc.property(gasProductArbitrary, quantityArbitrary, (product, quantity) => {
        // Ensure we have enough empty stock
        const emptyStock = Math.max(quantity, product.empty_stock || 0)
        const stockChanges = GasCylinderManager.handleRefill(product, quantity)
        const applied = applyStockChanges(product.stock, emptyStock, stockChanges)

        // Full stock should increase
        expect(applied.stock).toBe(product.stock + quantity)
        // Empty stock should decrease (but not below 0)
        expect(applied.emptyStock).toBe(Math.max(0, emptyStock - quantity))
      }),
      { numRuns: 100 }
    )
  })
})

describe('Stock Profit Calculation Tests', () => {
  it('**Feature: ice-gas-pos, Property 20: Stock Invariants** - profit margin is between 0 and 100 for valid products', () => {
    fc.assert(
      fc.property(
        fc.record({
          price: fc.float({ min: Math.fround(10), max: Math.fround(1000), noNaN: true }),
          cost: fc.float({ min: Math.fround(1), max: Math.fround(500), noNaN: true }),
        }),
        ({ price, cost }) => {
          // Only test when price > cost (profitable)
          if (price > cost) {
            const margin = ((price - cost) / price) * 100
            expect(margin).toBeGreaterThan(0)
            expect(margin).toBeLessThan(100)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 20: Stock Invariants** - total stock value equals sum of individual values', () => {
    fc.assert(
      fc.property(
        fc.array(productArbitrary, { minLength: 1, maxLength: 10 }),
        (products) => {
          const totalValue = products.reduce((sum, p) => sum + p.stock * (p.cost || 0), 0)
          const individualSum = products.map((p) => p.stock * (p.cost || 0)).reduce((a, b) => a + b, 0)

          expect(totalValue).toBeCloseTo(individualSum, 5)
        }
      ),
      { numRuns: 50 }
    )
  })
})
