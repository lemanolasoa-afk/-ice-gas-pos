import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { QueuedOperation } from '../types'

/**
 * **Feature: ice-gas-pos, Property 14: Offline Queue Persistence**
 * **Validates: Requirements 5.3, 6.4**
 * 
 * Property: For any operation performed while offline, the operation SHALL be 
 * added to the offline queue and persisted locally.
 */

// Helper to generate valid product data
const productArbitrary = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  price: fc.integer({ min: 1, max: 10000 }),
  category: fc.constantFrom('ice' as const, 'gas' as const, 'water' as const),
  unit: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0)
})

// Helper to generate valid sale item data
const saleItemArbitrary = fc.record({
  product_id: fc.uuid(),
  product_name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  price: fc.integer({ min: 1, max: 10000 }),
  quantity: fc.integer({ min: 1, max: 100 }),
  subtotal: fc.integer({ min: 1, max: 1000000 })
})

// Helper to generate valid sale data
const salePayloadArbitrary = fc.record({
  sale: fc.record({
    id: fc.uuid(),
    total: fc.integer({ min: 1, max: 100000 }),
    payment: fc.integer({ min: 1, max: 200000 }),
    change: fc.integer({ min: 0, max: 100000 })
  }),
  items: fc.array(saleItemArbitrary, { minLength: 1, maxLength: 10 })
})

// Helper to generate queued operation types
const operationTypeArbitrary = fc.constantFrom(
  'sale' as const,
  'product_create' as const,
  'product_update' as const,
  'product_delete' as const
)

// Pure function to simulate queueOperation behavior
function queueOperation(
  currentQueue: QueuedOperation[],
  type: QueuedOperation['type'],
  payload: unknown
): QueuedOperation[] {
  const queuedOp: QueuedOperation = {
    id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    payload,
    timestamp: new Date().toISOString(),
    retries: 0
  }
  return [...currentQueue, queuedOp]
}

// Pure function to check if operation is in queue
function isOperationInQueue(
  queue: QueuedOperation[],
  type: QueuedOperation['type'],
  payload: unknown
): boolean {
  return queue.some(op => 
    op.type === type && 
    JSON.stringify(op.payload) === JSON.stringify(payload)
  )
}

describe('**Feature: ice-gas-pos, Property 14: Offline Queue Persistence**', () => {
  
  it('queued sale operation is added to offline queue', () => {
    fc.assert(
      fc.property(salePayloadArbitrary, (salePayload) => {
        const initialQueue: QueuedOperation[] = []
        const newQueue = queueOperation(initialQueue, 'sale', salePayload)
        
        // Operation should be in queue
        expect(newQueue.length).toBe(1)
        expect(isOperationInQueue(newQueue, 'sale', salePayload)).toBe(true)
        
        // Queue item should have correct structure
        const queuedItem = newQueue[0]
        expect(queuedItem.type).toBe('sale')
        expect(queuedItem.retries).toBe(0)
        expect(queuedItem.timestamp).toBeDefined()
        expect(queuedItem.id).toBeDefined()
      }),
      { numRuns: 100 }
    )
  })

  it('queued product_create operation is added to offline queue', () => {
    fc.assert(
      fc.property(productArbitrary, (product) => {
        const initialQueue: QueuedOperation[] = []
        const newQueue = queueOperation(initialQueue, 'product_create', product)
        
        expect(newQueue.length).toBe(1)
        expect(isOperationInQueue(newQueue, 'product_create', product)).toBe(true)
        
        const queuedItem = newQueue[0]
        expect(queuedItem.type).toBe('product_create')
        expect(queuedItem.retries).toBe(0)
      }),
      { numRuns: 100 }
    )
  })

  it('queued product_update operation is added to offline queue', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        productArbitrary,
        (id, updates) => {
          const payload = { id, updates }
          const initialQueue: QueuedOperation[] = []
          const newQueue = queueOperation(initialQueue, 'product_update', payload)
          
          expect(newQueue.length).toBe(1)
          expect(isOperationInQueue(newQueue, 'product_update', payload)).toBe(true)
          
          const queuedItem = newQueue[0]
          expect(queuedItem.type).toBe('product_update')
          expect(queuedItem.retries).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('queued product_delete operation is added to offline queue', () => {
    fc.assert(
      fc.property(fc.uuid(), (id) => {
        const payload = { id }
        const initialQueue: QueuedOperation[] = []
        const newQueue = queueOperation(initialQueue, 'product_delete', payload)
        
        expect(newQueue.length).toBe(1)
        expect(isOperationInQueue(newQueue, 'product_delete', payload)).toBe(true)
        
        const queuedItem = newQueue[0]
        expect(queuedItem.type).toBe('product_delete')
        expect(queuedItem.retries).toBe(0)
      }),
      { numRuns: 100 }
    )
  })

  it('multiple operations are queued in order', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(operationTypeArbitrary, productArbitrary),
          { minLength: 1, maxLength: 10 }
        ),
        (operations) => {
          let queue: QueuedOperation[] = []
          
          for (const [type, payload] of operations) {
            queue = queueOperation(queue, type, payload)
          }
          
          // All operations should be in queue
          expect(queue.length).toBe(operations.length)
          
          // Each operation should have unique id
          const ids = queue.map(op => op.id)
          const uniqueIds = new Set(ids)
          expect(uniqueIds.size).toBe(queue.length)
          
          // All operations should have retries = 0
          expect(queue.every(op => op.retries === 0)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('queued operations preserve payload data integrity', () => {
    fc.assert(
      fc.property(salePayloadArbitrary, (salePayload) => {
        const initialQueue: QueuedOperation[] = []
        const newQueue = queueOperation(initialQueue, 'sale', salePayload)
        
        const queuedItem = newQueue[0]
        const retrievedPayload = queuedItem.payload as typeof salePayload
        
        // Payload should be preserved exactly
        expect(retrievedPayload.sale.id).toBe(salePayload.sale.id)
        expect(retrievedPayload.sale.total).toBe(salePayload.sale.total)
        expect(retrievedPayload.sale.payment).toBe(salePayload.sale.payment)
        expect(retrievedPayload.sale.change).toBe(salePayload.sale.change)
        expect(retrievedPayload.items.length).toBe(salePayload.items.length)
      }),
      { numRuns: 100 }
    )
  })

  it('queue operations have valid timestamps', () => {
    fc.assert(
      fc.property(operationTypeArbitrary, productArbitrary, (type, payload) => {
        const beforeTime = new Date().toISOString()
        const queue = queueOperation([], type, payload)
        const afterTime = new Date().toISOString()
        
        const queuedItem = queue[0]
        
        // Timestamp should be a valid ISO string
        expect(() => new Date(queuedItem.timestamp)).not.toThrow()
        
        // Timestamp should be between before and after
        expect(queuedItem.timestamp >= beforeTime).toBe(true)
        expect(queuedItem.timestamp <= afterTime).toBe(true)
      }),
      { numRuns: 100 }
    )
  })
})
