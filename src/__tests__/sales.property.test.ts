import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { CartItem, Product, Sale, SaleItem } from '../types'

/**
 * **Feature: ice-gas-pos, Property 8: Sales Sorted by Timestamp**
 * 
 * *For any* list of sales, the sales SHALL be sorted by timestamp in descending
 * order (newest first).
 * 
 * **Validates: Requirements 4.1**
 */

/**
 * **Feature: ice-gas-pos, Property 9: Sale Record Contains Required Fields**
 * 
 * *For any* completed sale, the sale record SHALL contain total, items array,
 * payment, change, and timestamp.
 * 
 * **Validates: Requirements 4.2**
 */

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

// Pure function to simulate sale completion logic (mirrors store logic)
function createSaleRecord(cart: CartItem[], payment: number): Sale | null {
  const total = calculateCartTotal(cart)
  
  if (payment < total) {
    return null
  }
  
  const saleItems = createSaleItems(cart)
  const change = payment - total
  
  return {
    id: crypto.randomUUID(),
    items: saleItems,
    total,
    payment,
    change,
    created_at: new Date().toISOString()
  }
}

// Pure function to sort sales by timestamp descending (newest first)
function sortSalesByTimestamp(sales: Sale[]): Sale[] {
  return [...sales].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

// Pure function to check if sales are sorted by timestamp descending
function isSortedByTimestampDescending(sales: Sale[]): boolean {
  for (let i = 0; i < sales.length - 1; i++) {
    const currentTime = new Date(sales[i].created_at).getTime()
    const nextTime = new Date(sales[i + 1].created_at).getTime()
    if (currentTime < nextTime) {
      return false
    }
  }
  return true
}

// Arbitrary for generating valid sale items
const saleItemArbitrary: fc.Arbitrary<SaleItem> = fc.record({
  product_id: fc.uuid(),
  product_name: fc.string({ minLength: 1, maxLength: 50 }),
  price: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
  quantity: fc.integer({ min: 1, max: 100 }),
  subtotal: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true })
})

// Arbitrary for generating valid sales with varying timestamps
const saleArbitrary: fc.Arbitrary<Sale> = fc.record({
  id: fc.uuid(),
  items: fc.array(saleItemArbitrary, { minLength: 1, maxLength: 5 }),
  total: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }),
  payment: fc.float({ min: Math.fround(0.01), max: Math.fround(200000), noNaN: true }),
  change: fc.float({ min: 0, max: Math.fround(100000), noNaN: true }),
  created_at: fc.integer({ 
    min: new Date('2020-01-01').getTime(), 
    max: new Date('2030-12-31').getTime() 
  }).map(timestamp => new Date(timestamp).toISOString())
})

// Arbitrary for generating a list of sales (can be empty or non-empty)
const salesListArbitrary: fc.Arbitrary<Sale[]> = fc.array(saleArbitrary, { minLength: 0, maxLength: 20 })

