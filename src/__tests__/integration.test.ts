/**
 * Integration Tests for Ice Gas POS System
 * Tests complete user flows and component interactions
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store/useStore'
import { Product, CartItem } from '../types'

// Reset store before each test
beforeEach(() => {
  const store = useStore.getState()
  store.clearCart()
})

describe('Complete Sale Flow Integration Tests', () => {
  const mockProduct: Product = {
    id: 'test-product-1',
    name: 'น้ำแข็งหลอด 5 กก.',
    price: 15,
    category: 'ice',
    unit: 'ถุง',
    stock: 100,
    cost: 10,
    low_stock_threshold: 10,
    barcode: null,
    deposit_amount: 0,
    empty_stock: 0,
  }

  it('should complete a basic sale flow: add to cart -> calculate total -> complete sale', () => {
    const store = useStore.getState()

    // Step 1: Add product to cart
    store.addToCart(mockProduct)
    expect(store.cart.length).toBe(1)
    expect(store.cart[0].quantity).toBe(1)

    // Step 2: Add same product again (should increment quantity)
    store.addToCart(mockProduct)
    expect(store.cart.length).toBe(1)
    expect(store.cart[0].quantity).toBe(2)

    // Step 3: Calculate total
    const total = store.getTotal()
    expect(total).toBe(30) // 15 * 2

    // Step 4: Clear cart (simulating sale completion)
    store.clearCart()
    expect(store.cart.length).toBe(0)
    expect(store.getTotal()).toBe(0)
  })

  it('should handle multiple products in cart correctly', () => {
    const store = useStore.getState()

    const product2: Product = {
      ...mockProduct,
      id: 'test-product-2',
      name: 'แก๊ส 15 กก.',
      price: 650,
      category: 'gas',
    }

    // Add different products
    store.addToCart(mockProduct)
    store.addToCart(mockProduct)
    store.addToCart(product2)

    expect(store.cart.length).toBe(2)
    expect(store.getTotal()).toBe(30 + 650) // 15*2 + 650
  })

  it('should update quantity correctly', () => {
    const store = useStore.getState()

    store.addToCart(mockProduct)
    store.updateQuantity(mockProduct.id, 5)

    expect(store.cart[0].quantity).toBe(5)
    expect(store.getTotal()).toBe(75) // 15 * 5
  })

  it('should remove item when quantity set to 0', () => {
    const store = useStore.getState()

    store.addToCart(mockProduct)
    store.updateQuantity(mockProduct.id, 0)

    expect(store.cart.length).toBe(0)
  })

  it('should remove specific item from cart', () => {
    const store = useStore.getState()

    const product2: Product = {
      ...mockProduct,
      id: 'test-product-2',
      name: 'น้ำดื่ม',
      price: 7,
    }

    store.addToCart(mockProduct)
    store.addToCart(product2)
    expect(store.cart.length).toBe(2)

    store.removeFromCart(mockProduct.id)
    expect(store.cart.length).toBe(1)
    expect(store.cart[0].product.id).toBe('test-product-2')
  })
})

describe('Gas Cylinder Sale Integration Tests', () => {
  const gasProduct: Product = {
    id: 'gas-1',
    name: 'แก๊ส 15 กก.',
    price: 650,
    category: 'gas',
    unit: 'ถัง',
    stock: 50,
    cost: 500,
    low_stock_threshold: 5,
    barcode: null,
    deposit_amount: 800,
    empty_stock: 10,
  }

  it('should add gas product with exchange type', () => {
    const store = useStore.getState()

    store.addToCart(gasProduct, 'exchange')

    expect(store.cart.length).toBe(1)
    expect(store.cart[0].gasSaleType).toBe('exchange')
    expect(store.getTotal()).toBe(650) // No deposit for exchange
  })

  it('should add gas product with deposit type', () => {
    const store = useStore.getState()

    store.addToCart(gasProduct, 'deposit')

    expect(store.cart.length).toBe(1)
    expect(store.cart[0].gasSaleType).toBe('deposit')
    // Total should include deposit
    const item = store.cart[0]
    const expectedTotal = gasProduct.price + (item.depositAmount || 0)
    expect(store.getTotal()).toBe(expectedTotal)
  })
})

describe('Offline Queue Integration Tests', () => {
  it('should queue operations when offline', () => {
    const store = useStore.getState()

    // Simulate offline
    store.setOnline(false)
    expect(store.isOnline).toBe(false)

    // Queue a sale operation
    store.addToOfflineQueue({
      type: 'sale',
      payload: { total: 100, items: [] },
    })

    expect(store.offlineQueue.length).toBe(1)
    expect(store.offlineQueue[0].type).toBe('sale')
  })

  it('should preserve queue order', () => {
    const store = useStore.getState()

    store.setOnline(false)

    store.addToOfflineQueue({ type: 'sale', payload: { id: 1 } })
    store.addToOfflineQueue({ type: 'product_create', payload: { id: 2 } })
    store.addToOfflineQueue({ type: 'product_update', payload: { id: 3 } })

    expect(store.offlineQueue.length).toBe(3)
    expect(store.offlineQueue[0].payload).toEqual({ id: 1 })
    expect(store.offlineQueue[1].payload).toEqual({ id: 2 })
    expect(store.offlineQueue[2].payload).toEqual({ id: 3 })
  })
})

describe('Category Filter Integration Tests', () => {
  const products: Product[] = [
    { id: '1', name: 'น้ำแข็ง', price: 15, category: 'ice', unit: 'ถุง', stock: 100, cost: 10, low_stock_threshold: 10, barcode: null, deposit_amount: 0, empty_stock: 0 },
    { id: '2', name: 'แก๊ส', price: 650, category: 'gas', unit: 'ถัง', stock: 50, cost: 500, low_stock_threshold: 5, barcode: null, deposit_amount: 800, empty_stock: 10 },
    { id: '3', name: 'น้ำดื่ม', price: 7, category: 'water', unit: 'ขวด', stock: 200, cost: 4, low_stock_threshold: 20, barcode: null, deposit_amount: 0, empty_stock: 0 },
  ]

  it('should filter products by category', () => {
    const iceProducts = products.filter(p => p.category === 'ice')
    const gasProducts = products.filter(p => p.category === 'gas')
    const waterProducts = products.filter(p => p.category === 'water')

    expect(iceProducts.length).toBe(1)
    expect(gasProducts.length).toBe(1)
    expect(waterProducts.length).toBe(1)
  })

  it('should return all products when no filter', () => {
    const allProducts = products.filter(() => true)
    expect(allProducts.length).toBe(3)
  })

  it('should not affect cart when filtering', () => {
    const store = useStore.getState()

    // Add product to cart
    store.addToCart(products[0])
    const cartBefore = [...store.cart]

    // Filter products (simulated - doesn't affect store)
    const filtered = products.filter(p => p.category === 'gas')

    // Cart should remain unchanged
    expect(store.cart).toEqual(cartBefore)
    expect(filtered.length).toBe(1)
  })
})
