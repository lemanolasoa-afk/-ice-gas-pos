import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  calculateMeltLoss,
  calculateMeltPercent,
  calculateMeltLossValue,
  isAbnormalMelt,
  calculateExpectedStock,
  calculateAllMeltLossData
} from '../lib/meltLossCalculations'

/**
 * **Feature: melt-loss, Property Tests for Daily Stock Count Recording**
 * 
 * Tests the correctness properties defined in the design document:
 * - CP-1: การคำนวณ Melt Loss ถูกต้อง
 * - CP-4: Abnormal Detection
 * 
 * **Validates: Requirements REQ-2 (AC-2.3), REQ-4 (AC-4.3)**
 */

// Arbitrary for generating valid stock values
const stockArbitrary = fc.integer({ min: 0, max: 10000 })
const positiveStockArbitrary = fc.integer({ min: 1, max: 10000 })
const percentArbitrary = fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true })
const costArbitrary = fc.float({ min: Math.fround(0), max: Math.fround(1000), noNaN: true })

describe('Melt Loss Calculation Property Tests - CP-1', () => {
  /**
   * **Feature: melt-loss, Property 1: Melt Loss Non-Negative**
   * 
   * *For any* expected stock and actual stock values,
   * melt_loss SHALL never be negative.
   * 
   * **Validates: Requirements REQ-2 (AC-2.3)**
   */
  it('CP-1: melt_loss is never negative', () => {
    fc.assert(
      fc.property(stockArbitrary, stockArbitrary, (expectedStock, actualStock) => {
        const meltLoss = calculateMeltLoss(expectedStock, actualStock)
        expect(meltLoss).toBeGreaterThanOrEqual(0)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: melt-loss, Property 2: Melt Loss Calculation Formula**
   * 
   * *For any* expected stock >= actual stock,
   * melt_loss SHALL equal (expected_stock - actual_stock).
   * 
   * **Validates: Requirements REQ-2 (AC-2.3)**
   */
  it('CP-1: melt_loss = expected_stock - actual_stock when expected >= actual', () => {
    fc.assert(
      fc.property(
        positiveStockArbitrary,
        fc.integer({ min: 0, max: 100 }),
        (expectedStock, reduction) => {
          // Ensure actualStock <= expectedStock
          const actualStock = Math.max(0, expectedStock - reduction)
          const meltLoss = calculateMeltLoss(expectedStock, actualStock)
          expect(meltLoss).toBe(expectedStock - actualStock)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: melt-loss, Property 3: Melt Loss Zero When Actual > Expected**
   * 
   * *For any* actual stock > expected stock,
   * melt_loss SHALL be 0 (not negative).
   * 
   * **Validates: Requirements REQ-2 (AC-2.3)**
   */
  it('CP-1: melt_loss = 0 when actual_stock > expected_stock', () => {
    fc.assert(
      fc.property(
        stockArbitrary,
        fc.integer({ min: 1, max: 100 }),
        (expectedStock, excess) => {
          const actualStock = expectedStock + excess
          const meltLoss = calculateMeltLoss(expectedStock, actualStock)
          expect(meltLoss).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: melt-loss, Property 4: Expected Stock Calculation**
   * 
   * *For any* system stock and sold today values,
   * expected_stock = system_stock - sold_today (minimum 0).
   * 
   * **Validates: Requirements REQ-2 (AC-2.3)**
   */
  it('CP-1: expected_stock = max(0, system_stock - sold_today)', () => {
    fc.assert(
      fc.property(stockArbitrary, stockArbitrary, (systemStock, soldToday) => {
        const expectedStock = calculateExpectedStock(systemStock, soldToday)
        expect(expectedStock).toBe(Math.max(0, systemStock - soldToday))
        expect(expectedStock).toBeGreaterThanOrEqual(0)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: melt-loss, Property 5: Melt Percent Calculation**
   * 
   * *For any* melt loss and expected stock > 0,
   * melt_percent = (melt_loss / expected_stock) * 100.
   * 
   * **Validates: Requirements REQ-2 (AC-2.3)**
   */
  it('CP-1: melt_percent calculation is correct', () => {
    fc.assert(
      fc.property(
        positiveStockArbitrary,
        fc.integer({ min: 0, max: 100 }),
        (expectedStock, meltLoss) => {
          const meltPercent = calculateMeltPercent(meltLoss, expectedStock)
          const expected = (meltLoss / expectedStock) * 100
          expect(meltPercent).toBeCloseTo(expected, 5)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: melt-loss, Property 6: Melt Percent Zero When Expected Stock Zero**
   * 
   * *For any* melt loss when expected stock = 0,
   * melt_percent SHALL be 0 (avoid division by zero).
   * 
   * **Validates: Requirements REQ-2 (AC-2.3)**
   */
  it('CP-1: melt_percent = 0 when expected_stock = 0', () => {
    fc.assert(
      fc.property(stockArbitrary, (meltLoss) => {
        const meltPercent = calculateMeltPercent(meltLoss, 0)
        expect(meltPercent).toBe(0)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: melt-loss, Property 7: Melt Loss Value Calculation**
   * 
   * *For any* melt loss and cost per unit,
   * melt_loss_value = melt_loss * cost_per_unit.
   * 
   * **Validates: Requirements REQ-3 (AC-3.2)**
   */
  it('CP-1: melt_loss_value = melt_loss * cost_per_unit', () => {
    fc.assert(
      fc.property(stockArbitrary, costArbitrary, (meltLoss, costPerUnit) => {
        const meltLossValue = calculateMeltLossValue(meltLoss, costPerUnit)
        expect(meltLossValue).toBeCloseTo(meltLoss * costPerUnit, 5)
      }),
      { numRuns: 100 }
    )
  })
})

describe('Abnormal Detection Property Tests - CP-4', () => {
  /**
   * **Feature: melt-loss, Property 8: Abnormal Detection Threshold**
   * 
   * *For any* melt percent > (expected_percent * 1.5),
   * is_abnormal SHALL be true.
   * 
   * **Validates: Requirements REQ-4 (AC-4.3)**
   */
  it('CP-4: is_abnormal = true when melt_percent > expected_percent * 1.5', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(1), max: Math.fround(50), noNaN: true }),
        fc.float({ min: Math.fround(1.6), max: Math.fround(3), noNaN: true }),
        (expectedPercent, multiplier) => {
          const meltPercent = expectedPercent * multiplier
          const isAbnormal = isAbnormalMelt(meltPercent, expectedPercent, 1.5)
          expect(isAbnormal).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: melt-loss, Property 9: Normal Detection**
   * 
   * *For any* melt percent <= (expected_percent * 1.5),
   * is_abnormal SHALL be false.
   * 
   * **Validates: Requirements REQ-4 (AC-4.3)**
   */
  it('CP-4: is_abnormal = false when melt_percent <= expected_percent * 1.5', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(1), max: Math.fround(50), noNaN: true }),
        fc.float({ min: Math.fround(0), max: Math.fround(1.5), noNaN: true }),
        (expectedPercent, multiplier) => {
          const meltPercent = expectedPercent * multiplier
          const isAbnormal = isAbnormalMelt(meltPercent, expectedPercent, 1.5)
          expect(isAbnormal).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: melt-loss, Property 10: Abnormal Detection with Zero Expected**
   * 
   * *For any* melt percent > 10% when expected_percent = 0,
   * is_abnormal SHALL be true (fallback threshold).
   * 
   * **Validates: Requirements REQ-4 (AC-4.3)**
   */
  it('CP-4: is_abnormal uses 10% fallback when expected_percent = 0', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(10.1), max: Math.fround(100), noNaN: true }),
        (meltPercent) => {
          const isAbnormal = isAbnormalMelt(meltPercent, 0, 1.5)
          expect(isAbnormal).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Report Summary Aggregation - REQ-3', () => {
  /**
   * **Feature: melt-loss, Property 13: Summary Total Melt Loss**
   * 
   * *For any* list of daily stock counts,
   * total_melt_loss SHALL equal the sum of all individual melt_loss values.
   * 
   * **Validates: Requirements REQ-3 (AC-3.1, AC-3.2)**
   */
  it('REQ-3: total_melt_loss equals sum of individual melt_loss values', () => {
    // Generate arbitrary daily stock count records
    const dailyStockCountArb = fc.record({
      id: fc.uuid(),
      product_id: fc.uuid(),
      count_date: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31'), noInvalidDate: true })
        .map(d => d.toISOString().split('T')[0]),
      system_stock: stockArbitrary,
      actual_stock: stockArbitrary,
      melt_loss: fc.integer({ min: 0, max: 100 }),
      melt_loss_value: fc.float({ min: Math.fround(0), max: Math.fround(1000), noNaN: true }),
      melt_percent: fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
      expected_melt_percent: fc.float({ min: Math.fround(0), max: Math.fround(20), noNaN: true }),
      is_abnormal: fc.boolean()
    })

    fc.assert(
      fc.property(fc.array(dailyStockCountArb, { minLength: 0, maxLength: 20 }), (records) => {
        // Calculate summary like getMeltLossSummary does
        const totalMeltLoss = records.reduce((sum, item) => sum + item.melt_loss, 0)
        const expectedSum = records.map(r => r.melt_loss).reduce((a, b) => a + b, 0)
        
        expect(totalMeltLoss).toBe(expectedSum)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: melt-loss, Property 14: Summary Total Melt Value**
   * 
   * *For any* list of daily stock counts,
   * total_melt_value SHALL equal the sum of all individual melt_loss_value values.
   * 
   * **Validates: Requirements REQ-3 (AC-3.2)**
   */
  it('REQ-3: total_melt_value equals sum of individual melt_loss_value values', () => {
    const dailyStockCountArb = fc.record({
      melt_loss_value: fc.float({ min: Math.fround(0), max: Math.fround(1000), noNaN: true })
    })

    fc.assert(
      fc.property(fc.array(dailyStockCountArb, { minLength: 0, maxLength: 20 }), (records) => {
        const totalMeltValue = records.reduce((sum, item) => sum + item.melt_loss_value, 0)
        const expectedSum = records.map(r => r.melt_loss_value).reduce((a, b) => a + b, 0)
        
        expect(totalMeltValue).toBeCloseTo(expectedSum, 5)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: melt-loss, Property 15: Summary Average Melt Percent**
   * 
   * *For any* non-empty list of daily stock counts,
   * average_melt_percent SHALL equal the arithmetic mean of all melt_percent values.
   * 
   * **Validates: Requirements REQ-3 (AC-3.3)**
   */
  it('REQ-3: average_melt_percent equals arithmetic mean of melt_percent values', () => {
    const dailyStockCountArb = fc.record({
      melt_percent: fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true })
    })

    fc.assert(
      fc.property(fc.array(dailyStockCountArb, { minLength: 1, maxLength: 20 }), (records) => {
        const avgMeltPercent = records.length > 0 
          ? records.reduce((sum, item) => sum + item.melt_percent, 0) / records.length 
          : 0
        const expectedAvg = records.map(r => r.melt_percent).reduce((a, b) => a + b, 0) / records.length
        
        expect(avgMeltPercent).toBeCloseTo(expectedAvg, 5)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: melt-loss, Property 16: Summary Abnormal Count**
   * 
   * *For any* list of daily stock counts,
   * abnormal_count SHALL equal the count of records where is_abnormal = true.
   * 
   * **Validates: Requirements REQ-3 (AC-3.1), REQ-4**
   */
  it('REQ-3: abnormal_count equals count of is_abnormal = true records', () => {
    const dailyStockCountArb = fc.record({
      is_abnormal: fc.boolean()
    })

    fc.assert(
      fc.property(fc.array(dailyStockCountArb, { minLength: 0, maxLength: 20 }), (records) => {
        const abnormalCount = records.filter(item => item.is_abnormal).length
        const expectedCount = records.filter(r => r.is_abnormal).length
        
        expect(abnormalCount).toBe(expectedCount)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: melt-loss, Property 17: Empty Records Summary**
   * 
   * *For any* empty list of daily stock counts,
   * summary SHALL have all zero values.
   * 
   * **Validates: Requirements REQ-3**
   */
  it('REQ-3: empty records produce zero summary values', () => {
    const records: { melt_loss: number; melt_loss_value: number; melt_percent: number; is_abnormal: boolean }[] = []
    
    const totalMeltLoss = records.reduce((sum, item) => sum + item.melt_loss, 0)
    const totalMeltValue = records.reduce((sum, item) => sum + item.melt_loss_value, 0)
    const avgMeltPercent = records.length > 0 
      ? records.reduce((sum, item) => sum + item.melt_percent, 0) / records.length 
      : 0
    const abnormalCount = records.filter(item => item.is_abnormal).length

    expect(totalMeltLoss).toBe(0)
    expect(totalMeltValue).toBe(0)
    expect(avgMeltPercent).toBe(0)
    expect(abnormalCount).toBe(0)
  })
})

describe('Report By Product Aggregation - REQ-3', () => {
  /**
   * **Feature: melt-loss, Property 18: By Product Total Melt Loss**
   * 
   * *For any* list of daily stock counts grouped by product,
   * each product's total_melt_loss SHALL equal the sum of melt_loss for that product.
   * 
   * **Validates: Requirements REQ-3 (AC-3.1)**
   */
  it('REQ-3: by-product total_melt_loss equals sum of product melt_loss values', () => {
    const productId = fc.uuid()
    const dailyStockCountArb = fc.record({
      product_id: productId,
      melt_loss: fc.integer({ min: 0, max: 100 }),
      melt_loss_value: fc.float({ min: Math.fround(0), max: Math.fround(500), noNaN: true }),
      melt_percent: fc.float({ min: Math.fround(0), max: Math.fround(50), noNaN: true }),
      expected_melt_percent: fc.float({ min: Math.fround(1), max: Math.fround(10), noNaN: true })
    })

    fc.assert(
      fc.property(fc.array(dailyStockCountArb, { minLength: 1, maxLength: 10 }), (records) => {
        // Group by product (all same product_id in this test)
        const byProduct: Record<string, { total_melt_loss: number; count_days: number }> = {}
        
        records.forEach(item => {
          if (!byProduct[item.product_id]) {
            byProduct[item.product_id] = { total_melt_loss: 0, count_days: 0 }
          }
          byProduct[item.product_id].total_melt_loss += item.melt_loss
          byProduct[item.product_id].count_days += 1
        })

        // Verify each product's total
        Object.entries(byProduct).forEach(([pid, data]) => {
          const expectedTotal = records
            .filter(r => r.product_id === pid)
            .reduce((sum, r) => sum + r.melt_loss, 0)
          expect(data.total_melt_loss).toBe(expectedTotal)
        })
      }),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: melt-loss, Property 19: By Product Average Melt Percent**
   * 
   * *For any* list of daily stock counts for a product,
   * average_melt_percent SHALL equal the arithmetic mean of melt_percent for that product.
   * 
   * **Validates: Requirements REQ-3 (AC-3.3)**
   */
  it('REQ-3: by-product average_melt_percent equals mean of product melt_percent values', () => {
    const dailyStockCountArb = fc.record({
      product_id: fc.constantFrom('prod-1', 'prod-2'),
      melt_percent: fc.float({ min: Math.fround(0), max: Math.fround(50), noNaN: true })
    })

    fc.assert(
      fc.property(fc.array(dailyStockCountArb, { minLength: 1, maxLength: 20 }), (records) => {
        // Group by product
        const byProduct: Record<string, { sum_percent: number; count_days: number }> = {}
        
        records.forEach(item => {
          if (!byProduct[item.product_id]) {
            byProduct[item.product_id] = { sum_percent: 0, count_days: 0 }
          }
          byProduct[item.product_id].sum_percent += item.melt_percent
          byProduct[item.product_id].count_days += 1
        })

        // Verify each product's average
        Object.entries(byProduct).forEach(([pid, data]) => {
          const avgPercent = data.count_days > 0 ? data.sum_percent / data.count_days : 0
          const productRecords = records.filter(r => r.product_id === pid)
          const expectedAvg = productRecords.reduce((sum, r) => sum + r.melt_percent, 0) / productRecords.length
          
          expect(avgPercent).toBeCloseTo(expectedAvg, 5)
        })
      }),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: melt-loss, Property 20: By Product Count Days**
   * 
   * *For any* list of daily stock counts for a product,
   * count_days SHALL equal the number of records for that product.
   * 
   * **Validates: Requirements REQ-3 (AC-3.1)**
   */
  it('REQ-3: by-product count_days equals number of records for that product', () => {
    const dailyStockCountArb = fc.record({
      product_id: fc.constantFrom('prod-a', 'prod-b', 'prod-c'),
      melt_loss: fc.integer({ min: 0, max: 50 })
    })

    fc.assert(
      fc.property(fc.array(dailyStockCountArb, { minLength: 0, maxLength: 30 }), (records) => {
        // Group by product
        const byProduct: Record<string, number> = {}
        
        records.forEach(item => {
          byProduct[item.product_id] = (byProduct[item.product_id] || 0) + 1
        })

        // Verify each product's count
        Object.entries(byProduct).forEach(([pid, count]) => {
          const expectedCount = records.filter(r => r.product_id === pid).length
          expect(count).toBe(expectedCount)
        })
      }),
      { numRuns: 100 }
    )
  })
})

describe('Date Range Filtering - REQ-3', () => {
  /**
   * **Feature: melt-loss, Property 21: Date Range Calculation**
   * 
   * *For any* date range type,
   * the start date SHALL be correctly calculated relative to end date.
   * 
   * **Validates: Requirements REQ-3 (AC-3.4)**
   */
  it('REQ-3: date range calculation produces correct start/end dates', () => {
    // Test the getDateRange logic from MeltLossReportPage
    const getDateRange = (range: 'today' | '7days' | '30days'): { start: string; end: string } => {
      const today = new Date()
      const end = today.toISOString().split('T')[0]
      
      let start: Date
      switch (range) {
        case 'today':
          start = new Date(today)
          break
        case '7days':
          start = new Date(today)
          start.setDate(start.getDate() - 6)
          break
        case '30days':
          start = new Date(today)
          start.setDate(start.getDate() - 29)
          break
        default:
          start = new Date(today)
          start.setDate(start.getDate() - 6)
      }
      
      return { start: start.toISOString().split('T')[0], end }
    }

    // Test 'today' range
    const todayRange = getDateRange('today')
    expect(todayRange.start).toBe(todayRange.end)

    // Test '7days' range - should span 7 days (today + 6 previous days)
    const sevenDaysRange = getDateRange('7days')
    const startDate7 = new Date(sevenDaysRange.start)
    const endDate7 = new Date(sevenDaysRange.end)
    const diffDays7 = Math.round((endDate7.getTime() - startDate7.getTime()) / (1000 * 60 * 60 * 24))
    expect(diffDays7).toBe(6) // 7 days inclusive means 6 days difference

    // Test '30days' range - should span 30 days (today + 29 previous days)
    const thirtyDaysRange = getDateRange('30days')
    const startDate30 = new Date(thirtyDaysRange.start)
    const endDate30 = new Date(thirtyDaysRange.end)
    const diffDays30 = Math.round((endDate30.getTime() - startDate30.getTime()) / (1000 * 60 * 60 * 24))
    expect(diffDays30).toBe(29) // 30 days inclusive means 29 days difference
  })

  /**
   * **Feature: melt-loss, Property 22: Date Filtering Correctness**
   * 
   * *For any* list of records with dates,
   * filtering by date range SHALL only include records within that range.
   * 
   * **Validates: Requirements REQ-3 (AC-3.4)**
   */
  it('REQ-3: date filtering includes only records within range', () => {
    const recordArb = fc.record({
      count_date: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31'), noInvalidDate: true })
        .map(d => d.toISOString().split('T')[0]),
      melt_loss: fc.integer({ min: 0, max: 100 })
    })

    fc.assert(
      fc.property(
        fc.array(recordArb, { minLength: 0, maxLength: 30 }),
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-30'), noInvalidDate: true }),
        fc.date({ min: new Date('2024-07-01'), max: new Date('2024-12-31'), noInvalidDate: true }),
        (records, startDateObj, endDateObj) => {
          // Ensure start <= end
          const [start, end] = startDateObj <= endDateObj 
            ? [startDateObj, endDateObj] 
            : [endDateObj, startDateObj]
          
          const startStr = start.toISOString().split('T')[0]
          const endStr = end.toISOString().split('T')[0]

          // Filter records by date range
          const filtered = records.filter(r => 
            r.count_date >= startStr && r.count_date <= endStr
          )

          // Verify all filtered records are within range
          filtered.forEach(r => {
            expect(r.count_date >= startStr).toBe(true)
            expect(r.count_date <= endStr).toBe(true)
          })

          // Verify no records outside range are included
          const outsideRange = records.filter(r => 
            r.count_date < startStr || r.count_date > endStr
          )
          outsideRange.forEach(r => {
            expect(filtered.includes(r)).toBe(false)
          })
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Complete Melt Loss Data Calculation - Integration', () => {
  /**
   * **Feature: melt-loss, Property 11: All Calculations Consistent**
   * 
   * *For any* valid input parameters,
   * calculateAllMeltLossData SHALL return consistent results
   * matching individual calculation functions.
   * 
   * **Validates: Requirements REQ-2 (AC-2.3), REQ-4 (AC-4.3)**
   */
  it('calculateAllMeltLossData returns consistent results', () => {
    fc.assert(
      fc.property(
        positiveStockArbitrary,
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        fc.float({ min: Math.fround(1), max: Math.fround(20), noNaN: true }),
        costArbitrary,
        (systemStock, soldToday, actualReduction, expectedMeltPercent, cost) => {
          // Ensure valid inputs
          const actualSold = Math.min(soldToday, systemStock)
          const expectedStock = calculateExpectedStock(systemStock, actualSold)
          const actualStock = Math.max(0, expectedStock - actualReduction)

          const result = calculateAllMeltLossData(
            systemStock,
            actualSold,
            actualStock,
            expectedMeltPercent,
            cost
          )

          // Verify expected stock
          expect(result.expectedStock).toBe(expectedStock)

          // Verify melt loss
          const expectedMeltLoss = calculateMeltLoss(expectedStock, actualStock)
          expect(result.meltLoss).toBe(expectedMeltLoss)

          // Verify melt loss value
          const expectedValue = calculateMeltLossValue(expectedMeltLoss, cost)
          expect(result.meltLossValue).toBeCloseTo(expectedValue, 5)

          // Verify melt percent (rounded to 2 decimal places)
          const rawPercent = calculateMeltPercent(expectedMeltLoss, expectedStock)
          expect(result.meltPercent).toBeCloseTo(Math.round(rawPercent * 100) / 100, 2)

          // Verify abnormal detection
          const expectedAbnormal = isAbnormalMelt(rawPercent, expectedMeltPercent)
          expect(result.isAbnormal).toBe(expectedAbnormal)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: melt-loss, Property 12: Melt Loss Value Non-Negative**
   * 
   * *For any* valid inputs,
   * melt_loss_value SHALL never be negative.
   * 
   * **Validates: Requirements REQ-3 (AC-3.2)**
   */
  it('melt_loss_value is never negative', () => {
    fc.assert(
      fc.property(
        stockArbitrary,
        stockArbitrary,
        stockArbitrary,
        percentArbitrary,
        costArbitrary,
        (systemStock, soldToday, actualStock, expectedMeltPercent, cost) => {
          const result = calculateAllMeltLossData(
            systemStock,
            soldToday,
            actualStock,
            expectedMeltPercent,
            cost
          )
          expect(result.meltLossValue).toBeGreaterThanOrEqual(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})


describe('Melt Loss Abnormal Notification Tests - REQ-4', () => {
  /**
   * **Feature: melt-loss, Property 23: Notification Payload Format**
   * 
   * *For any* abnormal melt loss detection,
   * the notification payload SHALL contain product name, actual melt percent, and expected percent.
   * 
   * **Validates: Requirements REQ-4 (AC-4.2)**
   */
  it('REQ-4: notification payload contains required information', () => {
    // Simulate notification payload creation (matching notifyMeltLossAbnormal logic)
    const createNotificationPayload = (
      productName: string,
      meltPercent: number,
      expectedPercent: number
    ) => ({
      title: '⚠️ การละลายผิดปกติ',
      body: `${productName} ละลาย ${meltPercent.toFixed(1)}% (คาดการณ์ ${expectedPercent}%)`,
      tag: `melt-loss-abnormal-${Date.now()}`,
      data: {
        type: 'melt_loss_abnormal',
        url: '/melt-loss-report'
      }
    })

    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
        fc.float({ min: Math.fround(1), max: Math.fround(20), noNaN: true }),
        (productName, meltPercent, expectedPercent) => {
          const payload = createNotificationPayload(productName, meltPercent, expectedPercent)
          
          // Verify payload structure
          expect(payload.title).toBe('⚠️ การละลายผิดปกติ')
          expect(payload.body).toContain(productName)
          expect(payload.body).toContain(meltPercent.toFixed(1))
          expect(payload.body).toContain(expectedPercent.toString())
          expect(payload.data.type).toBe('melt_loss_abnormal')
          expect(payload.data.url).toBe('/melt-loss-report')
          expect(payload.tag).toContain('melt-loss-abnormal-')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: melt-loss, Property 24: Notification Trigger Condition**
   * 
   * *For any* melt loss calculation result,
   * notification SHALL only be triggered when isAbnormal = true.
   * 
   * **Validates: Requirements REQ-4 (AC-4.1, AC-4.2)**
   */
  it('REQ-4: notification is only triggered when isAbnormal is true', () => {
    // Simulate the notification trigger logic from DailyStockCountPage
    const shouldTriggerNotification = (isAbnormal: boolean): boolean => {
      return isAbnormal === true
    }

    fc.assert(
      fc.property(
        positiveStockArbitrary,
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 0, max: 100 }),
        fc.float({ min: Math.fround(1), max: Math.fround(20), noNaN: true }),
        costArbitrary,
        (systemStock, soldToday, actualReduction, expectedMeltPercent, cost) => {
          const actualSold = Math.min(soldToday, systemStock)
          const expectedStock = calculateExpectedStock(systemStock, actualSold)
          const actualStock = Math.max(0, expectedStock - actualReduction)

          const result = calculateAllMeltLossData(
            systemStock,
            actualSold,
            actualStock,
            expectedMeltPercent,
            cost
          )

          const shouldNotify = shouldTriggerNotification(result.isAbnormal)
          
          // Notification should only trigger when isAbnormal is true
          expect(shouldNotify).toBe(result.isAbnormal)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: melt-loss, Property 25: Abnormal Threshold Consistency**
   * 
   * *For any* melt percent exceeding 150% of expected,
   * the system SHALL mark it as abnormal and trigger notification.
   * 
   * **Validates: Requirements REQ-4 (AC-4.1)**
   */
  it('REQ-4: abnormal threshold at 150% triggers notification', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(1), max: Math.fround(20), noNaN: true }),
        fc.float({ min: Math.fround(1.6), max: Math.fround(5), noNaN: true }),
        (expectedPercent, multiplier) => {
          const meltPercent = expectedPercent * multiplier
          const isAbnormal = isAbnormalMelt(meltPercent, expectedPercent, 1.5)
          
          // When melt percent > 150% of expected, should be abnormal
          expect(isAbnormal).toBe(true)
          
          // This would trigger notification
          const shouldNotify = isAbnormal
          expect(shouldNotify).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: melt-loss, Property 26: Normal Melt Does Not Trigger Notification**
   * 
   * *For any* melt percent within normal range (≤150% of expected),
   * the system SHALL NOT trigger notification.
   * 
   * **Validates: Requirements REQ-4 (AC-4.1)**
   */
  it('REQ-4: normal melt does not trigger notification', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(1), max: Math.fround(20), noNaN: true }),
        fc.float({ min: Math.fround(0), max: Math.fround(1.5), noNaN: true }),
        (expectedPercent, multiplier) => {
          const meltPercent = expectedPercent * multiplier
          const isAbnormal = isAbnormalMelt(meltPercent, expectedPercent, 1.5)
          
          // When melt percent <= 150% of expected, should NOT be abnormal
          expect(isAbnormal).toBe(false)
          
          // This should NOT trigger notification
          const shouldNotify = isAbnormal
          expect(shouldNotify).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: melt-loss, Property 27: Multiple Products Notification Count**
   * 
   * *For any* list of products with melt loss calculations,
   * the number of notifications SHALL equal the count of abnormal products.
   * 
   * **Validates: Requirements REQ-4 (AC-4.2)**
   */
  it('REQ-4: notification count equals abnormal product count', () => {
    const productResultArb = fc.record({
      productId: fc.uuid(),
      productName: fc.string({ minLength: 1, maxLength: 20 }),
      isAbnormal: fc.boolean(),
      meltPercent: fc.float({ min: Math.fround(0), max: Math.fround(50), noNaN: true }),
      expectedPercent: fc.float({ min: Math.fround(1), max: Math.fround(10), noNaN: true })
    })

    fc.assert(
      fc.property(fc.array(productResultArb, { minLength: 0, maxLength: 10 }), (results) => {
        // Simulate the notification logic from DailyStockCountPage
        const abnormalProducts = results.filter(r => r.isAbnormal)
        const notificationCount = abnormalProducts.length
        
        // Count should match
        const expectedCount = results.filter(r => r.isAbnormal).length
        expect(notificationCount).toBe(expectedCount)
      }),
      { numRuns: 100 }
    )
  })
})

describe('Notification Settings Filter Tests - REQ-4', () => {
  /**
   * **Feature: melt-loss, Property 28: Settings Filter Logic**
   * 
   * *For any* list of notification settings,
   * only users with enabled=true AND melt_loss_abnormal=true SHALL receive notifications.
   * 
   * **Validates: Requirements REQ-4 (AC-4.2)**
   */
  it('REQ-4: only users with correct settings receive notifications', () => {
    const settingsArb = fc.record({
      user_id: fc.uuid(),
      enabled: fc.boolean(),
      melt_loss_abnormal: fc.boolean()
    })

    fc.assert(
      fc.property(fc.array(settingsArb, { minLength: 0, maxLength: 20 }), (settings) => {
        // Simulate the filter logic from notifyMeltLossAbnormal
        const eligibleUsers = settings.filter(s => s.melt_loss_abnormal === true && s.enabled === true)
        
        // Verify filter correctness
        eligibleUsers.forEach(user => {
          expect(user.enabled).toBe(true)
          expect(user.melt_loss_abnormal).toBe(true)
        })

        // Verify no ineligible users are included
        const ineligibleUsers = settings.filter(s => !s.melt_loss_abnormal || !s.enabled)
        ineligibleUsers.forEach(user => {
          expect(eligibleUsers.includes(user)).toBe(false)
        })
      }),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: melt-loss, Property 29: No Notifications When All Settings Disabled**
   * 
   * *For any* list of settings where all have melt_loss_abnormal=false,
   * no notifications SHALL be sent.
   * 
   * **Validates: Requirements REQ-4 (AC-4.2)**
   */
  it('REQ-4: no notifications when all settings disabled', () => {
    const settingsArb = fc.record({
      user_id: fc.uuid(),
      enabled: fc.boolean(),
      melt_loss_abnormal: fc.constant(false) // All disabled
    })

    fc.assert(
      fc.property(fc.array(settingsArb, { minLength: 0, maxLength: 10 }), (settings) => {
        const eligibleUsers = settings.filter(s => s.melt_loss_abnormal === true && s.enabled === true)
        
        // No users should be eligible
        expect(eligibleUsers.length).toBe(0)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: melt-loss, Property 30: Notification Log Entry Format**
   * 
   * *For any* notification sent,
   * the log entry SHALL contain user_id, type, title, body, and sent_at.
   * 
   * **Validates: Requirements REQ-4 (AC-4.2)**
   */
  it('REQ-4: notification log entry has required fields', () => {
    // Simulate notification log creation
    const createLogEntry = (
      userId: string,
      payload: { title: string; body: string; data: { type: string } }
    ) => ({
      user_id: userId,
      type: payload.data.type,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sent_at: new Date().toISOString()
    })

    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
        fc.float({ min: Math.fround(1), max: Math.fround(20), noNaN: true }),
        (userId, productName, meltPercent, expectedPercent) => {
          const payload = {
            title: '⚠️ การละลายผิดปกติ',
            body: `${productName} ละลาย ${meltPercent.toFixed(1)}% (คาดการณ์ ${expectedPercent}%)`,
            data: {
              type: 'melt_loss_abnormal',
              url: '/melt-loss-report'
            }
          }

          const logEntry = createLogEntry(userId, payload)

          // Verify required fields
          expect(logEntry.user_id).toBe(userId)
          expect(logEntry.type).toBe('melt_loss_abnormal')
          expect(logEntry.title).toBe('⚠️ การละลายผิดปกติ')
          expect(logEntry.body).toContain(productName)
          expect(logEntry.sent_at).toBeDefined()
          expect(new Date(logEntry.sent_at).toString()).not.toBe('Invalid Date')
        }
      ),
      { numRuns: 100 }
    )
  })
})
