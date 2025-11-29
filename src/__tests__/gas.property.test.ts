import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { Product, GasSaleType } from '../types'
import { GasCylinderManager, GasSaleResult, StockChange } from '../lib/gasCylinderManager'

/**
 * **Feature: ice-gas-pos, Property 16: Gas Exchange Stock Changes**
 * 
 * *For any* gas sale with exchange type, the full stock SHALL decrease by quantity 
 * AND empty stock SHALL increase by quantity.
 * 
 * **Validates: Requirements 9.2**
 */

/**
 * **Feature: ice-gas-pos, Property 17: Gas Deposit Calculation**
 * 
 * *For any* gas sale with deposit type, the total SHALL equal 
 * (price + deposit_amount) × quantity.
 * 
 * **Validates: Requirements 9.3**
 */

// Arbitrary for generating valid gas products
const gasProductArbitrary: fc.Arbitrary<Product> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  price: fc.float({ min: Math.fround(100), max: Math.fround(1000), noNaN: true }),
  category: fc.constant('gas' as const),
  unit: fc.constant('ถัง'),
  stock: fc.integer({ min: 1, max: 100 }),
  empty_stock: fc.integer({ min: 0, max: 100 }),
  low_stock_threshold: fc.integer({ min: 1, max: 10 }),
  deposit_amount: fc.float({ min: Math.fround(100), max: Math.fround(500), noNaN: true }),
  barcode: fc.option(fc.string({ minLength: 8, maxLength: 13 }), { nil: undefined }),
})

// Arbitrary for quantity (positive integer)
const quantityArbitrary = fc.integer({ min: 1, max: 20 })