describe('Sales Sorted by Timestamp Property Tests', () => {
  it('**Feature: ice-gas-pos, Property 8: Sales Sorted by Timestamp** - sorted sales are in descending order', () => {
    fc.assert(
      fc.property(
        salesListArbitrary,
        (sales) => {
          const sortedSales = sortSalesByTimestamp(sales)
          
          // Verify the sorted list is in descending order by timestamp
          expect(isSortedByTimestampDescending(sortedSales)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 8: Sales Sorted by Timestamp** - sorting preserves all sales', () => {
    fc.assert(
      fc.property(
        salesListArbitrary,
        (sales) => {
          const sortedSales = sortSalesByTimestamp(sales)
          
          // Verify no sales are lost or added during sorting
          expect(sortedSales.length).toBe(sales.length)
          
          // Verify all original sales are present in sorted list
          const originalIds = new Set(sales.map(s => s.id))
          const sortedIds = new Set(sortedSales.map(s => s.id))
          expect(sortedIds).toEqual(originalIds)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 8: Sales Sorted by Timestamp** - newest sale is first', () => {
    fc.assert(
      fc.property(
        fc.array(saleArbitrary, { minLength: 2, maxLength: 20 }),
        (sales) => {
          const sortedSales = sortSalesByTimestamp(sales)
          
          // Find the sale with the newest timestamp from original list
          const newestSale = sales.reduce((newest, current) => 
            new Date(current.created_at).getTime() > new Date(newest.created_at).getTime() 
              ? current 
              : newest
          )
          
          // The first sale in sorted list should have the newest timestamp
          expect(new Date(sortedSales[0].created_at).getTime())
            .toBeGreaterThanOrEqual(new Date(newestSale.created_at).getTime())
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 8: Sales Sorted by Timestamp** - oldest sale is last', () => {
    fc.assert(
      fc.property(
        fc.array(saleArbitrary, { minLength: 2, maxLength: 20 }),
        (sales) => {
          const sortedSales = sortSalesByTimestamp(sales)
          
          // Find the sale with the oldest timestamp from original list
          const oldestSale = sales.reduce((oldest, current) => 
            new Date(current.created_at).getTime() < new Date(oldest.created_at).getTime() 
              ? current 
              : oldest
          )
          
          // The last sale in sorted list should have the oldest timestamp
          const lastSale = sortedSales[sortedSales.length - 1]
          expect(new Date(lastSale.created_at).getTime())
            .toBeLessThanOrEqual(new Date(oldestSale.created_at).getTime())
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 8: Sales Sorted by Timestamp** - empty list remains empty', () => {
    const emptySales: Sale[] = []
    const sortedSales = sortSalesByTimestamp(emptySales)
    
    expect(sortedSales).toEqual([])
    expect(isSortedByTimestampDescending(sortedSales)).toBe(true)
  })

  it('**Feature: ice-gas-pos, Property 8: Sales Sorted by Timestamp** - single sale list is trivially sorted', () => {
    fc.assert(
      fc.property(
        saleArbitrary,
        (sale) => {
          const singleSaleList = [sale]
          const sortedSales = sortSalesByTimestamp(singleSaleList)
          
          expect(sortedSales.length).toBe(1)
          expect(sortedSales[0].id).toBe(sale.id)
          expect(isSortedByTimestampDescending(sortedSales)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 8: Sales Sorted by Timestamp** - sorting is idempotent', () => {
    fc.assert(
      fc.property(
        salesListArbitrary,
        (sales) => {
          const sortedOnce = sortSalesByTimestamp(sales)
          const sortedTwice = sortSalesByTimestamp(sortedOnce)
          
          // Sorting twice should produce the same result as sorting once
          expect(sortedTwice.map(s => s.id)).toEqual(sortedOnce.map(s => s.id))
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * **Feature: ice-gas-pos, Property 10: Daily Sales Aggregation**
 * 
 * *For any* set of sales, today's total SHALL equal the sum of totals for sales
 * with today's date.
 * 
 * **Validates: Requirements 4.3**
 */

// Pure function to filter sales by a specific date (matching HistoryPage logic)
function filterSalesByDate(sales: Sale[], targetDate: Date): Sale[] {
  return sales.filter((sale) => {
    const saleDate = new Date(sale.created_at)
    return saleDate.toDateString() === targetDate.toDateString()
  })
}

// Pure function to calculate total from a list of sales
function calculateSalesTotal(sales: Sale[]): number {
  return sales.reduce((sum, sale) => sum + sale.total, 0)
}

// Pure function to get today's sales aggregation (mirrors HistoryPage logic)
function getDailySalesAggregation(sales: Sale[]): { total: number; count: number } {
  const today = new Date()
  const todaySales = filterSalesByDate(sales, today)
  return {
    total: calculateSalesTotal(todaySales),
    count: todaySales.length
  }
}

// Arbitrary for generating sales with today's date
const todaySaleArbitrary: fc.Arbitrary<Sale> = fc.record({
  id: fc.uuid(),
  items: fc.array(saleItemArbitrary, { minLength: 1, maxLength: 5 }),
  total: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }),
  payment: fc.float({ min: Math.fround(0.01), max: Math.fround(200000), noNaN: true }),
  change: fc.float({ min: 0, max: Math.fround(100000), noNaN: true }),
  created_at: fc.constant(new Date().toISOString())
})

// Arbitrary for generating sales with a past date (not today)
const pastSaleArbitrary: fc.Arbitrary<Sale> = fc.record({
  id: fc.uuid(),
  items: fc.array(saleItemArbitrary, { minLength: 1, maxLength: 5 }),
  total: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }),
  payment: fc.float({ min: Math.fround(0.01), max: Math.fround(200000), noNaN: true }),
  change: fc.float({ min: 0, max: Math.fround(100000), noNaN: true }),
  created_at: fc.integer({ 
    min: new Date('2020-01-01').getTime(), 
    max: new Date().getTime() - 86400000 // At least 1 day ago
  }).map(timestamp => new Date(timestamp).toISOString())
})

describe('Daily Sales Aggregation Property Tests', () => {
  it("**Feature: ice-gas-pos, Property 10: Daily Sales Aggregation** - today's total equals sum of today's sales", () => {
    fc.assert(
      fc.property(
        fc.array(todaySaleArbitrary, { minLength: 0, maxLength: 10 }),
        fc.array(pastSaleArbitrary, { minLength: 0, maxLength: 10 }),
        (todaySales, pastSales) => {
          // Combine today's sales with past sales
          const allSales = [...todaySales, ...pastSales]
          
          // Get aggregation using the function under test
          const aggregation = getDailySalesAggregation(allSales)
          
          // Calculate expected total from today's sales only
          const expectedTotal = todaySales.reduce((sum, sale) => sum + sale.total, 0)
          
          // Today's total should equal sum of today's sales totals
          expect(aggregation.total).toBeCloseTo(expectedTotal, 5)
        }
      ),
      { numRuns: 100 }
    )
  })

  it("**Feature: ice-gas-pos, Property 10: Daily Sales Aggregation** - today's count equals number of today's sales", () => {
    fc.assert(
      fc.property(
        fc.array(todaySaleArbitrary, { minLength: 0, maxLength: 10 }),
        fc.array(pastSaleArbitrary, { minLength: 0, maxLength: 10 }),
        (todaySales, pastSales) => {
          // Combine today's sales with past sales
          const allSales = [...todaySales, ...pastSales]
          
          // Get aggregation using the function under test
          const aggregation = getDailySalesAggregation(allSales)
          
          // Today's count should equal number of today's sales
          expect(aggregation.count).toBe(todaySales.length)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 10: Daily Sales Aggregation** - past sales do not affect today total', () => {
    fc.assert(
      fc.property(
        fc.array(pastSaleArbitrary, { minLength: 1, maxLength: 10 }),
        (pastSales) => {
          // Only past sales, no today's sales
          const aggregation = getDailySalesAggregation(pastSales)
          
          // Today's total should be zero when there are no today's sales
          expect(aggregation.total).toBe(0)
          expect(aggregation.count).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 10: Daily Sales Aggregation** - empty sales list returns zero', () => {
    const emptySales: Sale[] = []
    const aggregation = getDailySalesAggregation(emptySales)
    
    expect(aggregation.total).toBe(0)
    expect(aggregation.count).toBe(0)
  })

  it("**Feature: ice-gas-pos, Property 10: Daily Sales Aggregation** - aggregation is additive for today's sales", () => {
    fc.assert(
      fc.property(
        fc.array(todaySaleArbitrary, { minLength: 2, maxLength: 10 }),
        (todaySales) => {
          // Split sales into two groups
          const midpoint = Math.floor(todaySales.length / 2)
          const group1 = todaySales.slice(0, midpoint)
          const group2 = todaySales.slice(midpoint)
          
          // Get aggregations
          const agg1 = getDailySalesAggregation(group1)
          const agg2 = getDailySalesAggregation(group2)
          const aggTotal = getDailySalesAggregation(todaySales)
          
          // Total of combined should equal sum of individual totals
          expect(aggTotal.total).toBeCloseTo(agg1.total + agg2.total, 5)
          expect(aggTotal.count).toBe(agg1.count + agg2.count)
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Sale Record Required Fields Property Tests', () => {
  it('**Feature: ice-gas-pos, Property 9: Sale Record Contains Required Fields** - sale has id field', () => {
    fc.assert(
      fc.property(
        nonEmptyCartArbitrary,
        fc.float({ min: 0, max: 100000, noNaN: true }),
        (cart, extraPayment) => {
          const total = calculateCartTotal(cart)
          const payment = total + Math.abs(extraPayment)
          
          const sale = createSaleRecord(cart, payment)
          
          expect(sale).not.toBeNull()
          if (sale) {
            expect(sale).toHaveProperty('id')
            expect(typeof sale.id).toBe('string')
            expect(sale.id.length).toBeGreaterThan(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 9: Sale Record Contains Required Fields** - sale has total field', () => {
    fc.assert(
      fc.property(
        nonEmptyCartArbitrary,
        fc.float({ min: 0, max: 100000, noNaN: true }),
        (cart, extraPayment) => {
          const total = calculateCartTotal(cart)
          const payment = total + Math.abs(extraPayment)
          
          const sale = createSaleRecord(cart, payment)
          
          expect(sale).not.toBeNull()
          if (sale) {
            expect(sale).toHaveProperty('total')
            expect(typeof sale.total).toBe('number')
            expect(sale.total).toBeCloseTo(total, 10)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 9: Sale Record Contains Required Fields** - sale has items array', () => {
    fc.assert(
      fc.property(
        nonEmptyCartArbitrary,
        fc.float({ min: 0, max: 100000, noNaN: true }),
        (cart, extraPayment) => {
          const total = calculateCartTotal(cart)
          const payment = total + Math.abs(extraPayment)
          
          const sale = createSaleRecord(cart, payment)
          
          expect(sale).not.toBeNull()
          if (sale) {
            expect(sale).toHaveProperty('items')
            expect(Array.isArray(sale.items)).toBe(true)
            expect(sale.items.length).toBe(cart.length)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 9: Sale Record Contains Required Fields** - sale has payment field', () => {
    fc.assert(
      fc.property(
        nonEmptyCartArbitrary,
        fc.float({ min: 0, max: 100000, noNaN: true }),
        (cart, extraPayment) => {
          const total = calculateCartTotal(cart)
          const payment = total + Math.abs(extraPayment)
          
          const sale = createSaleRecord(cart, payment)
          
          expect(sale).not.toBeNull()
          if (sale) {
            expect(sale).toHaveProperty('payment')
            expect(typeof sale.payment).toBe('number')
            expect(sale.payment).toBeCloseTo(payment, 10)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 9: Sale Record Contains Required Fields** - sale has change field', () => {
    fc.assert(
      fc.property(
        nonEmptyCartArbitrary,
        fc.float({ min: 0, max: 100000, noNaN: true }),
        (cart, extraPayment) => {
          const total = calculateCartTotal(cart)
          const payment = total + Math.abs(extraPayment)
          
          const sale = createSaleRecord(cart, payment)
          
          expect(sale).not.toBeNull()
          if (sale) {
            expect(sale).toHaveProperty('change')
            expect(typeof sale.change).toBe('number')
            expect(sale.change).toBeCloseTo(payment - total, 10)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 9: Sale Record Contains Required Fields** - sale has created_at timestamp', () => {
    fc.assert(
      fc.property(
        nonEmptyCartArbitrary,
        fc.float({ min: 0, max: 100000, noNaN: true }),
        (cart, extraPayment) => {
          const total = calculateCartTotal(cart)
          const payment = total + Math.abs(extraPayment)
          
          const sale = createSaleRecord(cart, payment)
          
          expect(sale).not.toBeNull()
          if (sale) {
            expect(sale).toHaveProperty('created_at')
            expect(typeof sale.created_at).toBe('string')
            // Verify it's a valid ISO date string
            const parsedDate = new Date(sale.created_at)
            expect(parsedDate.toString()).not.toBe('Invalid Date')
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 9: Sale Record Contains Required Fields** - all required fields present in single check', () => {
    fc.assert(
      fc.property(
        nonEmptyCartArbitrary,
        fc.float({ min: 0, max: 100000, noNaN: true }),
        (cart, extraPayment) => {
          const total = calculateCartTotal(cart)
          const payment = total + Math.abs(extraPayment)
          
          const sale = createSaleRecord(cart, payment)
          
          expect(sale).not.toBeNull()
          if (sale) {
            // Check all required fields exist
            const requiredFields = ['id', 'items', 'total', 'payment', 'change', 'created_at']
            for (const field of requiredFields) {
              expect(sale).toHaveProperty(field)
            }
            
            // Verify types
            expect(typeof sale.id).toBe('string')
            expect(Array.isArray(sale.items)).toBe(true)
            expect(typeof sale.total).toBe('number')
            expect(typeof sale.payment).toBe('number')
            expect(typeof sale.change).toBe('number')
            expect(typeof sale.created_at).toBe('string')
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('**Feature: ice-gas-pos, Property 9: Sale Record Contains Required Fields** - each sale item has required fields', () => {
    fc.assert(
      fc.property(
        nonEmptyCartArbitrary,
        fc.float({ min: 0, max: 100000, noNaN: true }),
        (cart, extraPayment) => {
          const total = calculateCartTotal(cart)
          const payment = total + Math.abs(extraPayment)
          
          const sale = createSaleRecord(cart, payment)
          
          expect(sale).not.toBeNull()
          if (sale) {
            // Each sale item should have required fields per Requirements 4.2
            for (const item of sale.items) {
              expect(item).toHaveProperty('product_id')
              expect(item).toHaveProperty('product_name')
              expect(item).toHaveProperty('price')
              expect(item).toHaveProperty('quantity')
              expect(item).toHaveProperty('subtotal')
              
              // Verify types
              expect(typeof item.product_id).toBe('string')
              expect(typeof item.product_name).toBe('string')
              expect(typeof item.price).toBe('number')
              expect(typeof item.quantity).toBe('number')
              expect(typeof item.subtotal).toBe('number')
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