describe('Gas Exchange Stock Changes Property Tests', () => {
  it('**Feature: ice-gas-pos, Property 16: Gas Exchange Stock Changes** - exchange decreases full stock by quantity', () => {
    fc.assert(
      fc.property(gasProductArbitrary, quantityArbitrary, (product, quantity) => {
        const result = GasCylinderManager.handleGasSale(product, quantity, true) // hasEmptyCylinder = true
        
        // Find the full stock change
        const fullStockChange = result.stockChanges.find(c => c.type === 'full')
        
        expect(fullStockChange).toBeDefined()
        expect(fullStockChange!.amount).toBe(-quantity)
      }),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 16: Gas Exchange Stock Changes** - exchange increases empty stock by quantity', () => {
    fc.assert(
      fc.property(gasProductArbitrary, quantityArbitrary, (product, quantity) => {
        const result = GasCylinderManager.handleGasSale(product, quantity, true) // hasEmptyCylinder = true
        
        // Find the empty stock change
        const emptyStockChange = result.stockChanges.find(c => c.type === 'empty')
        
        expect(emptyStockChange).toBeDefined()
        expect(emptyStockChange!.amount).toBe(quantity)
      }),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 16: Gas Exchange Stock Changes** - exchange has exactly two stock changes', () => {
    fc.assert(
      fc.property(gasProductArbitrary, quantityArbitrary, (product, quantity) => {
        const result = GasCylinderManager.handleGasSale(product, quantity, true)
        
        // Exchange should have exactly 2 stock changes: -full, +empty
        expect(result.stockChanges).toHaveLength(2)
        expect(result.saleType).toBe('exchange')
      }),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 16: Gas Exchange Stock Changes** - exchange has zero deposit amount', () => {
    fc.assert(
      fc.property(gasProductArbitrary, quantityArbitrary, (product, quantity) => {
        const result = GasCylinderManager.handleGasSale(product, quantity, true)
        
        // Exchange should have no deposit
        expect(result.depositAmount).toBe(0)
      }),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 16: Gas Exchange Stock Changes** - exchange price equals product price times quantity', () => {
    fc.assert(
      fc.property(gasProductArbitrary, quantityArbitrary, (product, quantity) => {
        const result = GasCylinderManager.handleGasSale(product, quantity, true)
        
        const expectedPrice = product.price * quantity
        expect(result.price).toBeCloseTo(expectedPrice, 5)
        expect(result.totalPrice).toBeCloseTo(expectedPrice, 5)
      }),
      { numRuns: 100 }
    )
  })
})

describe('Gas Deposit Calculation Property Tests', () => {
  it('**Feature: ice-gas-pos, Property 17: Gas Deposit Calculation** - deposit total equals (price + deposit_amount) × quantity', () => {
    fc.assert(
      fc.property(gasProductArbitrary, quantityArbitrary, (product, quantity) => {
        const result = GasCylinderManager.handleGasSale(product, quantity, false) // hasEmptyCylinder = false
        
        const depositAmount = product.deposit_amount || 0
        const expectedTotal = (product.price + depositAmount) * quantity
        
        expect(result.totalPrice).toBeCloseTo(expectedTotal, 5)
      }),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 17: Gas Deposit Calculation** - deposit amount equals product deposit times quantity', () => {
    fc.assert(
      fc.property(gasProductArbitrary, quantityArbitrary, (product, quantity) => {
        const result = GasCylinderManager.handleGasSale(product, quantity, false)
        
        const expectedDeposit = (product.deposit_amount || 0) * quantity
        expect(result.depositAmount).toBeCloseTo(expectedDeposit, 5)
      }),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 17: Gas Deposit Calculation** - deposit only decreases full stock', () => {
    fc.assert(
      fc.property(gasProductArbitrary, quantityArbitrary, (product, quantity) => {
        const result = GasCylinderManager.handleGasSale(product, quantity, false)
        
        // Deposit should only have 1 stock change: -full
        expect(result.stockChanges).toHaveLength(1)
        expect(result.stockChanges[0].type).toBe('full')
        expect(result.stockChanges[0].amount).toBe(-quantity)
      }),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 17: Gas Deposit Calculation** - deposit sale type is deposit', () => {
    fc.assert(
      fc.property(gasProductArbitrary, quantityArbitrary, (product, quantity) => {
        const result = GasCylinderManager.handleGasSale(product, quantity, false)
        
        expect(result.saleType).toBe('deposit')
      }),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 17: Gas Deposit Calculation** - price component equals product price times quantity', () => {
    fc.assert(
      fc.property(gasProductArbitrary, quantityArbitrary, (product, quantity) => {
        const result = GasCylinderManager.handleGasSale(product, quantity, false)
        
        const expectedPrice = product.price * quantity
        expect(result.price).toBeCloseTo(expectedPrice, 5)
      }),
      { numRuns: 100 }
    )
  })
})

describe('Gas Cylinder Return Property Tests', () => {
  it('**Feature: ice-gas-pos, Property 16: Gas Exchange Stock Changes** - cylinder return increases empty stock', () => {
    fc.assert(
      fc.property(gasProductArbitrary, quantityArbitrary, (product, quantity) => {
        const result = GasCylinderManager.handleCylinderReturn(product, quantity)
        
        // Return should increase empty stock
        expect(result.stockChanges).toHaveLength(1)
        expect(result.stockChanges[0].type).toBe('empty')
        expect(result.stockChanges[0].amount).toBe(quantity)
      }),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 17: Gas Deposit Calculation** - cylinder return refund equals deposit times quantity', () => {
    fc.assert(
      fc.property(gasProductArbitrary, quantityArbitrary, (product, quantity) => {
        const result = GasCylinderManager.handleCylinderReturn(product, quantity)
        
        const expectedRefund = (product.deposit_amount || 0) * quantity
        expect(result.refundAmount).toBeCloseTo(expectedRefund, 5)
      }),
      { numRuns: 100 }
    )
  })
})

describe('Gas Refill Property Tests', () => {
  it('**Feature: ice-gas-pos, Property 16: Gas Exchange Stock Changes** - refill decreases empty and increases full stock', () => {
    fc.assert(
      fc.property(gasProductArbitrary, quantityArbitrary, (product, quantity) => {
        const stockChanges = GasCylinderManager.handleRefill(product, quantity)
        
        // Refill should have 2 changes: -empty, +full
        expect(stockChanges).toHaveLength(2)
        
        const emptyChange = stockChanges.find(c => c.type === 'empty')
        const fullChange = stockChanges.find(c => c.type === 'full')
        
        expect(emptyChange).toBeDefined()
        expect(emptyChange!.amount).toBe(-quantity)
        
        expect(fullChange).toBeDefined()
        expect(fullChange!.amount).toBe(quantity)
      }),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 16: Gas Exchange Stock Changes** - refill is a round-trip for stock', () => {
    fc.assert(
      fc.property(gasProductArbitrary, quantityArbitrary, (product, quantity) => {
        const stockChanges = GasCylinderManager.handleRefill(product, quantity)
        
        // Net change in total cylinders should be zero (empty -> full conversion)
        const totalChange = stockChanges.reduce((sum, c) => sum + c.amount, 0)
        expect(totalChange).toBe(0)
      }),
      { numRuns: 100 }
    )
  })
})

describe('Gas Price Calculation Utility Tests', () => {
  it('**Feature: ice-gas-pos, Property 17: Gas Deposit Calculation** - calculateGasPrice exchange matches handleGasSale', () => {
    fc.assert(
      fc.property(gasProductArbitrary, quantityArbitrary, (product, quantity) => {
        const saleResult = GasCylinderManager.handleGasSale(product, quantity, true)
        const priceResult = GasCylinderManager.calculateGasPrice(product, quantity, 'exchange')
        
        expect(priceResult.price).toBeCloseTo(saleResult.price, 5)
        expect(priceResult.deposit).toBe(saleResult.depositAmount)
        expect(priceResult.total).toBeCloseTo(saleResult.totalPrice, 5)
      }),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 17: Gas Deposit Calculation** - calculateGasPrice deposit matches handleGasSale', () => {
    fc.assert(
      fc.property(gasProductArbitrary, quantityArbitrary, (product, quantity) => {
        const saleResult = GasCylinderManager.handleGasSale(product, quantity, false)
        const priceResult = GasCylinderManager.calculateGasPrice(product, quantity, 'deposit')
        
        expect(priceResult.price).toBeCloseTo(saleResult.price, 5)
        expect(priceResult.deposit).toBeCloseTo(saleResult.depositAmount, 5)
        expect(priceResult.total).toBeCloseTo(saleResult.totalPrice, 5)
      }),
      { numRuns: 100 }
    )
  })
})

describe('Gas Product Detection Tests', () => {
  it('**Feature: ice-gas-pos, Property 16: Gas Exchange Stock Changes** - isGasProduct returns true for gas category', () => {
    fc.assert(
      fc.property(gasProductArbitrary, (product) => {
        expect(GasCylinderManager.isGasProduct(product)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 16: Gas Exchange Stock Changes** - isGasProduct returns false for non-gas category', () => {
    const nonGasProductArbitrary: fc.Arbitrary<Product> = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      price: fc.float({ min: Math.fround(1), max: Math.fround(1000), noNaN: true }),
      category: fc.constantFrom('ice' as const, 'water' as const),
      unit: fc.string({ minLength: 1, maxLength: 20 }),
      stock: fc.integer({ min: 0, max: 100 }),
      low_stock_threshold: fc.integer({ min: 1, max: 10 }),
    })

    fc.assert(
      fc.property(nonGasProductArbitrary, (product) => {
        expect(GasCylinderManager.isGasProduct(product)).toBe(false)
      }),
      { numRuns: 100 }
    )
  })
})
